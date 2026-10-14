<?php

namespace Tests\Feature\Tasks;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $admin;
    protected Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        [$this->org, $this->admin] = $this->createOrganizationWithOwner();
        app(TenantManager::class)->setTenant($this->org);

        $this->project = Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Solar EPC Project',
            'code' => 'SEP-01',
            'project_manager_id' => $this->admin->id,
        ]);
    }

    public function test_can_list_project_tasks(): void
    {
        Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Site Survey',
            'category' => 'Engineering',
            'start_date' => '2026-10-15',
            'end_date' => '2026-10-20',
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->getJson("/api/v1/projects/{$this->project->id}/tasks");

        $res->assertStatus(200)
            ->assertJsonStructure(['data', 'treeVersion']);
        $this->assertCount(1, $res->json('data'));
    }

    public function test_can_create_task_under_project(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->postJson("/api/v1/projects/{$this->project->id}/tasks", [
                'name' => 'Foundation Excavation',
                'category' => 'Civil',
                'priority' => 'High',
                'start_date' => '2026-10-21',
                'end_date' => '2026-10-31',
                'pct' => 0,
                'estimated_hours' => 80.0,
                'primary_owner_id' => $this->admin->id,
            ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.name', 'Foundation Excavation')
            ->assertJsonPath('data.category', 'Civil');

        $this->assertDatabaseHas('tasks', [
            'name' => 'Foundation Excavation',
            'project_id' => $this->project->id,
        ]);
    }

    public function test_create_task_validates_dates(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->postJson("/api/v1/projects/{$this->project->id}/tasks", [
                'name' => 'Invalid Task Dates',
                'category' => 'Civil',
                'start_date' => '2026-10-25',
                'end_date' => '2026-10-20', // end before start
            ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);
    }

    public function test_can_show_task_details(): void
    {
        $task = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'HVAC Testing',
            'category' => 'Mechanical',
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-05',
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->getJson("/api/v1/projects/{$this->project->id}/tasks/{$task->id}");

        $res->assertStatus(200)
            ->assertJsonPath('data.id', $task->id)
            ->assertJsonPath('data.name', 'HVAC Testing');
    }

    public function test_can_update_task(): void
    {
        $task = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Turbine Balancing',
            'category' => 'Mechanical',
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-05',
            'pct' => 10,
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->putJson("/api/v1/projects/{$this->project->id}/tasks/{$task->id}", [
                'name' => 'Turbine Precision Balancing',
                'pct' => 50,
                'status' => 'In Progress',
            ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.name', 'Turbine Precision Balancing')
            ->assertJsonPath('data.pct', 50);

        $this->assertEquals(50, $task->fresh()->pct);
    }

    public function test_can_delete_task(): void
    {
        $task = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Temporary Task',
            'category' => 'General',
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-05',
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->deleteJson("/api/v1/projects/{$this->project->id}/tasks/{$task->id}");

        $res->assertStatus(200);
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_can_reorder_tasks(): void
    {
        $t1 = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Task A',
            'category' => 'General',
            'order_index' => 0,
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-05',
        ]);

        $t2 = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Task B',
            'category' => 'General',
            'order_index' => 1,
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-05',
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->postJson("/api/v1/projects/{$this->project->id}/tasks/reorder", [
                'ordered_task_ids' => [$t2->id, $t1->id],
            ]);

        $res->assertStatus(200);
        $this->assertEquals(0, $t2->fresh()->order_index);
        $this->assertEquals(1, $t1->fresh()->order_index);
    }

    public function test_can_retrieve_critical_path(): void
    {
        $t1 = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Task 1',
            'category' => 'General',
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-05',
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->getJson("/api/v1/projects/{$this->project->id}/critical-path");

        $res->assertStatus(200)
            ->assertJsonStructure(['data', 'treeVersion']);
    }
}

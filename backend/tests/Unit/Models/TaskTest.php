<?php

namespace Tests\Unit\Models;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $owner;
    protected Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        [$this->org, $this->owner] = $this->createOrganizationWithOwner();
        app(TenantManager::class)->setTenant($this->org);

        $this->project = Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Task Test Project',
            'code' => 'TTP-01',
        ]);
    }

    public function test_task_can_be_created_with_factory(): void
    {
        $task = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Implement API Gateway',
            'category' => 'Backend',
            'priority' => 'High',
            'status' => 'In Progress',
            'start_date' => '2026-10-15',
            'end_date' => '2026-10-25',
            'pct' => 25,
            'estimated_hours' => 40.0,
        ]);

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'name' => 'Implement API Gateway',
            'project_id' => $this->project->id,
        ]);
        $this->assertEquals(25, $task->pct);
        $this->assertEquals(40.0, $task->estimated_hours);
    }

    public function test_task_accessor_aliases_work_correctly(): void
    {
        $task = new Task();
        $task->title = 'Alias Test Task';
        $task->dueDate = '2026-11-01';
        $task->progressPct = 60;
        $task->assignedTo = $this->owner->id;

        $this->assertEquals('Alias Test Task', $task->name);
        $this->assertEquals('Alias Test Task', $task->title);
        $this->assertEquals('2026-11-01', $task->end_date);
        $this->assertEquals('2026-11-01', $task->dueDate);
        $this->assertEquals(60, $task->pct);
        $this->assertEquals(60, $task->progressPct);
        $this->assertEquals($this->owner->id, $task->primary_owner_id);
    }

    public function test_task_parent_child_hierarchy(): void
    {
        $parent = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Parent Phase 1',
            'start_date' => '2026-10-15',
            'end_date' => '2026-10-30',
        ]);

        $child1 = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'parent_id' => $parent->id,
            'name' => 'Subtask 1.1',
            'order_index' => 1,
            'start_date' => '2026-10-15',
            'end_date' => '2026-10-20',
        ]);

        $child2 = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'parent_id' => $parent->id,
            'name' => 'Subtask 1.2',
            'order_index' => 2,
            'start_date' => '2026-10-21',
            'end_date' => '2026-10-25',
        ]);

        $this->assertEquals($parent->id, $child1->parent->id);
        $this->assertCount(2, $parent->children);
        $this->assertEquals('Subtask 1.1', $parent->children->first()->name);
    }

    public function test_task_duration_days_calculation(): void
    {
        $task = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Duration Task',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-10',
        ]);

        // 10 days inclusive (Oct 1 to Oct 10)
        $this->assertEquals(10, $task->duration_days);
    }

    public function test_task_total_planned_hours_from_estimate_or_allocations(): void
    {
        $taskWithEstimate = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Estimate Task',
            'estimated_hours' => 35.0,
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-05',
        ]);

        $this->assertEquals(35.0, $taskWithEstimate->total_planned_hours);
    }
}

<?php

namespace Tests\Feature\Rbac;

use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TasksOnlyRoleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        (new \App\Modules\System\Services\InstallationOrchestrator())->install([]);
        setPermissionsTeamId('01HZX000000000000000000000');
        $org = Organization::where('id', '01HZX000000000000000000000')->first();
        if ($org) {
            app(TenantManager::class)->setTenant($org);
        }

        // Run seeders for field_engineer permissions & role
        (new \Database\Seeders\PermissionSeeder())->run();
        (new \Database\Seeders\RolePermissionSeeder())->run();
    }

    public function test_field_engineer_only_sees_assigned_tasks(): void
    {
        $orgId = '01HZX000000000000000000000';
        $admin = User::where('email', 'admin@deliverops.com')->first();

        $engineer = User::factory()->create([
            'name' => 'Tariq Mansoor',
            'email' => 'tariq.field@example.com',
        ]);
        $engineer->assignRole('field_engineer');

        $otherUser = User::factory()->create([
            'name' => 'Other Dev',
            'email' => 'other@example.com',
        ]);

        $project = Project::factory()->create(['organization_id' => $orgId]);

        $myTask = Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'Assigned to Tariq',
            'assigned_to' => $engineer->id,
            'status' => 'In Progress',
        ]);

        $otherTask = Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'Assigned to Other',
            'assigned_to' => $otherUser->id,
            'status' => 'In Progress',
        ]);

        // Engineer lists tasks
        $response = $this->actingAs($engineer, 'sanctum')
            ->getJson('/api/tasks');

        $response->assertOk();
        $taskIds = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($myTask->id, $taskIds);
        $this->assertNotContains($otherTask->id, $taskIds);

        // Engineer can view own task
        $showOwn = $this->actingAs($engineer, 'sanctum')
            ->getJson("/api/tasks/{$myTask->id}");
        $showOwn->assertOk();

        // Engineer cannot view other's task
        $showOther = $this->actingAs($engineer, 'sanctum')
            ->getJson("/api/tasks/{$otherTask->id}");
        $showOther->assertForbidden();

        // Admin sees all tasks
        $adminResp = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/tasks');
        $adminResp->assertOk();
        $adminTaskIds = collect($adminResp->json('data'))->pluck('id')->all();
        $this->assertContains($myTask->id, $adminTaskIds);
        $this->assertContains($otherTask->id, $adminTaskIds);
    }

    public function test_field_engineer_can_update_own_task_progress(): void
    {
        $orgId = '01HZX000000000000000000000';

        $engineer = User::factory()->create([
            'name' => 'Nouran Adel',
            'email' => 'nouran.field@example.com',
        ]);
        $engineer->assignRole('field_engineer');

        $project = Project::factory()->create(['organization_id' => $orgId]);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'name' => 'Installation Task',
            'assigned_to' => $engineer->id,
            'pct' => 10,
            'status' => 'In Progress',
        ]);

        $response = $this->actingAs($engineer, 'sanctum')
            ->putJson("/api/tasks/{$task->id}", [
                'pct' => 60,
                'status' => 'In Progress',
            ]);

        $response->assertOk();
        $this->assertEquals(60, $task->fresh()->pct);
    }

    public function test_field_engineer_is_forbidden_from_viewing_projects(): void
    {
        $orgId = '01HZX000000000000000000000';
        $engineer = User::factory()->create([
            'name' => 'Ahmed Field',
            'email' => 'ahmed.field@example.com',
            'email_verified_at' => now(),
        ]);
        $engineer->assignRole('field_engineer');
        $org = Organization::where('id', $orgId)->first();
        $engineer->organizations()->attach($org->id, ['id' => (string) \Illuminate\Support\Str::ulid()]);

        $response = $this->actingAs($engineer, 'sanctum')
            ->withHeader('X-Organization-Id', $orgId)
            ->getJson('/api/v1/projects');

        $response->assertForbidden();
    }
}

<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModularMonolithPlatformTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $pm;
    protected User $engineer;

    protected function setUp(): void
    {
        parent::setUp();
        (new \App\Modules\System\Services\InstallationOrchestrator())->install([]);

        $org = \App\Modules\Tenancy\Models\Organization::find('01HZX000000000000000000000');
        app(\App\Modules\Tenancy\Services\TenantManager::class)->setTenant($org);
        setPermissionsTeamId('01HZX000000000000000000000');

        $this->admin = User::where('email', 'admin@deliverops.com')->first();

        // Create explicit test fixtures rather than relying on seeded demo data
        $this->pm = User::firstOrCreate(
            ['email' => 'test.pm@deliverops.local'],
            [
                'name' => 'Test Project Manager',
                'password' => bcrypt('Password123!'),
                'job_title' => 'Project Manager',
                'department' => 'Engineering',
                'weekly_capacity_hours' => 40,
                'status' => 'active',
                'color' => '#1f8a70',
                'default_organization_id' => '01HZX000000000000000000000',
                'email_verified_at' => now(),
            ]
        );
        \App\Modules\Tenancy\Models\OrganizationUser::firstOrCreate(
            ['organization_id' => '01HZX000000000000000000000', 'user_id' => $this->pm->id],
            ['is_owner' => false, 'joined_at' => now()]
        );
        setPermissionsTeamId('01HZX000000000000000000000');
        $this->pm->syncRoles(['project_manager']);

        $this->engineer = User::firstOrCreate(
            ['email' => 'test.engineer@deliverops.local'],
            [
                'name' => 'Test Contributor',
                'password' => bcrypt('Password123!'),
                'job_title' => 'Systems Engineer',
                'department' => 'Engineering',
                'weekly_capacity_hours' => 40,
                'status' => 'active',
                'color' => '#3b82f6',
                'default_organization_id' => '01HZX000000000000000000000',
                'email_verified_at' => now(),
            ]
        );
        \App\Modules\Tenancy\Models\OrganizationUser::firstOrCreate(
            ['organization_id' => '01HZX000000000000000000000', 'user_id' => $this->engineer->id],
            ['is_owner' => false, 'joined_at' => now()]
        );
        setPermissionsTeamId('01HZX000000000000000000000');
        $this->engineer->syncRoles(['contributor']);
    }

    public function test_projects_crud_and_membership(): void
    {
        // 1. Create Project
        $response = $this->actingAs($this->pm, 'sanctum')->postJson('/api/v1/projects', [
            'name' => 'NextGen Cloud Migration',
            'code' => 'NCM-2026',
            'description' => 'Enterprise cloud modernization',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'NextGen Cloud Migration')
            ->assertJsonPath('data.code', 'NCM-2026');

        $projectId = $response->json('data.id');

        // 2. Add member to project
        $memberResponse = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$projectId}/members", [
            'user_id' => $this->engineer->id,
            'project_role' => 'lead',
        ]);
        $memberResponse->assertStatus(200);

        // 3. Remove member
        $removeResponse = $this->actingAs($this->pm, 'sanctum')->deleteJson("/api/v1/projects/{$projectId}/members/{$this->engineer->id}");
        $removeResponse->assertStatus(200);

        // 4. Archive & Restore Project
        $archiveResponse = $this->actingAs($this->pm, 'sanctum')->deleteJson("/api/v1/projects/{$projectId}");
        $archiveResponse->assertStatus(200);

        $restoreResponse = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$projectId}/restore");
        $restoreResponse->assertStatus(200);
    }

    public function test_wbs_hierarchy_rollup_and_reorder(): void
    {
        $project = Project::create([
            'name' => 'WBS Test Project',
            'code' => 'WBS-01',
            'project_manager_id' => $this->pm->id,
            'config' => ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        // 1. Create parent summary task
        $parentRes = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$project->id}/tasks", [
            'name' => 'Phase 1: Architecture',
            'category' => 'Engineering',
            'start_date' => '2026-03-01',
            'end_date' => '2026-03-12',
            'status' => 'In Progress',
        ]);
        $parentRes->assertStatus(201);
        $parentId = $parentRes->json('data.id');

        // 2. Create child task 1 (5 days, 50% complete)
        $child1Res = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$project->id}/tasks", [
            'name' => 'High Level Design',
            'category' => 'Engineering',
            'parent_id' => $parentId,
            'start_date' => '2026-03-01',
            'end_date' => '2026-03-05',
            'estimated_hours' => 40,
            'pct' => 50,
        ]);
        $child1Res->assertStatus(201);
        $child1Id = $child1Res->json('data.id');

        // 3. Create child task 2 (5 days, 100% complete)
        $child2Res = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$project->id}/tasks", [
            'name' => 'Security Threat Model',
            'category' => 'Engineering',
            'parent_id' => $parentId,
            'start_date' => '2026-03-06',
            'end_date' => '2026-03-12',
            'estimated_hours' => 40,
            'pct' => 100,
        ]);
        $child2Res->assertStatus(201);
        $child2Id = $child2Res->json('data.id');

        // Verify summary task progress rollup: (40 * 0.5 + 40 * 1.0) / 80 = 75%
        $parentTask = Task::find($parentId);
        $this->assertEquals(75, (int) round($parentTask->pct));

        // 4. Test reorder tasks
        $reorderRes = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$project->id}/tasks/reorder", [
            'ordered_task_ids' => [$parentId, $child2Id, $child1Id],
        ]);
        $reorderRes->assertStatus(200);
    }

    public function test_cpm_scheduling_engine_critical_path(): void
    {
        $project = Project::create([
            'name' => 'CPM Test Project',
            'code' => 'CPM-01',
            'project_manager_id' => $this->pm->id,
            'config' => ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        // Task A (10 days) -> Task B (5 days)
        $taskA = Task::create([
            'project_id' => $project->id,
            'name' => 'Design API',
            'category' => 'Architecture',
            'start_date' => '2026-04-01',
            'end_date' => '2026-04-14',
            'status' => 'Not Started',
        ]);

        $taskB = Task::create([
            'project_id' => $project->id,
            'name' => 'Build API Client',
            'category' => 'Development',
            'start_date' => '2026-04-15',
            'end_date' => '2026-04-21',
            'status' => 'Not Started',
        ]);

        // Dependency: Task B depends on Task A
        $taskB->predecessors()->attach($taskA->id, [
            'dependency_type' => 'FS',
        ]);

        $response = $this->actingAs($this->pm, 'sanctum')->getJson("/api/v1/projects/{$project->id}/critical-path");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'critical_tasks',
                    'sorted_order',
                    'schedule',
                ],
            ]);

        $this->assertContains($taskA->id, $response->json('data.critical_tasks'));
        $this->assertContains($taskB->id, $response->json('data.critical_tasks'));
    }

    public function test_self_dependency_is_strictly_prohibited(): void
    {
        $project = Project::create([
            'name' => 'Self Dependency Test',
            'code' => 'SELF-01',
            'project_manager_id' => $this->pm->id,
            'config' => ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'name' => 'Self Dependent Task',
            'category' => 'Engineering',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-05',
            'status' => 'Not Started',
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Self-dependency invariant violation: A task cannot depend on itself.');

        $task->predecessors()->attach($task->id, [
            'dependency_type' => 'FS',
        ]);
    }

    public function test_risk_blocking_and_resolution(): void
    {
        $project = Project::create([
            'name' => 'Risk Test Project',
            'code' => 'RSK-01',
            'project_manager_id' => $this->pm->id,
            'config' => ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'name' => 'Deploy to Kubernetes',
            'category' => 'DevOps',
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-07',
            'status' => 'In Progress',
        ]);

        // 1. Create open blocker risk linked to task -> blocks task
        $riskRes = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$project->id}/risks", [
            'title' => 'Cluster Ingress Outage',
            'type' => 'blocker',
            'severity' => 'critical',
            'status' => 'open',
            'task_id' => $task->id,
            'mitigation_plan' => 'Failover to secondary cluster',
        ]);
        $riskRes->assertStatus(201);
        $riskId = $riskRes->json('data.id');

        // Task should now be blocked
        $this->assertEquals('Blocked', $task->fresh()->status);
        $this->assertEquals($riskId, $task->fresh()->blocking_risk_id);

        // 2. Resolve risk -> task should unblock
        $updateRiskRes = $this->actingAs($this->pm, 'sanctum')->putJson("/api/v1/projects/{$project->id}/risks/{$riskId}", [
            'status' => 'resolved',
        ]);
        $updateRiskRes->assertStatus(200);

        // Task should now be unblocked back to In Progress
        $this->assertEquals('In Progress', $task->fresh()->status);
        $this->assertNull($task->fresh()->blocking_risk_id);
    }

    public function test_baseline_lock_variance_and_clear(): void
    {
        $project = Project::create([
            'name' => 'Baseline Test Project',
            'code' => 'BSL-01',
            'project_manager_id' => $this->pm->id,
            'config' => ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'name' => 'Core Database Schema',
            'category' => 'Database',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-05',
            'status' => 'Not Started',
        ]);

        // 1. Lock baseline
        $lockRes = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$project->id}/baselines/lock");
        $lockRes->assertStatus(200);

        $this->assertTrue($project->fresh()->has_locked_baseline);
        $this->assertEquals('2026-06-01', $task->fresh()->baseline_start);

        // 2. Change task duration (slippage)
        $task->update([
            'end_date' => '2026-06-10',
        ]);

        // 3. Inspect variance
        $varianceRes = $this->actingAs($this->pm, 'sanctum')->getJson("/api/v1/projects/{$project->id}/baselines/variance");
        $varianceRes->assertStatus(200)
            ->assertJsonPath('data.has_baseline', true)
            ->assertJsonPath('data.delayed_tasks_count', 1)
            ->assertJsonPath('data.net_schedule_slippage_days', 5);

        // 4. Clear baseline
        $clearRes = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$project->id}/baselines/clear");
        $clearRes->assertStatus(200);
        $this->assertFalse($project->fresh()->has_locked_baseline);
    }

    public function test_anti_self_approval_review_workflow(): void
    {
        $project = Project::create([
            'name' => 'Review Test Project',
            'code' => 'REV-01',
            'project_manager_id' => $this->pm->id,
            'config' => ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'name' => 'Authentication Service',
            'category' => 'Backend',
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-07',
            'status' => 'In Progress',
            'primary_owner_id' => $this->engineer->id,
            'reviewer_id' => $this->pm->id,
        ]);

        // 1. Engineer requests review
        $reqRes = $this->actingAs($this->engineer, 'sanctum')
            ->postJson("/api/v1/projects/{$project->id}/tasks/{$task->id}/review/request", [
                'note' => 'Auth service implemented with Sanctum tokens.',
            ]);
        $reqRes->assertStatus(200);
        $this->assertEquals('In Review', $task->fresh()->status);

        // 2. Engineer tries to approve their own review -> Rejected by anti-self-approval rule!
        $selfApproveRes = $this->actingAs($this->engineer, 'sanctum')
            ->postJson("/api/v1/projects/{$project->id}/tasks/{$task->id}/review/approve", [
                'note' => 'I approve my own code!',
            ]);
        $this->assertTrue(in_array($selfApproveRes->status(), [403, 422]));

        // 3. PM (reviewer) approves review -> Status becomes Completed with 100%
        $pmApproveRes = $this->actingAs($this->pm, 'sanctum')
            ->postJson("/api/v1/projects/{$project->id}/tasks/{$task->id}/review/approve", [
                'note' => 'Code looks solid and all tests pass.',
            ]);
        $pmApproveRes->assertStatus(200);
        $this->assertEquals('Completed', $task->fresh()->status);
        $this->assertEquals(100, $task->fresh()->pct);
    }

    public function test_task_comments_and_audit_logging(): void
    {
        $project = Project::create([
            'name' => 'Audit Project',
            'code' => 'AUD-01',
            'project_manager_id' => $this->pm->id,
            'config' => ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        \Illuminate\Support\Facades\DB::table('project_users')->insert([
            'id' => (string) \Illuminate\Support\Str::ulid(),
            'organization_id' => $project->organization_id,
            'project_id' => $project->id,
            'user_id' => $this->engineer->id,
            'project_role' => 'contributor',
            'created_at' => now(),
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'name' => 'Audit Target Task',
            'category' => 'Audit',
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-04',
            'status' => 'In Progress',
        ]);

        // Post a comment
        $commentRes = $this->actingAs($this->engineer, 'sanctum')
            ->postJson("/api/v1/projects/{$project->id}/tasks/{$task->id}/comments", [
                'content' => 'Starting implementation of task now.',
            ]);
        $commentRes->assertStatus(201);

        // Check project audit trail
        $auditRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/projects/{$project->id}/audit");
        $auditRes->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'action', 'actorName', 'createdAt']]]);
    }

    public function test_legacy_json_import_with_idempotency(): void
    {
        $importPayload = [
            'name' => 'Imported Migration Project',
            'code' => 'IMP-2026',
            'description' => 'Migrated from legacy system',
            'tasks' => [
                [
                    'id' => 'legacy-task-1',
                    'name' => 'Setup Infrastructure',
                    'category' => 'DevOps',
                    'start' => '2026-09-01',
                    'end' => '2026-09-05',
                    'status' => 'In Progress',
                    'pct' => 40,
                ],
                [
                    'id' => 'legacy-task-2',
                    'name' => 'Deploy Application',
                    'category' => 'DevOps',
                    'start' => '2026-09-06',
                    'end' => '2026-09-10',
                    'dependsOn' => ['legacy-task-1'],
                ],
            ],
            'risks' => [
                [
                    'title' => 'Server Out of Memory',
                    'type' => 'risk',
                    'severity' => 'medium',
                    'status' => 'open',
                ],
            ],
        ];

        $idempotencyKey = 'import-key-' . uniqid();

        // Pass 1: Import project
        $res1 = $this->actingAs($this->admin, 'sanctum')
            ->withHeaders(['X-Idempotency-Key' => $idempotencyKey])
            ->postJson('/api/v1/projects/import', $importPayload);
        $res1->assertStatus(201);
        $projectId = $res1->json('data.id');

        // Pass 2: Repeat with same idempotency key -> Returns same project without duplicating
        $res2 = $this->actingAs($this->admin, 'sanctum')
            ->withHeaders(['X-Idempotency-Key' => $idempotencyKey])
            ->postJson('/api/v1/projects/import', $importPayload);
        $res2->assertStatus(200);
        $this->assertEquals($projectId, $res2->json('data.id'));

        // Verify tasks and risks imported
        $project = Project::find($projectId);
        $this->assertCount(2, $project->tasks);
        $this->assertCount(1, $project->risks);
    }
}

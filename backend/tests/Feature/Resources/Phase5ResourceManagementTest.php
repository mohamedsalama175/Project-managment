<?php

namespace Tests\Feature\Resources;

use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\Task;
use App\Models\User;
use App\Modules\Resources\Models\Skill;
use App\Modules\Resources\Models\TaskSkill;
use App\Modules\Resources\Models\TimeEntry;
use App\Modules\Resources\Models\TimeOffRequest;
use App\Modules\Resources\Models\UserSkill;
use App\Modules\Resources\Services\CapacityForecastService;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use App\Models\Role;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Support\Str;
use Tests\TestCase;

class Phase5ResourceManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $admin;
    protected User $pm;
    protected User $engineer;
    protected User $foreignUser;
    protected Project $projectA;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = ON;');
        $this->seed();

        Role::firstOrCreate(
            ['name' => 'team_member', 'guard_name' => 'web'],
            ['display_name' => 'Team Member', 'description' => 'Team member', 'is_system' => true]
        );

        // Organizations
        $this->orgA = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Acme Automation Inc',
            'slug' => 'acme-auto',
            'industry' => 'Automation',
            'region' => 'EMEA',
            'plan' => 'enterprise',
            'timezone' => 'UTC',
            'status' => 'active',
            'config' => ['weekendDays' => [0, 6]], // Sun & Sat
        ]);

        $this->orgB = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Globex Corp',
            'slug' => 'globex-corp',
            'industry' => 'Automation',
            'region' => 'EMEA',
            'plan' => 'enterprise',
            'timezone' => 'UTC',
            'status' => 'active',
            'config' => ['weekendDays' => [0, 6]],
        ]);

        app(TenantManager::class)->setTenant($this->orgA);
        setPermissionsTeamId($this->orgA->id);

        // Users
        $this->admin = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Acme Admin',
            'email' => 'admin@acme.com',
            'password' => bcrypt('Password123!'),
            'job_title' => 'Administrator',
            'department' => 'Executive',
            'status' => 'active',
            'weekly_capacity_hours' => 40.0,
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);
        $this->admin->assignRole('admin');

        $this->pm = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Acme PM',
            'email' => 'pm@acme.com',
            'password' => bcrypt('Password123!'),
            'job_title' => 'Project Manager',
            'department' => 'Product',
            'status' => 'active',
            'weekly_capacity_hours' => 40.0,
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);
        $this->pm->assignRole('project_manager');

        $this->engineer = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Acme Engineer',
            'email' => 'engineer@acme.com',
            'password' => bcrypt('Password123!'),
            'job_title' => 'Engineer',
            'department' => 'Engineering',
            'status' => 'active',
            'weekly_capacity_hours' => 40.0,
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);
        $this->engineer->assignRole('team_member');

        $this->foreignUser = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Globex User',
            'email' => 'foreign@globex.com',
            'password' => bcrypt('Password123!'),
            'job_title' => 'Engineer',
            'department' => 'Engineering',
            'status' => 'active',
            'weekly_capacity_hours' => 40.0,
            'default_organization_id' => $this->orgB->id,
            'email_verified_at' => now(),
        ]);
        setPermissionsTeamId($this->orgB->id);
        $this->foreignUser->assignRole('team_member');
        setPermissionsTeamId($this->orgA->id);

        // Org Memberships
        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->admin->id,
            'is_owner' => true,
            'joined_at' => now(),
        ]);
        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->pm->id,
            'is_owner' => false,
            'joined_at' => now(),
        ]);
        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->engineer->id,
            'is_owner' => false,
            'joined_at' => now(),
        ]);
        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgB->id,
            'user_id' => $this->foreignUser->id,
            'is_owner' => true,
            'joined_at' => now(),
        ]);

        // Project
        $this->projectA = Project::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'name' => 'Assembly Line Modernization',
            'code' => 'ALM-01',
            'project_manager_id' => $this->pm->id,
            'config' => ['weekendDays' => [0, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        ProjectUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'user_id' => $this->pm->id,
            'project_role' => 'lead',
            'billable_rate' => 150.00,
        ]);

        ProjectUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'user_id' => $this->engineer->id,
            'project_role' => 'member',
            'billable_rate' => 100.00,
        ]);
    }

    protected function createTask(array $attributes = []): Task
    {
        return Task::create(array_merge([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'name' => 'Sample Task',
            'category' => 'Engineering',
            'status' => 'In Progress',
            'start_date' => Carbon::now()->format('Y-m-d'),
            'end_date' => Carbon::now()->addDays(5)->format('Y-m-d'),
        ], $attributes));
    }

    // 1. Time-Off Submission & Anti-Self-Approval Workflow
    public function test_time_off_submission_and_anti_self_approval(): void
    {
        $start = Carbon::now()->addDays(5)->format('Y-m-d');
        $end = Carbon::now()->addDays(7)->format('Y-m-d');

        // Submit request
        $res = $this->actingAs($this->engineer, 'sanctum')->postJson('/api/v1/time-off', [
            'type' => 'vacation',
            'start_date' => $start,
            'end_date' => $end,
            'notes' => 'Annual family vacation',
        ]);
        $res->assertStatus(201);
        $timeOffId = $res->json('data.id');

        // Anti-self-approval: engineer attempts to approve own request -> 403
        $selfApproveRes = $this->actingAs($this->engineer, 'sanctum')->putJson("/api/v1/time-off/{$timeOffId}/approve");
        $selfApproveRes->assertStatus(403);

        // PM approves request -> 200
        $pmApproveRes = $this->actingAs($this->pm, 'sanctum')->putJson("/api/v1/time-off/{$timeOffId}/approve");
        $pmApproveRes->assertStatus(200);

        $request = TimeOffRequest::find($timeOffId);
        $this->assertEquals('approved', $request->status);
        $this->assertEquals($this->pm->id, $request->approved_by_id);
        $this->assertEquals($this->pm->id, $request->approved_by_ulid_snapshot);
        $this->assertEquals($this->pm->name, $request->approved_by_name);
    }

    // 2. Working Day Capacity Reduction vs Weekend Non-Deduction
    public function test_time_off_reduces_capacity_for_working_days_only(): void
    {
        // Monday to Friday of next week
        $nextMonday = Carbon::now()->addWeek()->startOfWeek(Carbon::MONDAY);
        $nextFriday = $nextMonday->copy()->addDays(4);

        // Leave for Monday & Tuesday (2 working days)
        TimeOffRequest::create([
            'organization_id' => $this->orgA->id,
            'user_id' => $this->engineer->id,
            'type' => 'vacation',
            'start_date' => $nextMonday->format('Y-m-d'),
            'end_date' => $nextMonday->copy()->addDay()->format('Y-m-d'), // 2 working days
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        $service = app(CapacityForecastService::class);
        $forecast = $service->calculateForecast($this->orgA->id, 4);

        $userItem = collect($forecast['users'])->firstWhere('user_id', $this->engineer->id);
        $targetWeek = collect($userItem['weeks'])->firstWhere('start_date', $nextMonday->format('Y-m-d'));

        // 40h base - (2 days * 8h = 16h) = 24.0h effective capacity
        $this->assertEquals(40.0, $targetWeek['base_capacity_hours']);
        $this->assertEquals(16.0, $targetWeek['time_off_hours']);
        $this->assertEquals(24.0, $targetWeek['effective_capacity_hours']);
    }

    // 3. Zero Capacity Week Handled Cleanly (zero_capacity status)
    public function test_time_off_zero_capacity_week_handled_cleanly(): void
    {
        $nextMonday = Carbon::now()->addWeeks(2)->startOfWeek(Carbon::MONDAY);
        $nextSunday = $nextMonday->copy()->endOfWeek(Carbon::SUNDAY);

        // Full week leave (Mon-Sun)
        TimeOffRequest::create([
            'organization_id' => $this->orgA->id,
            'user_id' => $this->engineer->id,
            'type' => 'vacation',
            'start_date' => $nextMonday->format('Y-m-d'),
            'end_date' => $nextSunday->format('Y-m-d'),
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        $service = app(CapacityForecastService::class);
        $forecast = $service->calculateForecast($this->orgA->id, 4);

        $userItem = collect($forecast['users'])->firstWhere('user_id', $this->engineer->id);
        $targetWeek = collect($userItem['weeks'])->firstWhere('start_date', $nextMonday->format('Y-m-d'));

        $this->assertEquals(0.0, $targetWeek['effective_capacity_hours']);
        $this->assertEquals(0.0, $targetWeek['allocated_hours']);
        $this->assertEquals(0.0, $targetWeek['load_percent']);
        $this->assertEquals('zero_capacity', $targetWeek['status']);
    }

    // 4. Cache Versioning Increments & Invalidates Forecast
    public function test_cache_versioning_increments_and_invalidates_forecast(): void
    {
        $service = app(CapacityForecastService::class);
        $initial = $service->getForecast($this->orgA->id, 4);

        $oldVersion = Cache::get("org:{$this->orgA->id}:capacity_v");
        $this->assertNotNull($oldVersion);

        // Sleep briefly and invalidate
        usleep(50000);
        $service->invalidateCache($this->orgA->id);

        $newVersion = Cache::get("org:{$this->orgA->id}:capacity_v");
        $this->assertNotEquals($oldVersion, $newVersion);
    }

    // 5. Skills CRUD & Soft-Disable When Referenced
    public function test_skills_crud_and_soft_disable_when_referenced(): void
    {
        // 1. Create skill
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/skills', [
            'name' => 'Siemens S7 PLC',
            'category' => 'Automation',
        ]);
        $res->assertStatus(201);
        $skillId = $res->json('data.id');

        // 2. Assign to user
        UserSkill::create([
            'organization_id' => $this->orgA->id,
            'user_id' => $this->engineer->id,
            'skill_id' => $skillId,
            'proficiency' => 4,
            'years_experience' => 3.5,
        ]);

        // 3. Delete referenced skill -> sets is_active = false
        $delRes = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/v1/skills/{$skillId}");
        $delRes->assertStatus(200);
        $this->assertEquals('deactivated', $delRes->json('status'));

        $skill = Skill::find($skillId);
        $this->assertNotNull($skill);
        $this->assertFalse($skill->is_active);

        // 4. Delete unreferenced skill -> 204
        $unused = Skill::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Obsolete Pascal',
            'category' => 'Legacy',
        ]);
        $delUnused = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/v1/skills/{$unused->id}");
        $delUnused->assertStatus(204);
        $this->assertNull(Skill::find($unused->id));
    }

    // 6. Skills Search with Proficiency & Match Mode
    public function test_skills_search_with_proficiency_and_match_mode(): void
    {
        $plc = Skill::create(['organization_id' => $this->orgA->id, 'name' => 'PLC', 'category' => 'Engineering']);
        $scada = Skill::create(['organization_id' => $this->orgA->id, 'name' => 'SCADA', 'category' => 'Engineering']);

        // Engineer has both PLC (4) and SCADA (3)
        UserSkill::create(['organization_id' => $this->orgA->id, 'user_id' => $this->engineer->id, 'skill_id' => $plc->id, 'proficiency' => 4]);
        UserSkill::create(['organization_id' => $this->orgA->id, 'user_id' => $this->engineer->id, 'skill_id' => $scada->id, 'proficiency' => 3]);

        // PM has only PLC (2)
        UserSkill::create(['organization_id' => $this->orgA->id, 'user_id' => $this->pm->id, 'skill_id' => $plc->id, 'proficiency' => 2]);

        // Search match_mode=all for PLC and SCADA
        $resAll = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/skills/search?skills=PLC,SCADA&match_mode=all');
        $resAll->assertStatus(200);
        $dataAll = $resAll->json('data');
        $this->assertCount(1, $dataAll);
        $this->assertEquals($this->engineer->id, $dataAll[0]['user_id']);

        // Search match_mode=any
        $resAny = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/skills/search?skills=PLC,SCADA&match_mode=any');
        $resAny->assertStatus(200);
        $this->assertCount(2, $resAny->json('data'));
    }

    // 7. Cross-Project Allocations Accurate & Clipped
    public function test_cross_project_allocations_accurate_and_clipped(): void
    {
        $projectB = Project::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'name' => 'Conveyor Overhaul',
            'code' => 'CO-02',
            'project_manager_id' => $this->pm->id,
            'config' => ['weekendDays' => [0, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        $task1 = $this->createTask([
            'name' => 'Panel Design',
            'primary_owner_id' => $this->engineer->id,
            'start_date' => Carbon::now()->addDays(2)->format('Y-m-d'),
            'end_date' => Carbon::now()->addDays(8)->format('Y-m-d'),
            'estimated_hours' => 24.0,
        ]);

        $task2 = $this->createTask([
            'project_id' => $projectB->id,
            'name' => 'Safety Circuit Commissioning',
            'primary_owner_id' => $this->engineer->id,
            'start_date' => Carbon::now()->addDays(5)->format('Y-m-d'),
            'end_date' => Carbon::now()->addDays(12)->format('Y-m-d'),
            'estimated_hours' => 32.0,
        ]);

        $res = $this->actingAs($this->pm, 'sanctum')->getJson("/api/v1/users/{$this->engineer->id}/allocations");
        $res->assertStatus(200);
        $allocations = $res->json('allocations');

        $this->assertCount(2, $allocations);
        $this->assertEquals('ALM-01', $allocations[0]['project_code']);
        $this->assertEquals('CO-02', $allocations[1]['project_code']);
    }

    // 8. Resource Leveling Advisory State Hash & Apply
    public function test_resource_leveling_advisory_state_hash_and_apply(): void
    {
        $task1 = $this->createTask([
            'name' => 'Sensor Calibration A',
            'primary_owner_id' => $this->engineer->id,
            'start_date' => '2026-11-02',
            'end_date' => '2026-11-06',
        ]);

        $task2 = $this->createTask([
            'name' => 'Sensor Calibration B',
            'primary_owner_id' => $this->engineer->id,
            'start_date' => '2026-11-02', // Overlapping start date
            'end_date' => '2026-11-06',
        ]);

        // Propose
        $res = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$this->projectA->id}/level-resources", [
            'mode' => 'minimize_overallocation',
        ]);
        $res->assertStatus(200);
        $stateHash = $res->json('state_hash');
        $this->assertNotEmpty($stateHash);
        $this->assertNotEmpty($res->json('proposals'));

        // If tasks are modified concurrently, apply fails with 409
        $task1->update(['start_date' => '2026-11-03']);
        $conflictRes = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$this->projectA->id}/level-resources/apply", [
            'state_hash' => $stateHash,
            'task_ids' => [$task2->id],
        ]);
        $conflictRes->assertStatus(409);

        // Re-propose and apply cleanly
        $freshProp = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$this->projectA->id}/level-resources", [
            'mode' => 'minimize_overallocation',
        ]);
        $freshHash = $freshProp->json('state_hash');

        $applyRes = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/projects/{$this->projectA->id}/level-resources/apply", [
            'state_hash' => $freshHash,
            'task_ids' => [$task2->id],
        ]);
        $applyRes->assertStatus(200);
    }

    // 9. Timesheet Submit, Reject, and Approval Immutability
    public function test_timesheet_submit_reject_and_approval_immutability(): void
    {
        $task = $this->createTask([
            'name' => 'PLC Logic Review',
        ]);

        // Store time entry: 1.28 rounds to 1.25 (15m increment)
        $storeRes = $this->actingAs($this->engineer, 'sanctum')->postJson("/api/v1/tasks/{$task->id}/time-entries", [
            'date' => '2026-10-21',
            'hours' => 1.28,
            'description' => 'Debugging state machine',
        ]);
        $storeRes->assertStatus(201);
        $entryId = $storeRes->json('data.id');
        $this->assertEquals(1.25, (float) $storeRes->json('data.hours'));
        $this->assertEquals('draft', $storeRes->json('data.status'));

        // Submit
        $subRes = $this->actingAs($this->engineer, 'sanctum')->postJson('/api/v1/timesheets/submit', [
            'entry_ids' => [$entryId],
        ]);
        $subRes->assertStatus(200);
        $entry = TimeEntry::find($entryId);
        $this->assertEquals('submitted', $entry->status);

        // PM Rejects with reason
        $rejRes = $this->actingAs($this->pm, 'sanctum')->postJson("/api/v1/timesheets/{$entryId}/reject", [
            'reason' => 'Please provide more details on state machine failure',
        ]);
        $rejRes->assertStatus(200);
        $entry->refresh();
        $this->assertEquals('rejected', $entry->status);
        $this->assertEquals('Please provide more details on state machine failure', $entry->rejection_reason);

        // Resubmit & approve
        $this->actingAs($this->engineer, 'sanctum')->postJson('/api/v1/timesheets/submit', ['entry_ids' => [$entryId]]);
        $appRes = $this->actingAs($this->pm, 'sanctum')->putJson('/api/v1/timesheets/bulk-approve', ['entry_ids' => [$entryId]]);
        $appRes->assertStatus(200);

        $entry->refresh();
        $this->assertEquals('approved', $entry->status);

        // Immutability test: editing or deleting approved entry returns 422
        $editRes = $this->actingAs($this->engineer, 'sanctum')->putJson("/api/v1/time-entries/{$entryId}", [
            'hours' => 2.0,
        ]);
        $editRes->assertStatus(422);

        $delRes = $this->actingAs($this->engineer, 'sanctum')->deleteJson("/api/v1/time-entries/{$entryId}");
        $delRes->assertStatus(422);
    }

    // 10. Bulk Approve Returns Structured Failed IDs and Reason Summary
    public function test_bulk_approve_returns_structured_failed_ids_and_reason_summary(): void
    {
        $task = $this->createTask([
            'name' => 'Wiring inspection',
        ]);

        // Entry 1: engineer entry (submitted)
        $entry1 = TimeEntry::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'task_id' => $task->id,
            'user_id' => $this->engineer->id,
            'date' => '2026-10-21',
            'hours' => 4.0,
            'submitted_at' => now(),
        ]);

        // Entry 2: PM's own entry (self-approval prohibited)
        $entry2 = TimeEntry::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'task_id' => $task->id,
            'user_id' => $this->pm->id,
            'date' => '2026-10-21',
            'hours' => 2.0,
            'submitted_at' => now(),
        ]);

        // Entry 3: already approved entry
        $entry3 = TimeEntry::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'task_id' => $task->id,
            'user_id' => $this->engineer->id,
            'date' => '2026-10-22',
            'hours' => 3.0,
            'submitted_at' => now(),
            'approved_at' => now(),
        ]);

        $res = $this->actingAs($this->pm, 'sanctum')->putJson('/api/v1/timesheets/bulk-approve', [
            'entry_ids' => [$entry1->id, $entry2->id, $entry3->id],
        ]);

        $res->assertStatus(200);
        $this->assertEquals(1, $res->json('approved_count'));
        $this->assertEquals(2, $res->json('failed_count'));
        $this->assertEquals(1, $res->json('reason_summary.self_approval_prohibited'));
        $this->assertEquals(1, $res->json('reason_summary.already_approved'));
    }

    // 11. Approved By ULID Snapshot Persists After Approver User Deletion
    public function test_approved_by_ulid_snapshot_persists_after_user_deletion(): void
    {
        $approver = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Temporary Approver',
            'email' => 'temp.approver@acme.com',
            'password' => bcrypt('Password123!'),
            'job_title' => 'Interim PM',
            'department' => 'Product',
            'status' => 'active',
            'weekly_capacity_hours' => 40.0,
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);
        setPermissionsTeamId($this->orgA->id);
        $approver->assignRole('project_manager');
        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $approver->id,
            'is_owner' => false,
            'joined_at' => now(),
        ]);

        $task = $this->createTask([
            'name' => 'HMI Layout Review',
        ]);

        $entry = TimeEntry::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'task_id' => $task->id,
            'user_id' => $this->engineer->id,
            'date' => '2026-10-21',
            'hours' => 4.0,
            'submitted_at' => now(),
        ]);

        $this->actingAs($approver, 'sanctum')->putJson('/api/v1/timesheets/bulk-approve', [
            'entry_ids' => [$entry->id],
        ]);

        $entry->refresh();
        $this->assertEquals($approver->id, $entry->approved_by_ulid_snapshot);
        $this->assertEquals($approver->name, $entry->approved_by_name);

        // Delete approver user (soft delete)
        $approverId = $approver->id;
        $approverName = $approver->name;
        $approver->delete();

        $entry->refresh();
        $this->assertTrue($approver->trashed());
        $this->assertEquals($approverId, $entry->approved_by_ulid_snapshot); // Snapshot retained!
        $this->assertEquals($approverName, $entry->approved_by_name);
    }

    // 12. TIME_OFF_OVERLAPS_TIMESHEET Warning Surfaced
    public function test_time_off_overlaps_timesheet_warning_surfaced(): void
    {
        $task = $this->createTask([
            'name' => 'Site Visit',
        ]);

        // User logs time on 2026-10-22
        TimeEntry::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'task_id' => $task->id,
            'user_id' => $this->engineer->id,
            'date' => '2026-10-22',
            'hours' => 8.0,
        ]);

        // User requests time off covering 2026-10-22 -> warning returned
        $res = $this->actingAs($this->engineer, 'sanctum')->postJson('/api/v1/time-off', [
            'type' => 'sick',
            'start_date' => '2026-10-22',
            'end_date' => '2026-10-22',
        ]);

        $res->assertStatus(201);
        $this->assertNotEmpty($res->json('warnings'));
        $this->assertEquals('TIME_OFF_OVERLAPS_TIMESHEET', $res->json('warnings.0.code'));
    }

    // 13. Billable Rate x Hours Labor Cost Calculation
    public function test_billable_rate_times_hours_reporting(): void
    {
        $task = $this->createTask([
            'name' => 'Client Integration',
        ]);

        // Engineer logs 5 hours billable (rate = 100.00/h -> $500.00)
        TimeEntry::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'task_id' => $task->id,
            'user_id' => $this->engineer->id,
            'date' => Carbon::now()->format('Y-m-d'),
            'hours' => 5.0,
            'billable' => true,
        ]);

        $res = $this->actingAs($this->pm, 'sanctum')->getJson('/api/v1/reports/billability');
        $res->assertStatus(200);

        $this->assertEquals(5.0, (float) $res->json('summary.total_hours'));
        $this->assertEquals(5.0, (float) $res->json('summary.billable_hours'));
        $this->assertEquals(100.0, (float) $res->json('summary.billable_percent'));
        $this->assertEquals(500.0, (float) $res->json('summary.total_cost'));
    }

    // 14. Hiring Recommendations Detects Sustained Deficit
    public function test_hiring_recommendations_detects_sustained_deficit(): void
    {
        $skill = Skill::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Robotics Calibration',
            'category' => 'Robotics',
            'is_active' => true,
        ]);

        // Tasks require skill over 10 consecutive weeks, with 0 supply in team
        $start = Carbon::now()->addWeek()->startOfWeek(Carbon::MONDAY);
        $task = $this->createTask([
            'name' => 'Extended Robotic Cell Setup',
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $start->copy()->addWeeks(10)->format('Y-m-d'),
            'estimated_hours' => 400.0, // 40h/wk for 10 weeks
        ]);

        TaskSkill::create([
            'organization_id' => $this->orgA->id,
            'task_id' => $task->id,
            'skill_id' => $skill->id,
            'min_proficiency' => 3,
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/organizations/current/capacity/hiring-recommendations');
        $res->assertStatus(200);
        $recs = $res->json('recommendations');

        $this->assertCount(1, $recs);
        $this->assertEquals('Robotics Calibration', $recs[0]['skill_name']);
        $this->assertGreaterThanOrEqual(1, $recs[0]['recommended_headcount']);
    }

    // 15. Cross-Tenant Isolation Across All Resource Entities
    public function test_cross_tenant_isolation_for_all_resource_entities(): void
    {
        // Foreign user in Org B cannot see Org A time off
        $foreignTimeOffRes = $this->actingAs($this->foreignUser, 'sanctum')->getJson('/api/v1/time-off');
        $foreignTimeOffRes->assertStatus(200);
        $this->assertEmpty($foreignTimeOffRes->json('data'));

        // Foreign user cannot see Org A skills
        $foreignSkillsRes = $this->actingAs($this->foreignUser, 'sanctum')->getJson('/api/v1/skills');
        $foreignSkillsRes->assertStatus(200);
        $this->assertEmpty($foreignSkillsRes->json('data'));

        // Foreign user cannot see Org A user allocations
        $foreignAllocRes = $this->actingAs($this->foreignUser, 'sanctum')->getJson("/api/v1/users/{$this->engineer->id}/allocations");
        $foreignAllocRes->assertStatus(404);

        // Foreign user cannot log time on Org A task
        $taskA = $this->createTask([
            'name' => 'Classified Org A Task',
        ]);

        $foreignLogRes = $this->actingAs($this->foreignUser, 'sanctum')->postJson("/api/v1/tasks/{$taskA->id}/time-entries", [
            'date' => '2026-10-21',
            'hours' => 2.0,
        ]);
        $foreignLogRes->assertStatus(404);
    }
}

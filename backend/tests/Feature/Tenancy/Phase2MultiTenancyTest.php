<?php

namespace Tests\Feature\Tenancy;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Modules\Collaboration\Models\TaskComment;
use App\Models\User;
use App\Modules\Tenancy\Exceptions\PlanLimitExceededException;
use App\Modules\Tenancy\Exceptions\TenantContextMissingException;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationInvitation;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class Phase2MultiTenancyTest extends TestCase
{
    use RefreshDatabase;

    protected TenantManager $tenantManager;
    protected Organization $orgA;
    protected Organization $orgB;
    protected User $ownerA;
    protected User $userB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->tenantManager = app(TenantManager::class);

        // Org A (Free Plan for testing limits & isolation)
        $this->orgA = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Alpha Corporation',
            'slug' => 'alpha-corp',
            'industry' => 'Aerospace',
            'region' => 'EMEA',
            'plan' => 'free',
            'status' => 'active',
            'default_calendar' => 'standard_5d_40h',
        ]);

        $this->ownerA = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Alpha Owner',
            'email' => 'owner@alpha.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'status' => 'active',
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->ownerA->id,
            'is_owner' => 1,
            'joined_at' => now(),
        ]);

        setPermissionsTeamId($this->orgA->id);
        $this->ownerA->assignRole('admin');

        // Org B (Enterprise Plan)
        $this->orgB = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Beta Defense',
            'slug' => 'beta-defense',
            'industry' => 'Defense',
            'region' => 'MENA',
            'plan' => 'enterprise',
            'status' => 'active',
            'default_calendar' => 'standard_5d_40h',
        ]);

        $this->userB = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Beta User',
            'email' => 'user@beta.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'status' => 'active',
            'default_organization_id' => $this->orgB->id,
            'email_verified_at' => now(),
        ]);

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgB->id,
            'user_id' => $this->userB->id,
            'is_owner' => 1,
            'joined_at' => now(),
        ]);

        setPermissionsTeamId($this->orgB->id);
        $this->userB->assignRole('admin');
    }

    public function test_org_creation_on_install_command(): void
    {
        $exitCode = Artisan::call('deliverops:install', ['--force' => true]);
        $this->assertEquals(0, $exitCode);

        $systemOrg = Organization::where('id', '01HZX000000000000000000000')->first();
        $this->assertNotNull($systemOrg);

        $adminEmail = env('INITIAL_ADMIN_EMAIL', 'admin@deliverops.com');
        $admin = User::where('email', $adminEmail)->first();
        $this->assertNotNull($admin);
        $this->assertEquals($systemOrg->id, $admin->default_organization_id);

        $this->assertTrue(
            OrganizationUser::where('organization_id', $systemOrg->id)
                ->where('user_id', $admin->id)
                ->where('is_owner', 1)
                ->exists()
        );
    }

    public function test_invitation_flow_send_accept_with_new_user_creation_and_expiration(): void
    {
        $this->actingAs($this->ownerA);

        // 1. Send Invitation with valid Spatie role
        $sendRes = $this->postJson("/api/v1/organizations/{$this->orgA->id}/invitations", [
            'email' => 'cadet@alpha.com',
            'role' => 'contributor',
        ], ['X-Organization-Id' => $this->orgA->id]);

        $sendRes->assertStatus(201)
            ->assertJsonStructure(['invitation' => ['id', 'email', 'role'], 'inviteUrl', 'token']);

        $token = $sendRes->json('token');
        $this->assertNotEmpty($token);

        // 2. Test Expired Invitation Rejection
        $invitation = OrganizationInvitation::where('email', 'cadet@alpha.com')->first();
        $invitation->update(['expires_at' => now()->subDay()]);

        $expiredRes = $this->postJson("/api/v1/invitations/{$token}/accept");
        $expiredRes->assertStatus(410)
            ->assertJson(['code' => 'INVITE_EXPIRED']);

        // Reset expiration for acceptance test
        $invitation->update(['expires_at' => now()->addDays(7)]);

        // 3. Unregistered User Accepts -> Auto-creates User, logs in via session, returns user and org (NO token)
        auth()->forgetGuards();

        $acceptRes = $this->postJson("/api/v1/invitations/{$token}/accept", [
            'name' => 'Cadet Walker',
            'password' => 'DeliverOps2026!StrongPassword',
        ]);

        $acceptRes->assertStatus(200)
            ->assertJsonStructure(['message', 'organization' => ['id', 'name'], 'user' => ['id', 'email']]);

        // Asserts no token issued in response
        $this->assertArrayNotHasKey('token', $acceptRes->json());

        $cadet = User::where('email', 'cadet@alpha.com')->first();
        $this->assertNotNull($cadet);
        $this->assertEquals('Cadet Walker', $cadet->name);

        // Check member joined Org A with is_owner = false
        $this->assertTrue(
            OrganizationUser::where('organization_id', $this->orgA->id)
                ->where('user_id', $cadet->id)
                ->where('is_owner', 0)
                ->exists()
        );
    }

    public function test_strict_tenant_isolation_across_all_entities(): void
    {
        // 1. Seed Entities inside Org A
        $this->tenantManager->runForTenant($this->orgA->id, function () {
            $projectA = Project::create([
                'name' => 'Project Orion Alpha',
                'code' => 'PRJ-ALPHA',
                'project_type' => 'internal',
                'project_manager_id' => $this->ownerA->id,
                'config' => ['working_days' => [1, 2, 3, 4, 5], 'hours_per_day' => 8],
            ]);

            $taskA = Task::create([
                'project_id' => $projectA->id,
                'name' => 'Core Reactor Design',
                'category' => 'Engineering',
                'priority' => 'High',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays(10)->toDateString(),
                'pct' => 0,
                'status' => 'Not Started',
                'primary_owner_id' => $this->ownerA->id,
            ]);

            ProjectRisk::create([
                'project_id' => $projectA->id,
                'title' => 'Cooling Leak Risk',
                'description' => 'Cooling system pressure fluctuation',
                'type' => 'risk',
                'severity' => 'critical',
                'impact' => 'critical',
                'status' => 'open',
                'identified_date' => now()->toDateString(),
                'due_date' => now()->addDays(14)->toDateString(),
                'mitigation_plan' => 'Install redundant cooling valves',
            ]);

            TaskComment::create([
                'task_id' => $taskA->id,
                'user_id' => $this->ownerA->id,
                'content' => 'Reviewing reactor blueprint specs.',
            ]);

            AuditLog::create([
                'project_id' => $projectA->id,
                'entity_type' => 'project',
                'entity_id' => $projectA->id,
                'actor_id' => $this->ownerA->id,
                'actor_name' => $this->ownerA->name,
                'actor_role' => 'admin',
                'action' => 'project.created',
            ]);
        });

        // 2. Act as User in Org B
        $this->actingAs($this->userB);

        // API Project List under Org B -> Zero Org A Projects
        $res = $this->getJson('/api/v1/projects', ['X-Organization-Id' => $this->orgB->id]);
        $res->assertStatus(200);
        $this->assertCount(0, $res->json('data'));

        // Query direct Org A Project from Org B -> 404 Not Found
        $projectA = $this->tenantManager->executeWithoutTenantScope(fn () => Project::where('code', 'PRJ-ALPHA')->first());
        $leakRes = $this->getJson("/api/v1/projects/{$projectA->id}", ['X-Organization-Id' => $this->orgB->id]);
        $leakRes->assertStatus(404);

        // Direct Eloquent Query in Org B Context -> Returns 0 records
        $this->tenantManager->runForTenant($this->orgB->id, function () {
            $this->assertEquals(0, Project::count());
            $this->assertEquals(0, Task::count());
            $this->assertEquals(0, ProjectRisk::count());
            $this->assertEquals(0, TaskComment::count());
        });
    }

    public function test_role_changes_member_removal_and_last_owner_protection(): void
    {
        $this->actingAs($this->ownerA);

        // Add a secondary member to Org A
        $member = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Team Engineer',
            'email' => 'engineer@alpha.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'status' => 'active',
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $member->id,
            'is_owner' => 0,
            'joined_at' => now(),
        ]);

        setPermissionsTeamId($this->orgA->id);
        $member->assignRole('contributor');

        // 1. Update Role of Member to Admin
        $roleRes = $this->putJson("/api/v1/organizations/current/members/{$member->id}", [
            'role' => 'admin',
        ], ['X-Organization-Id' => $this->orgA->id]);

        $roleRes->assertStatus(200);
        $member->refresh();
        $this->assertTrue($member->hasRole('admin'));

        // 2. Attempt to remove the ONLY primary owner -> Must Fail with 422 ORG_CANNOT_REMOVE_OWNER
        $removeOwnerRes = $this->deleteJson("/api/v1/organizations/current/members/{$this->ownerA->id}", [], [
            'X-Organization-Id' => $this->orgA->id,
        ]);

        $removeOwnerRes->assertStatus(422)
            ->assertJson(['code' => 'ORG_CANNOT_REMOVE_OWNER']);

        // 3. Remove non-owner member -> Succeeds
        $removeMemberRes = $this->deleteJson("/api/v1/organizations/current/members/{$member->id}", [], [
            'X-Organization-Id' => $this->orgA->id,
        ]);

        $removeMemberRes->assertStatus(200);
        $this->assertDatabaseMissing('organization_users', [
            'organization_id' => $this->orgA->id,
            'user_id' => $member->id,
        ]);
    }

    public function test_plan_limits_enforced_free_tier(): void
    {
        $this->actingAs($this->ownerA);
        $headers = ['X-Organization-Id' => $this->orgA->id];

        // Org A is Free tier (max 3 projects)
        // 1. Create 3 projects -> All succeed
        for ($i = 1; $i <= 3; $i++) {
            $res = $this->postJson('/api/v1/projects', [
                'name' => "Free Project {$i}",
                'code' => "FREE-{$i}",
                'project_type' => 'internal',
                'description' => 'Test project description',
            ], $headers);
            $res->assertStatus(201);
        }

        // 2. 4th project creation -> Must be blocked with ORG_PLAN_LIMIT_EXCEEDED
        $res4 = $this->postJson('/api/v1/projects', [
            'name' => 'Blocked 4th Project',
            'code' => 'FREE-4',
            'project_type' => 'internal',
            'description' => 'Test project description',
        ], $headers);

        $res4->assertStatus(422)
            ->assertJson(['code' => 'ORG_PLAN_LIMIT_EXCEEDED']);

        // 3. Add 4 more members to Org A (bringing total to 5)
        for ($j = 1; $j <= 4; $j++) {
            $u = User::create([
                'id' => (string) Str::ulid(),
                'name' => "Member {$j}",
                'email' => "free_member_{$j}@alpha.com",
                'password' => Hash::make('DeliverOps2026!Secure'),
                'status' => 'active',
                'default_organization_id' => $this->orgA->id,
                'email_verified_at' => now(),
            ]);

            OrganizationUser::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $this->orgA->id,
                'user_id' => $u->id,
                'is_owner' => 0,
            ]);
        }

        // 4. Inviting a 6th member -> Blocked with ORG_PLAN_LIMIT_EXCEEDED
        $inviteRes = $this->postJson("/api/v1/organizations/{$this->orgA->id}/invitations", [
            'email' => 'sixth_member@alpha.com',
            'role' => 'contributor',
        ], $headers);

        $inviteRes->assertStatus(422)
            ->assertJson(['code' => 'ORG_PLAN_LIMIT_EXCEEDED']);
    }

    public function test_belongs_to_organization_scope_unit_enforcement(): void
    {
        // Without active tenant context, querying scoped model throws TenantContextMissingException
        $this->tenantManager->setTenant(null);

        $this->expectException(TenantContextMissingException::class);
        Project::all();
    }

    // =========================================================================
    // THE 8 AUDIT TESTS (REQUIREMENT 18)
    // =========================================================================

    /**
     * Audit Test 1 (HIGH-07 & DRIFT-04):
     * Guest can accept invitation without personal access token issuance and is logged in via cookie.
     */
    public function test_guest_can_accept_invitation_without_token_issuance_and_is_logged_in_via_cookie(): void
    {
        // 1. Dispatch an invite from Org A
        $this->actingAs($this->ownerA);
        $inviteRes = $this->postJson("/api/v1/organizations/{$this->orgA->id}/invitations", [
            'email' => 'guest.contractor@alpha.com',
            'role' => 'contributor',
        ], ['X-Organization-Id' => $this->orgA->id]);
        $inviteRes->assertStatus(201);
        $plainToken = $inviteRes->json('token');

        // 2. Unauthenticate completely to simulate pure guest session
        $this->app['auth']->forgetGuards();
        auth()->forgetGuards();
        $this->flushSession();

        // 3. Guest accepts invitation with credentials
        $acceptRes = $this->postJson("/api/v1/invitations/{$plainToken}/accept", [
            'name' => 'Guest Contractor',
            'password' => 'DeliverOps2026!ContractorPass',
        ]);

        $acceptRes->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'organization' => ['id', 'name'],
                'user' => ['id', 'name', 'email', 'default_organization_id'],
            ]);

        // Assert NO token returned
        $this->assertArrayNotHasKey('token', $acceptRes->json());

        // Assert user is logged in via web guard
        $this->assertAuthenticated();
        $this->assertEquals('guest.contractor@alpha.com', Auth::user()->email);

        // Assert membership persisted
        $this->assertTrue(
            OrganizationUser::where('organization_id', $this->orgA->id)
                ->where('user_id', Auth::id())
                ->where('is_owner', 0)
                ->exists()
        );
    }

    /**
     * Audit Test 2 (DRIFT-03):
     * Look up invitations by token_hash only; token column dropped.
     */
    public function test_invitation_lookup_by_token_hash_only(): void
    {
        // Assert token column does not exist
        $this->assertFalse(Schema::hasColumn('organization_invitations', 'token'));
        $this->assertTrue(Schema::hasColumn('organization_invitations', 'token_hash'));

        $plainToken = Str::random(64);
        $tokenHash = hash('sha256', $plainToken);

        $invitation = OrganizationInvitation::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'email' => 'hashlookup@alpha.com',
            'role' => 'contributor',
            'token_hash' => $tokenHash,
            'invited_by_id' => $this->ownerA->id,
            'expires_at' => now()->addDays(7),
        ]);

        // Record exists by token_hash
        $found = OrganizationInvitation::where('token_hash', $tokenHash)->first();
        $this->assertNotNull($found);
        $this->assertEquals($invitation->id, $found->id);

        // Lookup by raw plainToken in token_hash yields null
        $notFound = OrganizationInvitation::where('token_hash', $plainToken)->first();
        $this->assertNull($notFound);
    }

    /**
     * Audit Test 3 (DRIFT-01):
     * Single owner unique constraint enforced via owner_org_id generated column.
     */
    public function test_single_owner_unique_constraint_enforced_via_owner_org_id(): void
    {
        $this->assertTrue(Schema::hasColumn('organization_users', 'owner_org_id'));
        $this->assertTrue(Schema::hasColumn('organization_users', 'is_owner'));

        // Org A already has ownerA as owner (is_owner = 1)
        $firstOwner = OrganizationUser::where('organization_id', $this->orgA->id)
            ->where('user_id', $this->ownerA->id)
            ->first();
        $this->assertNotNull($firstOwner);
        $this->assertEquals(1, $firstOwner->is_owner);

        // Create a second user
        $secondUser = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Second User',
            'email' => 'second@alpha.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'status' => 'active',
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);

        // Multiple non-owners (is_owner = 0) are permitted
        $nonOwner = OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $secondUser->id,
            'is_owner' => 0,
        ]);
        $this->assertNotNull($nonOwner);

        // Attempting to insert a duplicate owner (is_owner = 1) in same org must fail unique constraint
        $thirdUser = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Third User',
            'email' => 'third@alpha.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'status' => 'active',
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);

        $this->expectException(QueryException::class);
        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $thirdUser->id,
            'is_owner' => 1,
        ]);
    }

    /**
     * Audit Test 4 (HIGH-03):
     * Validate invitation.role against Spatie Role list in FormRequest.
     */
    public function test_invitation_role_must_exist_in_spatie_roles_table(): void
    {
        $this->actingAs($this->ownerA);
        $headers = ['X-Organization-Id' => $this->orgA->id];

        // 1. Role that does not exist in Spatie roles table -> 422
        $invalidRes = $this->postJson("/api/v1/organizations/{$this->orgA->id}/invitations", [
            'email' => 'badrole@alpha.com',
            'role' => 'super_galactic_czar',
        ], $headers);

        $invalidRes->assertStatus(422)
            ->assertJsonValidationErrors(['role']);

        // 2. Role that exists in Spatie roles table -> 201
        $validRes = $this->postJson("/api/v1/organizations/{$this->orgA->id}/invitations", [
            'email' => 'goodrole@alpha.com',
            'role' => 'project_manager',
        ], $headers);

        $validRes->assertStatus(201);
        $this->assertEquals('project_manager', $validRes->json('invitation.role'));
    }

    /**
     * Audit Test 5 (HIGH-04):
     * Switch-organization updates users.default_organization_id + session + returns { user } with NO token.
     */
    public function test_switch_organization_updates_default_organization_id_and_returns_no_token(): void
    {
        // Add ownerA as member of orgB as well
        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgB->id,
            'user_id' => $this->ownerA->id,
            'is_owner' => 0,
        ]);

        $this->actingAs($this->ownerA);

        $res = $this->postJson('/api/v1/auth/switch-organization', [
            'organization_id' => $this->orgB->id,
        ]);

        $res->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email', 'default_organization_id'],
                'organization' => ['id', 'name'],
                'permissions',
            ]);

        // Asserts NO token is returned
        $this->assertArrayNotHasKey('token', $res->json());

        // Asserts user default_organization_id updated
        $this->ownerA->refresh();
        $this->assertEquals($this->orgB->id, $this->ownerA->default_organization_id);
        $this->assertEquals($this->orgB->id, $res->json('user.default_organization_id'));
    }

    /**
     * Audit Test 6 (HIGH-02):
     * PlanLimitExceededException rendered as HTTP 422 with ORG_PLAN_LIMIT_EXCEEDED.
     */
    public function test_plan_limit_exceeded_exception_rendered_as_422_with_org_plan_limit_exceeded(): void
    {
        $this->actingAs($this->ownerA);
        $headers = ['X-Organization-Id' => $this->orgA->id];

        // Org A is Free tier (max 3 projects)
        for ($i = 1; $i <= 3; $i++) {
            Project::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $this->orgA->id,
                'name' => "Pre-existing Project {$i}",
                'code' => "PRE-{$i}",
                'project_type' => 'internal',
                'project_manager_id' => $this->ownerA->id,
                'config' => ['working_days' => [1, 2, 3, 4, 5], 'hours_per_day' => 8],
            ]);
        }

        // Creating 4th project triggers PlanLimitService which throws PlanLimitExceededException
        $res = $this->postJson('/api/v1/projects', [
            'name' => 'Attempted 4th Project',
            'code' => 'PRE-4',
            'project_type' => 'internal',
            'description' => 'Test',
        ], $headers);

        $res->assertStatus(422)
            ->assertJson([
                'code' => 'ORG_PLAN_LIMIT_EXCEEDED',
                'details' => [
                    'limit' => 3,
                    'current' => 3,
                ],
            ]);
    }

    /**
     * Audit Test 7 (HIGH-06):
     * Tenant routes reject unverified emails with HTTP 403 AUTH_EMAIL_UNVERIFIED.
     */
    public function test_tenant_routes_reject_unverified_emails(): void
    {
        $unverifiedUser = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Unverified User',
            'email' => 'unverified@alpha.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'status' => 'active',
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => null, // Unverified
        ]);

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $unverifiedUser->id,
            'is_owner' => 0,
        ]);

        $this->actingAs($unverifiedUser);

        // Accessing tenant-scoped route with unverified email returns 403
        $res = $this->getJson('/api/v1/organizations/current', [
            'X-Organization-Id' => $this->orgA->id,
        ]);

        $res->assertStatus(403)
            ->assertJson([
                'code' => 'AUTH_EMAIL_UNVERIFIED',
            ]);
    }

    /**
     * Audit Test 8 (MED-01, MED-02, MED-04, MED-05):
     * Organization region CHECK constraint, plan enums, status enums, default_calendar, plan_limits JSON.
     */
    public function test_organization_region_check_constraint_and_plan_status_enums(): void
    {
        // 1. Valid creation with all standard attributes
        $org = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Valid Org APAC',
            'slug' => 'valid-org-apac',
            'region' => 'APAC',
            'plan' => 'pro',
            'status' => 'trialing',
            'default_calendar' => 'standard_5d_40h',
            'plan_limits' => ['max_projects' => 50, 'max_users' => 100],
        ]);

        $this->assertNotNull($org);
        $this->assertEquals('APAC', $org->region);
        $this->assertEquals('pro', $org->plan);
        $this->assertEquals('trialing', $org->status);
        $this->assertEquals('standard_5d_40h', $org->default_calendar);
        $this->assertEquals(50, $org->plan_limits['max_projects']);

        // 2. In MySQL, verify check constraint chk_org_region rejects invalid region
        if (DB::getDriverName() === 'mysql') {
            $this->expectException(QueryException::class);
            Organization::create([
                'id' => (string) Str::ulid(),
                'name' => 'Invalid Region Org',
                'slug' => 'invalid-region-org',
                'region' => 'ANTARCTICA',
                'plan' => 'enterprise',
                'status' => 'active',
            ]);
        } else {
            // Verify all allowed regions persist successfully
            foreach (['MENA', 'EMEA', 'NA', 'APAC', 'LATAM'] as $validRegion) {
                $testOrg = Organization::create([
                    'id' => (string) Str::ulid(),
                    'name' => "Org {$validRegion}",
                    'slug' => "org-" . strtolower($validRegion) . "-" . Str::random(4),
                    'region' => $validRegion,
                    'plan' => 'free',
                    'status' => 'active',
                ]);
                $this->assertEquals($validRegion, $testOrg->region);
            }
        }
    }
}

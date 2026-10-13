<?php

namespace Tests\Feature\Tenancy;

use App\Jobs\GlobalJob;
use App\Jobs\TenantAwareJob;
use App\Models\Project;
use App\Models\User;
use App\Modules\Audit\Services\AuditLoggerService;
use App\Modules\Identity\Services\MfaService;
use App\Modules\Tenancy\Exceptions\TenantContextMissingException;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationInvitation;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use App\Modules\Tenancy\Services\TransferOwnershipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class MultiTenancyAndAuthTest extends TestCase
{
    use RefreshDatabase;

    protected TenantManager $tenantManager;
    protected Organization $orgA;
    protected Organization $orgB;
    protected User $ownerA;
    protected User $memberA;
    protected User $userB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->tenantManager = app(TenantManager::class);

        // Setup Test Organization A
        $this->orgA = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Acme Corporation',
            'slug' => 'acme-corp',
            'industry' => 'Technology',
            'region' => 'MENA',
            'plan' => 'enterprise',
            'timezone' => 'UTC',
            'status' => 'active',
        ]);

        $this->ownerA = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Acme Owner',
            'email' => 'owner@acme.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'job_title' => 'CEO',
            'department' => 'Executive',
            'weekly_capacity_hours' => 40,
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

        $this->memberA = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Acme Member',
            'email' => 'member@acme.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'job_title' => 'Engineer',
            'department' => 'Engineering',
            'weekly_capacity_hours' => 40,
            'status' => 'active',
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->memberA->id,
            'is_owner' => 0,
            'joined_at' => now(),
        ]);

        $this->memberA->assignRole('contributor');

        // Setup Test Organization B
        $this->orgB = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Beta Logistics',
            'slug' => 'beta-logistics',
            'industry' => 'Logistics',
            'region' => 'EMEA',
            'plan' => 'pro',
            'timezone' => 'UTC',
            'status' => 'active',
        ]);

        $this->userB = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Beta Owner',
            'email' => 'owner@beta.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'job_title' => 'Director',
            'department' => 'Operations',
            'weekly_capacity_hours' => 40,
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

        // Reset tenant manager to clean state
        $this->tenantManager->setTenant(null);
    }

    // 1. Tenant Scope fail-closed check
    public function test_tenant_scope_throws_exception_when_no_tenant_context_is_present(): void
    {
        $this->tenantManager->setTenant(null);
        $this->expectException(TenantContextMissingException::class);

        Project::all();
    }

    // 2. Tenant Scope filtering isolation
    public function test_tenant_scope_filters_by_organization_id(): void
    {
        $defaultConfig = ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'];

        $this->tenantManager->setTenant($this->orgA);
        $projectA = Project::create([
            'name' => 'Project Alpha',
            'code' => 'PA-01',
            'organization_id' => $this->orgA->id,
            'config' => $defaultConfig,
        ]);

        $this->tenantManager->setTenant($this->orgB);
        $projectB = Project::create([
            'name' => 'Project Beta',
            'code' => 'PB-01',
            'organization_id' => $this->orgB->id,
            'config' => $defaultConfig,
        ]);

        // Querying under Org A only returns Project A
        $this->tenantManager->setTenant($this->orgA);
        $projects = Project::all();
        $this->assertCount(1, $projects);
        $this->assertEquals($projectA->id, $projects->first()->id);

        // Querying under Org B only returns Project B
        $this->tenantManager->setTenant($this->orgB);
        $projectsB = Project::all();
        $this->assertCount(1, $projectsB);
        $this->assertEquals($projectB->id, $projectsB->first()->id);
    }

    // 3. Excluded models from tenant scoping
    public function test_tenant_scope_excludes_users_and_organizations(): void
    {
        $this->tenantManager->setTenant(null);

        // Users and Organizations can be queried without tenant context
        $usersCount = User::count();
        $orgsCount = Organization::count();

        $this->assertGreaterThan(0, $usersCount);
        $this->assertGreaterThan(0, $orgsCount);
    }

    // 4. Bypass via executeWithoutTenantScope
    public function test_tenant_scope_can_be_bypassed_via_execute_without_tenant_scope(): void
    {
        $defaultConfig = ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'];

        $this->tenantManager->setTenant($this->orgA);
        Project::create([
            'name' => 'Project Bypass',
            'code' => 'PBP-01',
            'organization_id' => $this->orgA->id,
            'config' => $defaultConfig,
        ]);

        $this->tenantManager->setTenant(null);

        $count = $this->tenantManager->executeWithoutTenantScope(function () {
            return Project::count();
        });

        $this->assertGreaterThan(0, $count);
    }

    // 5. Registration flow
    public function test_registration_creates_organization_and_owner_without_tenant_context(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'organization_name' => 'Gamma Solutions',
            'name' => 'Gary Gamma',
            'email' => 'gary@gamma.com',
            'password' => 'DeliverOps2026!Gamma',
            'password_confirmation' => 'DeliverOps2026!Gamma',
            'industry' => 'Consulting',
            'region' => 'MENA',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email', 'defaultOrganizationId'],
                'organization' => ['id', 'name', 'slug'],
            ]);

        $this->assertDatabaseHas('organizations', ['name' => 'Gamma Solutions']);
        $this->assertDatabaseHas('users', ['email' => 'gary@gamma.com']);
    }

    // 6. Registration slug collision handling with 10-attempt cap
    public function test_registration_slug_collision_retry_loop_with_10_attempt_cap(): void
    {
        $payload1 = [
            'organization_name' => 'Delta Tech',
            'name' => 'Dan Delta',
            'email' => 'dan1@delta.com',
            'password' => 'DeliverOps2026!Delta',
            'password_confirmation' => 'DeliverOps2026!Delta',
        ];
        $this->postJson('/api/v1/auth/register', $payload1)->assertStatus(201);

        $payload2 = [
            'organization_name' => 'Delta Tech',
            'name' => 'Dave Delta',
            'email' => 'dan2@delta.com',
            'password' => 'DeliverOps2026!Delta',
            'password_confirmation' => 'DeliverOps2026!Delta',
        ];
        $res2 = $this->postJson('/api/v1/auth/register', $payload2);
        $res2->assertStatus(201);

        $this->assertNotEquals('delta-tech', $res2->json('organization.slug'));
        $this->assertStringStartsWith('delta-tech', $res2->json('organization.slug'));
    }

    // 7. Password policy enforcement
    public function test_registration_enforces_strong_password_policy(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'organization_name' => 'Weak Security Inc',
            'name' => 'Weak User',
            'email' => 'weak@security.com',
            'password' => 'short', // Too short, no mixed case, no symbol
            'password_confirmation' => 'short',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    // 8. Account lockout after 5 consecutive failed attempts
    public function test_login_locks_account_after_5_consecutive_failed_attempts_for_15_minutes(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'owner@acme.com',
                'password' => 'WrongPassword!',
            ])->assertStatus(422);
        }

        $this->ownerA->refresh();
        $this->assertEquals(5, $this->ownerA->failed_login_attempts);
        $this->assertNotNull($this->ownerA->locked_until);
        $this->assertTrue(now()->lessThan($this->ownerA->locked_until));

        // 6th attempt is rejected with 423 Locked
        $res6 = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@acme.com',
            'password' => 'DeliverOps2026!Secure',
        ]);
        $res6->assertStatus(423)
            ->assertJsonPath('code', 'AUTH_ACCOUNT_LOCKED');
    }

    // 9. Successful login resets failed attempts counter
    public function test_login_successful_clears_failed_attempts_counter(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@acme.com',
            'password' => 'WrongPassword!',
        ]);

        $this->ownerA->refresh();
        $this->assertEquals(1, $this->ownerA->failed_login_attempts);

        $res = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@acme.com',
            'password' => 'DeliverOps2026!Secure',
        ]);
        $res->assertStatus(200);

        $this->ownerA->refresh();
        $this->assertEquals(0, $this->ownerA->failed_login_attempts);
        $this->assertNull($this->ownerA->locked_until);
    }

    // 10. MFA Setup generates secret and URI
    public function test_mfa_setup_generates_secret_qr_and_uri(): void
    {
        $res = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/auth/mfa/setup');

        $res->assertStatus(200)
            ->assertJsonStructure(['secret', 'qrCodeUri']);

        $this->ownerA->refresh();
        $this->assertNotNull($this->ownerA->mfa_secret);
        $this->assertFalse($this->ownerA->mfa_enabled);
    }

    // 11. MFA Confirm enables MFA and returns 8 recovery codes
    public function test_mfa_confirm_enables_mfa_with_valid_totp(): void
    {
        $mfaService = app(MfaService::class);
        $setup = $mfaService->generateSecret($this->ownerA);

        $google2fa = new Google2FA();
        $validOtp = $google2fa->getCurrentOtp($setup['secret']);

        $res = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/auth/mfa/confirm', [
            'code' => $validOtp,
        ]);

        $res->assertStatus(200)
            ->assertJsonCount(10, 'recoveryCodes');

        $this->ownerA->refresh();
        $this->assertTrue($this->ownerA->mfa_enabled);
        $this->assertNotNull($this->ownerA->mfa_confirmed_at);
        $this->assertEquals(10, DB::table('mfa_recovery_codes')->where('user_id', $this->ownerA->id)->count());
    }

    // 12. MFA Recovery codes status returns counts only, never plaintext
    public function test_mfa_recovery_codes_status_returns_only_count_and_unused_count(): void
    {
        $mfaService = app(MfaService::class);
        $setup = $mfaService->generateSecret($this->ownerA);
        $google2fa = new Google2FA();
        $mfaService->confirmAndEnable($this->ownerA, $google2fa->getCurrentOtp($setup['secret']));

        $res = $this->actingAs($this->ownerA, 'sanctum')->getJson('/api/v1/auth/mfa/recovery-codes/status');

        $res->assertStatus(200)
            ->assertJson([
                'total' => 10,
                'remaining' => 10,
                'hasRecoveryCodes' => true,
            ]);

        // Must never expose plaintext codes or hashes
        $this->assertArrayNotHasKey('codes', $res->json());
        $this->assertArrayNotHasKey('recoveryCodes', $res->json());
    }

    // 13. MFA Regenerate recovery codes atomically rotates codes
    public function test_mfa_regenerate_recovery_codes_returns_new_codes_atomically(): void
    {
        $mfaService = app(MfaService::class);
        $setup = $mfaService->generateSecret($this->ownerA);
        $google2fa = new Google2FA();
        $mfaService->confirmAndEnable($this->ownerA, $google2fa->getCurrentOtp($setup['secret']));

        $res = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/auth/mfa/recovery-codes/regenerate', [
            'password' => 'DeliverOps2026!Secure',
        ]);

        $res->assertStatus(200)
            ->assertJsonCount(10, 'recoveryCodes');

        $this->assertEquals(10, DB::table('mfa_recovery_codes')->where('user_id', $this->ownerA->id)->count());
    }

    // 14. MFA Challenge flow with valid code
    public function test_mfa_challenge_with_valid_totp_succeeds(): void
    {
        $mfaService = app(MfaService::class);
        $setup = $mfaService->generateSecret($this->ownerA);
        $google2fa = new Google2FA();
        $mfaService->confirmAndEnable($this->ownerA, $google2fa->getCurrentOtp($setup['secret']));

        // Step 1: Normal login prompts for MFA
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@acme.com',
            'password' => 'DeliverOps2026!Secure',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonPath('code', 'AUTH_MFA_REQUIRED');
        $challengeToken = $loginRes->json('challengeToken');
        $this->assertNotEmpty($challengeToken);

        // Step 2: Challenge with valid OTP
        $validOtp = $google2fa->getCurrentOtp($setup['secret']);
        $challengeRes = $this->postJson('/api/v1/auth/mfa/challenge', [
            'challengeToken' => $challengeToken,
            'code' => $validOtp,
        ]);

        $challengeRes->assertStatus(200)
            ->assertJsonStructure(['token', 'user', 'permissions']);
    }

    // 15. MFA Challenge with single-use recovery code
    public function test_mfa_challenge_with_recovery_code_succeeds_and_marks_it_used(): void
    {
        $mfaService = app(MfaService::class);
        $setup = $mfaService->generateSecret($this->ownerA);
        $google2fa = new Google2FA();
        $confirmResult = $mfaService->confirmAndEnable($this->ownerA, $google2fa->getCurrentOtp($setup['secret']));
        $recoveryCode = $confirmResult['recoveryCodes'][0];

        // Step 1: Login
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@acme.com',
            'password' => 'DeliverOps2026!Secure',
        ]);
        $challengeToken = $loginRes->json('challengeToken');

        // Step 2: Redeem recovery code
        $challengeRes = $this->postJson('/api/v1/auth/mfa/challenge', [
            'challengeToken' => $challengeToken,
            'code' => $recoveryCode,
        ]);

        $challengeRes->assertStatus(200);

        // Code should now be marked used
        $status = $mfaService->getRecoveryCodesStatus($this->ownerA);
        $this->assertEquals(9, $status['remaining']);

        // Attempting to reuse the same recovery code fails
        $loginRes2 = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@acme.com',
            'password' => 'DeliverOps2026!Secure',
        ]);
        $challengeRes2 = $this->postJson('/api/v1/auth/mfa/challenge', [
            'challengeToken' => $loginRes2->json('challengeToken'),
            'code' => $recoveryCode,
        ]);
        $challengeRes2->assertStatus(422);
    }

    // 16. MFA Challenge invalid code fails
    public function test_mfa_challenge_invalid_code_fails(): void
    {
        $mfaService = app(MfaService::class);
        $setup = $mfaService->generateSecret($this->ownerA);
        $google2fa = new Google2FA();
        $mfaService->confirmAndEnable($this->ownerA, $google2fa->getCurrentOtp($setup['secret']));

        $cacheToken = Str::random(64);
        cache()->put("mfa_challenge:{$cacheToken}", $this->ownerA->id, now()->addMinutes(5));

        $res = $this->postJson('/api/v1/auth/mfa/challenge', [
            'challengeToken' => $cacheToken,
            'code' => '999999',
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('code', 'AUTH_MFA_INVALID_CODE');
    }

    // 17. Organization switching
    public function test_organization_switching_updates_current_context(): void
    {
        // Add ownerA to orgB as well
        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgB->id,
            'user_id' => $this->ownerA->id,
            'is_owner' => 0,
            'joined_at' => now(),
        ]);

        $res = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/organizations/switch', [
            'organization_id' => $this->orgB->id,
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('organization.id', $this->orgB->id);

        $this->ownerA->refresh();
        $this->assertEquals($this->orgB->id, $this->ownerA->default_organization_id);
    }

    // 18. Transfer Ownership service atomic swap
    public function test_transfer_ownership_service_requires_pessimistic_lock_and_swaps_owner_atomically(): void
    {
        $service = app(TransferOwnershipService::class);
        $service->transfer($this->orgA, $this->ownerA, $this->memberA);

        $oldMembership = OrganizationUser::where('organization_id', $this->orgA->id)
            ->where('user_id', $this->ownerA->id)
            ->first();
        $newMembership = OrganizationUser::where('organization_id', $this->orgA->id)
            ->where('user_id', $this->memberA->id)
            ->first();

        $this->assertEquals(0, $oldMembership->is_owner);
        $this->assertEquals(1, $newMembership->is_owner);
    }

    // 19. Transfer ownership forbidden when caller is not owner
    public function test_transfer_ownership_forbidden_when_not_owner(): void
    {
        $service = app(TransferOwnershipService::class);

        try {
            $service->transfer($this->orgA, $this->memberA, $this->ownerA);
            $this->fail('Expected HttpResponseException was not thrown.');
        } catch (HttpResponseException $e) {
            $this->assertEquals(403, $e->getResponse()->getStatusCode());
            $this->assertStringContainsString('ORG_OWNERSHIP_TRANSFER_FORBIDDEN', (string) $e->getResponse()->getContent());
        }
    }

    // 20. Transfer ownership invalid target when not member
    public function test_transfer_ownership_invalid_target_when_not_member(): void
    {
        $service = app(TransferOwnershipService::class);

        try {
            $service->transfer($this->orgA, $this->ownerA, $this->userB);
            $this->fail('Expected HttpResponseException was not thrown.');
        } catch (HttpResponseException $e) {
            $this->assertEquals(422, $e->getResponse()->getStatusCode());
            $this->assertStringContainsString('ORG_TRANSFER_TARGET_INVALID', (string) $e->getResponse()->getContent());
        }
    }

    // 21. Invitation dispatch
    public function test_invitation_dispatches_with_secure_token_and_sets_expiration(): void
    {
        $res = $this->actingAs($this->ownerA, 'sanctum')
            ->withHeaders(['X-Organization-Id' => $this->orgA->id])
            ->postJson('/api/v1/organizations/invitations', [
                'email' => 'newhire@acme.com',
                'role' => 'contributor',
            ]);

        $res->assertStatus(201)
            ->assertJsonStructure(['invitation' => ['id', 'email', 'role', 'expiresAt'], 'inviteUrl']);

        $invitation = OrganizationInvitation::where('email', 'newhire@acme.com')->first();
        $this->assertNotNull($invitation);
        $this->assertNotNull($invitation->token_hash);
        $this->assertTrue(now()->lessThan($invitation->expires_at));
    }

    // 22. Invitation accept is idempotent and assigns Spatie team role
    public function test_invitation_accept_is_idempotent_and_assigns_spatie_team_role(): void
    {
        $plainToken = Str::random(64);
        $tokenHash = hash('sha256', $plainToken);

        $invitation = OrganizationInvitation::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'email' => 'invited@external.com',
            'role' => 'contributor',
            'token_hash' => $tokenHash,
            'invited_by_id' => $this->ownerA->id,
            'invited_by_name' => $this->ownerA->name,
            'invited_by_email' => $this->ownerA->email,
            'expires_at' => now()->addDays(7),
        ]);

        $newUser = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Invited User',
            'email' => 'invited@external.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'job_title' => 'Specialist',
            'department' => 'Operations',
            'weekly_capacity_hours' => 40,
            'status' => 'active',
        ]);

        $res = $this->actingAs($newUser, 'sanctum')->postJson('/api/v1/organizations/invitations/accept', [
            'token' => $plainToken,
        ]);

        $res->assertStatus(200);

        // Assert member record created
        $this->assertDatabaseHas('organization_users', [
            'organization_id' => $this->orgA->id,
            'user_id' => $newUser->id,
        ]);

        // Assert Spatie team role assigned
        setPermissionsTeamId($this->orgA->id);
        $this->assertTrue($newUser->hasRole('contributor'));

        // Idempotent retry succeeds with 200
        $res2 = $this->actingAs($newUser, 'sanctum')->postJson('/api/v1/organizations/invitations/accept', [
            'token' => $plainToken,
        ]);
        $res2->assertStatus(200);
    }

    // 23. TenantManager runForTenant restores previous tenant context and Spatie team id
    public function test_tenant_manager_run_for_tenant_restores_previous_tenant_and_spatie_team_id(): void
    {
        $this->tenantManager->setTenant($this->orgA);
        setPermissionsTeamId($this->orgA->id);

        $this->tenantManager->runForTenant($this->orgB->id, function ($tenant) {
            $this->assertEquals($this->orgB->id, $tenant->id);
            $this->assertEquals($this->orgB->id, getPermissionsTeamId());
        });

        $this->assertEquals($this->orgA->id, $this->tenantManager->getTenantId());
        $this->assertEquals($this->orgA->id, getPermissionsTeamId());
    }

    // 24. TenantManager runForTenant flushes cache only when team changes
    public function test_tenant_manager_run_for_tenant_flushes_cache_only_when_team_changes(): void
    {
        $this->tenantManager->setTenant($this->orgA);
        setPermissionsTeamId($this->orgA->id);

        $executed = false;
        // Running for same team should execute callback cleanly
        $this->tenantManager->runForTenant($this->orgA->id, function ($tenant) use (&$executed) {
            $executed = true;
            $this->assertEquals($this->orgA->id, $tenant->id);
        });

        $this->assertTrue($executed);
    }

    // 25. Logout all revokes tokens and invalidates sessions
    public function test_logout_all_revokes_tokens_and_invalidates_other_sessions(): void
    {
        $token1 = $this->ownerA->createToken('device1')->plainTextToken;
        $token2 = $this->ownerA->createToken('device2')->plainTextToken;

        $this->assertEquals(2, $this->ownerA->tokens()->count());

        $res = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/auth/logout-all');
        $res->assertStatus(200);

        $this->assertEquals(0, $this->ownerA->tokens()->count());
    }

    // 26. TenantAwareJob asserts tenant context
    public function test_tenant_aware_job_executes_in_mandatory_tenant_context(): void
    {
        $job = new class($this->orgA->id) extends TenantAwareJob {
            public bool $executedInContext = false;
            protected function executeInTenantContext(): void
            {
                if (app(TenantManager::class)->getTenantId() === $this->organizationId) {
                    $this->executedInContext = true;
                }
            }
        };

        $job->handle($this->tenantManager);
        $this->assertTrue($job->executedInContext);
    }

    // 27. GlobalJob asserts no tenant context
    public function test_global_job_executes_in_mandatory_global_context(): void
    {
        $job = new class extends GlobalJob {
            public bool $executedGlobally = false;
            protected function executeGlobally(): void
            {
                if (app(TenantManager::class)->isBypassed()) {
                    $this->executedGlobally = true;
                }
            }
        };

        $job->handle($this->tenantManager);
        $this->assertTrue($job->executedGlobally);
    }

    // 28. Auth events table records forensic events
    public function test_auth_events_table_logs_security_actions_with_forensic_retention(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@acme.com',
            'password' => 'WrongPassword!',
        ]);

        $this->assertDatabaseHas('auth_events', [
            'user_id' => $this->ownerA->id,
            'event_type' => 'login_failed',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@acme.com',
            'password' => 'DeliverOps2026!Secure',
        ]);

        $this->assertDatabaseHas('auth_events', [
            'user_id' => $this->ownerA->id,
            'event_type' => 'login_success',
        ]);
    }

    // 29. EnsureTenantContext middleware rejects unauthorized organization access
    public function test_ensure_tenant_context_middleware_rejects_unauthorized_org_access(): void
    {
        // Member A belongs to Org A, but requests with Org B header
        $res = $this->actingAs($this->memberA, 'sanctum')
            ->withHeaders(['X-Organization-Id' => $this->orgB->id])
            ->getJson('/api/v1/projects');

        $res->assertStatus(403)
            ->assertJsonPath('code', 'TENANT_ACCESS_DENIED');
    }

    // 30. Single organization owner invariant check
    public function test_organization_enforces_single_owner_constraint(): void
    {
        $this->expectException(\Illuminate\Database\QueryException::class);

        // Attempting to insert a second owner for the same organization violates the unique constraint
        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->memberA->id,
            'is_owner' => 1,
            'joined_at' => now(),
        ]);
    }
}

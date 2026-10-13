<?php

namespace Tests\Feature\Identity;

use App\Models\User;
use App\Modules\Identity\Models\AuthEvent;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthenticationAndIdentityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Run deliverops:install to provision admin user and roles
        $this->artisan('deliverops:install');
    }

    public function test_signup_creates_user_and_organization_with_strong_password(): void
    {
        Notification::fake();

        $res = $this->postJson('/api/v1/auth/signup', [
            'name' => 'Sara Al-Otaibi',
            'email' => 'sara@deliverops.com',
            'password' => 'DeliverOps#2026!Strong',
            'password_confirmation' => 'DeliverOps#2026!Strong',
            'company_name' => 'Otaibi Engineering',
            'industry' => 'Construction',
            'region' => 'MENA',
            'terms_accepted' => true,
        ]);

        $res->assertStatus(201)
            ->assertJsonStructure(['token', 'user' => ['id', 'email', 'name'], 'organization' => ['id', 'name', 'slug']]);

        $this->assertDatabaseHas('users', ['email' => 'sara@deliverops.com']);
        $this->assertDatabaseHas('organizations', ['name' => 'Otaibi Engineering']);

        $user = User::where('email', 'sara@deliverops.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue(Hash::check('DeliverOps#2026!Strong', $user->password));

        // Verifies owner membership
        $this->assertTrue($user->isOwnerOf(Organization::where('name', 'Otaibi Engineering')->first()));
    }

    public function test_signup_rejects_weak_passwords(): void
    {
        $res = $this->postJson('/api/v1/auth/signup', [
            'name' => 'Sara Al-Otaibi',
            'email' => 'sara@deliverops.com',
            'password' => 'weak',
            'password_confirmation' => 'weak',
            'company_name' => 'Otaibi Engineering',
        ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_email_verification_via_signed_url(): void
    {
        $user = User::create([
            'id' => (string) Str::ulid(),
            'name' => 'Unverified User',
            'email' => 'unverified@deliverops.com',
            'password' => Hash::make('DeliverOps#2026!Safe'),
            'job_title' => 'Engineer',
            'department' => 'Operations',
            'weekly_capacity_hours' => 40,
            'status' => 'active',
            'email_verified_at' => null,
        ]);

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $res = $this->getJson($verificationUrl);

        $res->assertStatus(200)
            ->assertJsonPath('message', 'Email verified successfully.');

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_forgot_password_has_no_user_enumeration(): void
    {
        // 1. Non-existent email returns 200
        $resNonExistent = $this->postJson('/api/v1/auth/password/forgot', [
            'email' => 'doesnotexist@example.com',
        ]);
        $resNonExistent->assertStatus(200)
            ->assertJsonPath('message', 'If that email address exists in our system, a password reset link has been dispatched.');

        // 2. Existing user returns identical 200 message and generates token
        $user = User::where('email', 'admin@deliverops.com')->first();
        $resExisting = $this->postJson('/api/v1/auth/password/forgot', [
            'email' => $user->email,
        ]);
        $resExisting->assertStatus(200)
            ->assertJsonPath('message', 'If that email address exists in our system, a password reset link has been dispatched.');

        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_password_reset_with_token_and_invalidates_all_sessions(): void
    {
        $user = User::where('email', 'admin@deliverops.com')->first();
        $rawToken = Str::random(64);
        $tokenHash = hash('sha256', $rawToken);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => $tokenHash,
                'token_hash' => $tokenHash,
                'created_at' => now(),
                'expires_at' => now()->addMinutes(60),
            ]
        );

        // Create an existing token to ensure it gets revoked
        $existingToken = $user->createToken('old_device')->plainTextToken;
        $this->assertCount(1, $user->tokens);

        $res = $this->postJson('/api/v1/auth/password/reset', [
            'email' => $user->email,
            'token' => $rawToken,
            'password' => 'DeliverOps#2026!BrandNew',
            'password_confirmation' => 'DeliverOps#2026!BrandNew',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('message', 'Password reset successfully. Please log in with your new password.');

        $user->refresh();
        $this->assertTrue(Hash::check('DeliverOps#2026!BrandNew', $user->password));

        // Tokens must be wiped
        $this->assertCount(0, $user->tokens);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_consecutive_failed_logins_lock_account_and_cli_unlocks(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        $user = User::where('email', 'admin@deliverops.com')->first();

        // 5 consecutive failures
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'WrongPass#12345',
            ]);
        }

        $user->refresh();
        $this->assertEquals(5, $user->failed_login_attempts);
        $this->assertNotNull($user->locked_until);

        // 6th attempt is locked with 423
        $res = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'WrongPass#12345',
        ]);
        $res->assertStatus(423)
            ->assertJsonPath('code', 'AUTH_ACCOUNT_LOCKED');

        // CLI unlock command resets lockout
        $this->artisan('deliverops:unlock', ['email' => $user->email])
            ->assertSuccessful();

        $user->refresh();
        $this->assertEquals(0, $user->failed_login_attempts);
        $this->assertNull($user->locked_until);
    }

    public function test_session_management_and_revocation(): void
    {
        $user = User::where('email', 'admin@deliverops.com')->first();

        // Simulate session in database
        DB::table('sessions')->insert([
            'id' => 'session_device_1',
            'user_id' => $user->id,
            'ip_address' => '192.168.1.50',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
            'payload' => 'dummy',
            'last_activity' => time(),
            'device_type' => 'Desktop',
            'browser' => 'Chrome',
            'platform' => 'Windows',
        ]);

        $res = $this->actingAs($user, 'sanctum')->getJson('/api/v1/auth/sessions');
        $res->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'ip_address', 'device_type', 'browser', 'platform']]]);

        // Revoke specific session
        $delRes = $this->actingAs($user, 'sanctum')->deleteJson('/api/v1/auth/sessions/session_device_1');
        $delRes->assertStatus(200);

        $this->assertDatabaseMissing('sessions', ['id' => 'session_device_1']);
    }

    public function test_admin_can_inspect_auth_events_audit_trail(): void
    {
        $admin = User::where('email', 'admin@deliverops.com')->first();

        // Write a test auth event
        DB::table('auth_events')->insert([
            'id' => (string) Str::ulid(),
            'user_id' => $admin->id,
            'email_attempted' => $admin->email,
            'event_type' => 'login_success',
            'event' => 'login_success',
            'ip_address' => '10.0.0.1',
            'user_agent' => 'TestBrowser',
            'created_at' => now(),
        ]);

        $res = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/auth-events?event=login_success');
        $res->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'event_type', 'email_attempted']]]);
    }
}

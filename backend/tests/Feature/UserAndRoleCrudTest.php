<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserAndRoleCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        (new \App\Modules\System\Services\InstallationOrchestrator())->install([]);
        setPermissionsTeamId('01HZX000000000000000000000');
    }

    public function test_login_returns_token_and_permissions(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@deliverops.com',
            'password' => 'AdminPassword2026!',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'roles'],
                'permissions',
            ]);

        $this->assertContains('users.create', $response->json('permissions'));
    }

    public function test_admin_can_list_users(): void
    {
        $admin = User::where('email', 'admin@deliverops.com')->first();

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email', 'department', 'weeklyCapacityHours', 'roles'],
                ],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_user(): void
    {
        $admin = User::where('email', 'admin@deliverops.com')->first();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/users', [
            'name' => 'John Doe',
            'email' => 'john.doe@deliverops.local',
            'password' => 'Password123!',
            'job_title' => 'Software Engineer',
            'department' => 'Engineering',
            'skills' => ['Laravel', 'React'],
            'weekly_capacity_hours' => 40,
            'status' => 'active',
            'color' => '#10b981',
            'roles' => ['contributor'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'John Doe')
            ->assertJsonPath('data.roles.0', 'contributor');

        $this->assertDatabaseHas('users', [
            'email' => 'john.doe@deliverops.local',
        ]);
    }

    public function test_non_admin_cannot_assign_admin_role_privilege_escalation(): void
    {
        // Contributor user tries to create an Admin
        $contributor = User::factory()->create([
            'default_organization_id' => '01HZX000000000000000000000',
        ]);
        setPermissionsTeamId('01HZX000000000000000000000');
        $contributor->assignRole('contributor');

        $response = $this->actingAs($contributor, 'sanctum')->postJson('/api/v1/users', [
            'name' => 'Hacker Admin',
            'email' => 'hacker@deliverops.local',
            'password' => 'Password123!',
            'job_title' => 'Hacker',
            'department' => 'Engineering',
            'weekly_capacity_hours' => 40,
            'status' => 'active',
            'roles' => ['admin'],
        ]);

        // Policy / FormRequest blocks non-admin from creating users (403)
        $response->assertStatus(403);
    }

    public function test_admin_cannot_delete_themselves(): void
    {
        $admin = User::where('email', 'admin@deliverops.com')->first();

        $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/users/{$admin->id}");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['user']);
    }

    public function test_cannot_delete_last_active_admin(): void
    {
        $admin = User::where('email', 'admin@deliverops.com')->first();

        // Create temporary second admin so we can test attempting to delete the last one
        $tempAdmin = User::create([
            'name' => 'Temp Admin',
            'email' => 'temp.admin@deliverops.local',
            'password' => bcrypt('Password123!'),
            'job_title' => 'Admin 2',
            'department' => 'Executive',
            'weekly_capacity_hours' => 40,
            'status' => 'active',
            'default_organization_id' => '01HZX000000000000000000000',
        ]);
        setPermissionsTeamId('01HZX000000000000000000000');
        $tempAdmin->syncRoles(['admin']);

        // Acting as admin, delete tempAdmin -> this succeeds because admin count is 2
        $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/users/{$tempAdmin->id}");
        $response->assertStatus(200);

        // Now admin is the only active admin. Trying to delete admin should fail
        $response2 = $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/users/{$admin->id}");
        $response2->assertStatus(422);
    }

    public function test_roles_and_permissions_can_be_retrieved(): void
    {
        $admin = User::where('email', 'admin@deliverops.com')->first();

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/roles');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'displayName', 'isSystem', 'permissions'],
                ],
            ]);

        $permResponse = $this->actingAs($admin, 'sanctum')->getJson('/api/v1/permissions');
        $permResponse->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['users', 'roles', 'projects', 'tasks'],
            ]);
    }

    public function test_protected_system_role_cannot_be_deleted(): void
    {
        $admin = User::where('email', 'admin@deliverops.com')->first();
        $adminRole = Role::where('name', 'admin')->first();

        $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/roles/{$adminRole->id}");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }
}

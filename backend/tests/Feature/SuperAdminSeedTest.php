<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminSeedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
        $this->seed(UserSeeder::class);
        setPermissionsTeamId('01HZX000000000000000000000');
    }

    public function test_super_admin_is_seeded_with_correct_credentials(): void
    {
        $superAdmin = User::where('email', 'admin@admin.com')->first();
        $this->assertNotNull($superAdmin);
        $this->assertEquals('Super Administrator', $superAdmin->name);
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('123456', $superAdmin->password));
    }

    public function test_super_admin_can_login_with_provided_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@admin.com',
            'password' => '123456',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'roles'],
                'permissions',
            ]);

        $this->assertTrue(in_array('admin', $response->json('user.roles')));
    }

    public function test_permissions_endpoint_returns_deliverops_modules_hierarchy(): void
    {
        $superAdmin = User::where('email', 'admin@admin.com')->first();

        $response = $this->actingAs($superAdmin, 'sanctum')->getJson('/api/v1/permissions');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'total_count',
                'modules' => [
                    '*' => [
                        'key',
                        'name',
                        'icon',
                        'subjects_count',
                        'permissions_count',
                        'subjects' => [
                            '*' => [
                                'name',
                                'permissions' => [
                                    '*' => ['id', 'name', 'description', 'label'],
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $moduleNames = collect($response->json('modules'))->pluck('name')->toArray();
        $this->assertContains('Projects & Scheduling', $moduleNames);
        $this->assertContains('Tasks & WBS', $moduleNames);
        $this->assertContains('Financials & Invoicing', $moduleNames);
        $this->assertContains('Compliance & Security', $moduleNames);
    }
}

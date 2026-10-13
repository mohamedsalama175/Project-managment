<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_status_reports_uninstalled_when_no_admin_or_users(): void
    {
        $response = $this->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJson([
                'installed' => false,
                'admin_exists' => false,
            ]);
    }

    public function test_system_status_reports_installed_after_database_seed(): void
    {
        $this->artisan('deliverops:install');

        $response = $this->getJson('/api/v1/system/status');

        $response->assertStatus(200)
            ->assertJson([
                'installed' => true,
                'admin_exists' => true,
            ]);
    }
}

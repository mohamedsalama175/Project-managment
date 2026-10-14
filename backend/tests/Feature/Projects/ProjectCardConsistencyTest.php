<?php

namespace Tests\Feature\Projects;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class ProjectCardConsistencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        (new \App\Modules\System\Services\InstallationOrchestrator())->install([]);
        setPermissionsTeamId('01HZX000000000000000000000');
        $org = \App\Modules\Tenancy\Models\Organization::where('id', '01HZX000000000000000000000')->first();
        if ($org) {
            app(\App\Modules\Tenancy\Services\TenantManager::class)->setTenant($org);
        }
    }

    public function test_project_listing_logs_warning_when_progress_positive_but_completed_tasks_zero(): void
    {
        $admin = User::where('email', 'admin@deliverops.com')->first();

        // Create project with progress_pct > 0 but no completed tasks
        $project = Project::factory()->create([
            'organization_id' => '01HZX000000000000000000000',
            'code' => 'TEST-01',
            'name' => 'Inconsistent Project',
        ]);

        Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'In Progress',
            'pct' => 45,
        ]);

        Log::shouldReceive('warning')
            ->once()
            ->withArgs(function ($message) use ($project) {
                return str_contains($message, "Project {$project->id}") &&
                       str_contains($message, '0 completed tasks');
            });

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/projects');

        $response->assertOk();
    }

    public function test_project_listing_does_not_warn_when_tasks_are_completed(): void
    {
        $admin = User::where('email', 'admin@deliverops.com')->first();

        $project = Project::factory()->create([
            'organization_id' => '01HZX000000000000000000000',
            'code' => 'TEST-02',
            'name' => 'Consistent Project',
        ]);

        Task::factory()->create([
            'project_id' => $project->id,
            'status' => 'Completed',
            'pct' => 100,
        ]);

        Log::shouldReceive('warning')->never();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/projects');

        $response->assertOk();
    }
}

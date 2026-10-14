<?php

namespace Tests\Unit\Models;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_project_can_be_created_with_factory(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner();

        $project = Project::create([
            'organization_id' => $org->id,
            'name' => 'Mission Alpha System',
            'code' => 'MAS-01',
            'project_manager_id' => $owner->id,
            'budget_amount' => 50000.00,
        ]);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'name' => 'Mission Alpha System',
            'code' => 'MAS-01',
        ]);
        $this->assertEquals($org->id, $project->organization_id);
    }

    public function test_project_progress_pct_calculates_average_from_tasks(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner();
        app(\App\Modules\Tenancy\Services\TenantManager::class)->setTenant($org);

        $project = Project::create([
            'organization_id' => $org->id,
            'name' => 'Progress Test Project',
            'code' => 'PTP-01',
        ]);

        $this->assertEquals(0, $project->progress_pct);

        Task::create([
            'project_id' => $project->id,
            'organization_id' => $org->id,
            'name' => 'Task 1',
            'pct' => 50,
            'category' => 'Engineering',
            'priority' => 'Medium',
            'status' => 'In Progress',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
        ]);

        Task::create([
            'project_id' => $project->id,
            'organization_id' => $org->id,
            'name' => 'Task 2',
            'pct' => 100,
            'category' => 'Engineering',
            'priority' => 'Medium',
            'status' => 'Completed',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
        ]);

        $project->refresh();
        $this->assertEquals(75, $project->progress_pct);
    }

    public function test_project_soft_deletes(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner();
        app(\App\Modules\Tenancy\Services\TenantManager::class)->setTenant($org);

        $project = Project::create([
            'organization_id' => $org->id,
            'name' => 'Soft Delete Project',
            'code' => 'SDP-01',
        ]);

        $projectId = $project->id;
        $project->delete();

        $this->assertSoftDeleted('projects', ['id' => $projectId]);
        $this->assertNull(Project::find($projectId));
        $this->assertNotNull(Project::withTrashed()->find($projectId));
    }

    public function test_project_members_relationship(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner();
        app(\App\Modules\Tenancy\Services\TenantManager::class)->setTenant($org);
        $member = $this->addMemberToOrganization($org);

        $project = Project::create([
            'organization_id' => $org->id,
            'name' => 'Membership Project',
            'code' => 'MBR-01',
        ]);

        $project->members()->attach($member->id, [
            'project_role' => 'lead_developer',
            'cost_rate' => 75.00,
            'billable_rate' => 120.00,
            'billable_currency' => 'USD',
        ]);

        $this->assertTrue($project->members->contains($member));
        $this->assertEquals('lead_developer', $project->members->first()->pivot->project_role);
    }

    public function test_project_exclude_samples_scope(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner();
        app(\App\Modules\Tenancy\Services\TenantManager::class)->setTenant($org);

        Project::create([
            'organization_id' => $org->id,
            'name' => 'Real Project',
            'code' => 'RLP-01',
            'is_sample' => false,
        ]);

        Project::create([
            'organization_id' => $org->id,
            'name' => 'Sample Template',
            'code' => 'SMP-01',
            'is_sample' => true,
        ]);

        $scoped = Project::excludeSamples()->get();
        $this->assertTrue($scoped->contains('name', 'Real Project'));
        $this->assertFalse($scoped->contains('name', 'Sample Template'));
    }
}

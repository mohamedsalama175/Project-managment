<?php

namespace Tests\Feature\Projects;

use App\Models\Project;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $admin;
    protected User $member;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        [$this->org, $this->admin] = $this->createOrganizationWithOwner();
        $this->member = $this->addMemberToOrganization($this->org, 'field_engineer');

        app(TenantManager::class)->setTenant($this->org);
    }

    public function test_admin_can_list_projects(): void
    {
        Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Project One',
            'code' => 'P1-001',
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->withTenantHeader($this->org)
            ->getJson('/api/v1/projects');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
        $this->assertCount(1, $response->json('data'));
    }

    public function test_admin_can_create_project_with_valid_data(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->withTenantHeader($this->org)
            ->postJson('/api/v1/projects', [
                'name' => 'Solar Substation Installation',
                'code' => 'SSI-2026',
                'description' => 'Grid-scale PV plant installation',
                'client_name' => 'National Electric Co',
                'project_type' => 'client',
                'project_manager_id' => $this->admin->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Solar Substation Installation')
            ->assertJsonPath('data.code', 'SSI-2026');

        $this->assertDatabaseHas('projects', [
            'name' => 'Solar Substation Installation',
            'code' => 'SSI-2026',
            'organization_id' => $this->org->id,
        ]);
    }

    public function test_create_project_validates_required_fields(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->withTenantHeader($this->org)
            ->postJson('/api/v1/projects', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_admin_can_show_project_details(): void
    {
        $project = Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Detailed Project',
            'code' => 'DP-001',
            'project_manager_id' => $this->admin->id,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->withTenantHeader($this->org)
            ->getJson("/api/v1/projects/{$project->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $project->id)
            ->assertJsonPath('data.name', 'Detailed Project');
    }

    public function test_admin_can_update_project(): void
    {
        $project = Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Old Project Name',
            'code' => 'OPN-01',
            'project_manager_id' => $this->admin->id,
        ]);

        Sanctum::actingAs($this->admin);

        $response = $this->withTenantHeader($this->org)
            ->putJson("/api/v1/projects/{$project->id}", [
                'name' => 'New Project Name',
                'description' => 'Updated project scope',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'New Project Name');

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'name' => 'New Project Name',
        ]);
    }

    public function test_admin_can_archive_and_restore_project(): void
    {
        $project = Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Archivable Project',
            'code' => 'AP-01',
            'project_manager_id' => $this->admin->id,
        ]);

        Sanctum::actingAs($this->admin);

        // Archive
        $deleteRes = $this->withTenantHeader($this->org)
            ->deleteJson("/api/v1/projects/{$project->id}");

        $deleteRes->assertStatus(200);
        $project->refresh();
        $this->assertTrue($project->is_archived);

        // Restore
        $restoreRes = $this->withTenantHeader($this->org)
            ->postJson("/api/v1/projects/{$project->id}/restore");

        $restoreRes->assertStatus(200);
        $project->refresh();
        $this->assertFalse($project->is_archived);
    }

    public function test_admin_can_add_and_remove_project_member(): void
    {
        $project = Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Team Project',
            'code' => 'TP-01',
            'project_manager_id' => $this->admin->id,
        ]);

        Sanctum::actingAs($this->admin);

        // Add member
        $addRes = $this->withTenantHeader($this->org)
            ->postJson("/api/v1/projects/{$project->id}/members", [
                'user_id' => $this->member->id,
                'project_role' => 'contributor',
            ]);

        $addRes->assertStatus(200);
        $this->assertTrue($project->fresh()->members->contains($this->member));

        // Remove member
        $removeRes = $this->withTenantHeader($this->org)
            ->deleteJson("/api/v1/projects/{$project->id}/members/{$this->member->id}");

        $removeRes->assertStatus(200);
        $this->assertFalse($project->fresh()->members->contains($this->member));
    }
}

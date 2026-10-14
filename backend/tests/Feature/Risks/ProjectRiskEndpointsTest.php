<?php

namespace Tests\Feature\Risks;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectRiskEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $admin;
    protected Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        [$this->org, $this->admin] = $this->createOrganizationWithOwner();
        app(TenantManager::class)->setTenant($this->org);

        $this->project = Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Tunnel Excavation Project',
            'code' => 'TEP-01',
            'project_manager_id' => $this->admin->id,
        ]);
    }

    public function test_can_list_project_risks(): void
    {
        ProjectRisk::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'title' => 'Groundwater Infiltration',
            'description' => 'Water seepage in trench',
            'type' => 'risk',
            'severity' => 'high',
            'likelihood' => 'medium',
            'impact' => 'high',
            'status' => 'open',
            'identified_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
            'mitigation_plan' => 'Install deep well dewatering system',
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->getJson("/api/v1/projects/{$this->project->id}/risks");

        $res->assertStatus(200)
            ->assertJsonStructure(['data']);
        $this->assertCount(1, $res->json('data'));
    }

    public function test_can_create_risk_with_valid_data(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->postJson("/api/v1/projects/{$this->project->id}/risks", [
                'title' => 'Structural Fault Encounter',
                'description' => 'Fault line intersecting bore alignment',
                'type' => 'risk',
                'severity' => 'critical',
                'likelihood' => 'high',
                'status' => 'investigating',
                'mitigation_plan' => 'Grout reinforcement before advancement',
                'owner_id' => $this->admin->id,
            ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.title', 'Structural Fault Encounter')
            ->assertJsonPath('data.severity', 'critical');

        $this->assertDatabaseHas('project_risks', [
            'project_id' => $this->project->id,
            'title' => 'Structural Fault Encounter',
            'severity' => 'critical',
        ]);
    }

    public function test_create_risk_validates_required_fields(): void
    {
        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->postJson("/api/v1/projects/{$this->project->id}/risks", [
                'description' => 'Missing title and type',
            ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'type', 'severity']);
    }

    public function test_can_show_and_update_risk(): void
    {
        $risk = ProjectRisk::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'title' => 'Ventilation Fan Failure',
            'description' => 'Motor overload tripped',
            'type' => 'issue',
            'severity' => 'medium',
            'impact' => 'medium',
            'status' => 'open',
            'identified_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'mitigation_plan' => 'Order replacement motor',
        ]);

        Sanctum::actingAs($this->admin);

        // Show
        $showRes = $this->withTenantHeader($this->org)
            ->getJson("/api/v1/projects/{$this->project->id}/risks/{$risk->id}");

        $showRes->assertStatus(200)
            ->assertJsonPath('data.id', $risk->id);

        // Update
        $updateRes = $this->withTenantHeader($this->org)
            ->putJson("/api/v1/projects/{$this->project->id}/risks/{$risk->id}", [
                'status' => 'resolved',
                'severity' => 'low',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.status', 'resolved');

        $this->assertEquals('resolved', $risk->fresh()->status);
    }

    public function test_can_delete_risk(): void
    {
        $risk = ProjectRisk::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'title' => 'Noise Complaint',
            'description' => 'Excess noise during night drilling',
            'type' => 'risk',
            'severity' => 'low',
            'impact' => 'low',
            'status' => 'closed',
            'identified_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'mitigation_plan' => 'Acoustic barriers',
        ]);

        Sanctum::actingAs($this->admin);

        $res = $this->withTenantHeader($this->org)
            ->deleteJson("/api/v1/projects/{$this->project->id}/risks/{$risk->id}");

        $res->assertStatus(200);
        $this->assertSoftDeleted('project_risks', ['id' => $risk->id]);
    }
}

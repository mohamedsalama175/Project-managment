<?php

namespace Tests\Unit\Models;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectRiskTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $owner;
    protected Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        [$this->org, $this->owner] = $this->createOrganizationWithOwner();
        app(TenantManager::class)->setTenant($this->org);

        $this->project = Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Risk Test Project',
            'code' => 'RTP-01',
        ]);
    }

    public function test_can_create_project_risk(): void
    {
        $risk = ProjectRisk::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'title' => 'Supply Chain Delay',
            'description' => 'Chipset delivery delayed by 4 weeks',
            'type' => 'risk',
            'severity' => 'critical',
            'likelihood' => 'high',
            'impact' => 'critical',
            'status' => 'open',
            'owner_id' => $this->owner->id,
            'mitigation_plan' => 'Procure secondary vendor allocation',
            'identified_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
        ]);

        $this->assertDatabaseHas('project_risks', [
            'id' => $risk->id,
            'title' => 'Supply Chain Delay',
            'severity' => 'critical',
            'status' => 'open',
        ]);
        $this->assertEquals($this->owner->id, $risk->owner->id);
        $this->assertEquals($this->project->id, $risk->project->id);
    }

    public function test_risk_casts_attributes(): void
    {
        $risk = ProjectRisk::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'title' => 'Casting Risk',
            'description' => 'Casting test description',
            'type' => 'issue',
            'severity' => 'medium',
            'likelihood' => 'medium',
            'impact' => 'medium',
            'status' => 'mitigated',
            'mitigation_plan' => 'Regular testing',
            'identified_date' => '2026-10-01',
            'due_date' => '2026-10-31',
            'resolved_at' => now(),
            'lock_version' => 2,
        ]);

        $this->assertInstanceOf(\Carbon\CarbonInterface::class, $risk->identified_date);
        $this->assertInstanceOf(\Carbon\CarbonInterface::class, $risk->due_date);
        $this->assertInstanceOf(\Carbon\CarbonInterface::class, $risk->resolved_at);
        $this->assertIsInt($risk->lock_version);
        $this->assertEquals(2, $risk->lock_version);
    }

    public function test_risk_can_block_tasks(): void
    {
        $risk = ProjectRisk::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'title' => 'Critical Blocker Risk',
            'description' => 'Blocker description',
            'type' => 'blocker',
            'severity' => 'critical',
            'likelihood' => 'high',
            'impact' => 'critical',
            'status' => 'open',
            'mitigation_plan' => 'Emergency triage',
            'identified_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
        ]);

        $task = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Blocked Assembly Task',
            'status' => 'Blocked',
            'blocking_risk_id' => $risk->id,
        ]);

        $this->assertTrue($risk->blockedTasks->contains($task));
        $this->assertEquals($risk->id, $task->blockingRisk->id);
    }

    public function test_risk_soft_deletes(): void
    {
        $risk = ProjectRisk::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'title' => 'Deleted Risk',
            'description' => 'To be deleted',
            'type' => 'risk',
            'severity' => 'low',
            'likelihood' => 'low',
            'impact' => 'low',
            'status' => 'closed',
            'mitigation_plan' => 'None needed',
            'identified_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
        ]);

        $riskId = $risk->id;
        $risk->delete();

        $this->assertSoftDeleted('project_risks', ['id' => $riskId]);
        $this->assertNull(ProjectRisk::find($riskId));
        $this->assertNotNull(ProjectRisk::withTrashed()->find($riskId));
    }
}

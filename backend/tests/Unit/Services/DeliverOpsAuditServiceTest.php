<?php

namespace Tests\Unit\Services;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use App\Services\DeliverOpsAuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliverOpsAuditServiceTest extends TestCase
{
    use RefreshDatabase;

    protected DeliverOpsAuditService $auditService;
    protected Organization $org;
    protected User $owner;
    protected Project $project;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->auditService = app(DeliverOpsAuditService::class);
        [$this->org, $this->owner] = $this->createOrganizationWithOwner();
        app(TenantManager::class)->setTenant($this->org);

        $this->project = Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Service Audit Project',
            'code' => 'SAP-01',
        ]);
    }

    public function test_service_logs_project_mutation(): void
    {
        $log = $this->auditService->log(
            entity: $this->project,
            action: 'project_updated',
            actor: $this->owner,
            fieldName: 'budget_amount',
            oldValue: ['budget_amount' => 10000],
            newValue: ['budget_amount' => 25000],
            reason: 'Budget revision approved'
        );

        $this->assertInstanceOf(AuditLog::class, $log);
        $this->assertEquals('Project', $log->entity_type);
        $this->assertEquals($this->project->id, $log->entity_id);
        $this->assertEquals($this->project->id, $log->project_id);
        $this->assertNull($log->task_id);
        $this->assertEquals($this->owner->id, $log->actor_id);
        $this->assertEquals('project_updated', $log->action);
        $this->assertEquals('budget_amount', $log->field_name);
        $this->assertEquals('Budget revision approved', $log->reason);
    }

    public function test_service_logs_task_mutation_with_project_and_task_id(): void
    {
        $task = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Audited Task',
            'status' => 'In Progress',
        ]);

        $log = $this->auditService->log(
            entity: $task,
            action: 'task_status_changed',
            actor: $this->owner,
            fieldName: 'status',
            oldValue: ['status' => 'In Progress'],
            newValue: ['status' => 'Completed'],
            reason: 'Task deliverables verified'
        );

        $this->assertEquals('Task', $log->entity_type);
        $this->assertEquals($task->id, $log->entity_id);
        $this->assertEquals($this->project->id, $log->project_id);
        $this->assertEquals($task->id, $log->task_id);
        $this->assertEquals('Completed', $log->new_value['status']);
    }

    public function test_service_logs_without_actor_defaults_to_system(): void
    {
        $log = $this->auditService->log(
            entity: $this->project,
            action: 'system_recalculation',
            actor: null,
            reason: 'Cron task ran critical path recalculation'
        );

        $this->assertNull($log->actor_id);
        $this->assertEquals('Unauthenticated / System', $log->actor_name);
        $this->assertEquals('system', $log->actor_role);
    }
}

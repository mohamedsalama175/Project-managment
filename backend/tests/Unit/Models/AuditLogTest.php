<?php

namespace Tests\Unit\Models;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
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
            'name' => 'Audit Project',
            'code' => 'AUD-01',
        ]);
    }

    public function test_audit_log_can_be_created_and_casts_json(): void
    {
        $log = AuditLog::create([
            'organization_id' => $this->org->id,
            'project_id' => $this->project->id,
            'entity_type' => 'App\Models\Project',
            'entity_id' => $this->project->id,
            'actor_id' => $this->owner->id,
            'actor_name' => $this->owner->name,
            'actor_role' => 'admin',
            'action' => 'project.updated',
            'field_name' => 'status',
            'old_value' => ['status' => 'Planning'],
            'new_value' => ['status' => 'In Progress'],
            'reason' => 'Sprint kickoff',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit/10.0',
            'created_at' => now(),
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'id' => $log->id,
            'action' => 'project.updated',
        ]);
        $this->assertIsArray($log->old_value);
        $this->assertEquals('Planning', $log->old_value['status']);
        $this->assertEquals('In Progress', $log->new_value['status']);
        $this->assertEquals($this->owner->id, $log->actor->id);
        $this->assertEquals($this->project->id, $log->project->id);
    }

    public function test_audit_logs_are_immutable_and_cannot_be_updated(): void
    {
        $log = AuditLog::create([
            'organization_id' => $this->org->id,
            'entity_type' => 'App\Models\Project',
            'entity_id' => $this->project->id,
            'actor_id' => $this->owner->id,
            'actor_name' => $this->owner->name,
            'actor_role' => 'admin',
            'action' => 'project.created',
            'created_at' => now(),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Audit logs are strictly append-only');

        $log->update(['reason' => 'Attempted tamper']);
    }

    public function test_audit_logs_cannot_be_deleted(): void
    {
        $log = AuditLog::create([
            'organization_id' => $this->org->id,
            'entity_type' => 'App\Models\Project',
            'entity_id' => $this->project->id,
            'actor_id' => $this->owner->id,
            'actor_name' => $this->owner->name,
            'actor_role' => 'admin',
            'action' => 'project.created',
            'created_at' => now(),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Audit logs are immutable records and cannot be deleted');

        $log->delete();
    }
}

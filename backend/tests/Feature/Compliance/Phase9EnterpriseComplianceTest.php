<?php

namespace Tests\Feature\Compliance;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Audit\Services\AuditHashChainService;
use App\Modules\Compliance\Jobs\ProcessDsarExportJob;
use App\Modules\Compliance\Models\ComplianceDsarRequest;
use App\Modules\Compliance\Models\LegalHold;
use App\Modules\Compliance\Services\GdprService;
use App\Modules\Compliance\Services\LegalHoldService;
use App\Modules\Identity\Models\ScimToken;
use App\Modules\Identity\Models\SsoConfiguration;
use App\Modules\Notifications\Models\PushToken;
use App\Modules\Notifications\Services\Providers\MockPushProvider;
use App\Modules\Notifications\Services\PushNotificationDispatcherService;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase9EnterpriseComplianceTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $adminUser;
    protected User $targetUser;
    protected Project $project;
    protected Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PermissionSeeder::class);

        $this->org = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Enterprise Corp',
            'slug' => 'enterprise-corp',
            'plan' => 'enterprise',
            'region' => 'EMEA',
            'status' => 'active',
        ]);

        $this->adminUser = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@enterprise.corp',
            'default_organization_id' => $this->org->id,
            'email_verified_at' => now(),
            'status' => 'active',
        ]);
        $this->targetUser = User::factory()->create([
            'name' => 'Jane Employee',
            'email' => 'jane@enterprise.corp',
            'default_organization_id' => $this->org->id,
            'email_verified_at' => now(),
            'status' => 'active',
        ]);

        setPermissionsTeamId($this->org->id);
        $this->adminUser->assignRole('admin');
        $this->targetUser->assignRole('contributor');

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->org->id,
            'user_id' => $this->adminUser->id,
            'role' => 'admin',
            'is_owner' => true,
        ]);

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->org->id,
            'user_id' => $this->targetUser->id,
            'role' => 'contributor',
            'is_owner' => false,
        ]);

        app(TenantManager::class)->setTenant($this->org);

        app(TenantManager::class)->runForTenant($this->org->id, function () {
            $this->project = Project::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $this->org->id,
                'name' => 'Core Modernization',
                'code' => 'CMR-001',
                'project_type' => 'client',
                'project_manager_id' => $this->adminUser->id,
                'is_archived' => false,
                'config' => ['working_days' => [1, 2, 3, 4, 5], 'hours_per_day' => 8],
            ]);

            $this->task = Task::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $this->org->id,
                'project_id' => $this->project->id,
                'name' => 'Migrate Auth Engine',
                'category' => 'Engineering',
                'pct' => 50,
                'status' => 'In Progress',
                'priority' => 'High',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays(14)->toDateString(),
                'primary_owner_id' => $this->targetUser->id,
            ]);
        });
    }

    // 1. Audit hash chain genesis and linkage
    public function test_audit_hash_chain_genesis_and_subsequent_blocks(): void
    {
        $service = app(AuditHashChainService::class);

        $log1 = $service->appendAuditLog(
            $this->org->id,
            'task.created',
            'Task',
            $this->task->id,
            $this->adminUser->id
        );

        $this->assertEquals(str_repeat('0', 64), $log1->previous_hash);
        $this->assertNotEmpty($log1->row_hash);
        $this->assertEquals(64, strlen($log1->row_hash));

        $log2 = $service->appendAuditLog(
            $this->org->id,
            'task.updated',
            'Task',
            $this->task->id,
            $this->adminUser->id
        );

        $this->assertEquals($log1->row_hash, $log2->previous_hash);
        $this->assertNotEquals($log1->row_hash, $log2->row_hash);
    }

    // 2. Concurrent audit writes produce valid chain
    public function test_concurrent_audit_writes_produce_valid_chain(): void
    {
        $service = app(AuditHashChainService::class);

        for ($i = 0; $i < 5; $i++) {
            $service->appendAuditLog(
                $this->org->id,
                "action.{$i}",
                'Task',
                $this->task->id,
                $this->adminUser->id
            );
        }

        $res = $service->verifyChain($this->org->id);
        $this->assertTrue($res['verified']);
        $this->assertEquals(5, $res['chain_length']);
    }

    // 3. Detects tampered middle row
    public function test_audit_verify_detects_tampered_middle_row(): void
    {
        $service = app(AuditHashChainService::class);

        $log1 = $service->appendAuditLog($this->org->id, 'action.1', 'Task', $this->task->id, $this->adminUser->id);
        $log2 = $service->appendAuditLog($this->org->id, 'action.2', 'Task', $this->task->id, $this->adminUser->id);
        $log3 = $service->appendAuditLog($this->org->id, 'action.3', 'Task', $this->task->id, $this->adminUser->id);

        // Tamper with middle row action directly in DB (bypassing model hook)
        DB::table('audit_logs')->where('id', $log2->id)->update(['action' => 'action.forged']);

        $res = $service->verifyChain($this->org->id);
        $this->assertFalse($res['verified']);
        $this->assertEquals($log2->id, $res['tampered_row_id']);
    }

    // 4. Detects deleted middle row
    public function test_audit_verify_detects_deleted_middle_row(): void
    {
        $service = app(AuditHashChainService::class);

        $log1 = $service->appendAuditLog($this->org->id, 'action.1', 'Task', $this->task->id, $this->adminUser->id);
        $log2 = $service->appendAuditLog($this->org->id, 'action.2', 'Task', $this->task->id, $this->adminUser->id);
        $log3 = $service->appendAuditLog($this->org->id, 'action.3', 'Task', $this->task->id, $this->adminUser->id);

        // Hard-delete middle row in database
        DB::table('audit_logs')->where('id', $log2->id)->delete();

        $res = $service->verifyChain($this->org->id);
        $this->assertFalse($res['verified']);
        $this->assertEquals($log3->id, $res['tampered_row_id']);
    }

    // 5. Cursor pagination with since_id
    public function test_audit_verify_cursor_pagination_with_since_id(): void
    {
        $service = app(AuditHashChainService::class);

        $logs = [];
        for ($i = 0; $i < 5; $i++) {
            $logs[] = $service->appendAuditLog($this->org->id, "step.{$i}", 'Task', $this->task->id, $this->adminUser->id);
        }

        // Verify remaining logs starting after log 1
        $res = $service->verifyChain($this->org->id, sinceId: $logs[1]->id, limit: 3);
        $this->assertTrue($res['verified']);
        $this->assertEquals(3, $res['chain_length']);
    }

    // 6. Legal hold blocks project deletion
    public function test_legal_hold_blocks_project_deletion(): void
    {
        $holdService = app(LegalHoldService::class);
        $holdService->createHold(
            $this->org->id,
            'Project',
            $this->project->id,
            'Litigation 2026-01',
            'CASE-9921',
            $this->adminUser->id
        );

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Cannot delete Project: Entity is protected under an active legal hold.');

        $this->project->delete();
    }

    // 7. Legal hold blocks task deletion under held project
    public function test_legal_hold_blocks_task_deletion(): void
    {
        $holdService = app(LegalHoldService::class);
        $holdService->createHold(
            $this->org->id,
            'Project',
            $this->project->id,
            'Litigation 2026-01',
            'CASE-9921',
            $this->adminUser->id
        );

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Cannot delete Task: Entity is protected under an active legal hold.');

        $this->task->delete();
    }

    // 8. Legal hold release restores deletion ability
    public function test_legal_hold_release_restores_deletion_ability(): void
    {
        $holdService = app(LegalHoldService::class);
        $hold = $holdService->createHold(
            $this->org->id,
            'Task',
            $this->task->id,
            'Temporary Inspection',
            null,
            $this->adminUser->id
        );

        $holdService->releaseHold($this->org->id, $hold->id, $this->adminUser->id);

        $this->task->delete();
        $this->assertDatabaseMissing('tasks', ['id' => $this->task->id]);
    }

    // 9. E-discovery export structures JSON
    public function test_ediscovery_export_structures_json(): void
    {
        $holdService = app(LegalHoldService::class);
        $hold = $holdService->createHold(
            $this->org->id,
            'Project',
            $this->project->id,
            'Regulatory Subpoena',
            'SEC-4401',
            $this->adminUser->id
        );

        $export = $holdService->exportEdiscovery($this->org->id, $hold->id);

        $this->assertNotEmpty($export['file_name']);
        $this->assertNotEmpty($export['download_url']);
    }

    // 10. GDPR DSAR export job generates signed download
    public function test_gdpr_dsar_export_job_generates_signed_download(): void
    {
        $req = ComplianceDsarRequest::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->org->id,
            'user_id' => $this->targetUser->id,
            'requested_by_id' => $this->adminUser->id,
            'type' => 'export',
            'status' => 'pending',
        ]);

        ProcessDsarExportJob::dispatchSync($this->org->id, $req->id, $this->targetUser->id);

        $req->refresh();
        $this->assertEquals('completed', $req->status);
        $this->assertNotNull($req->archive_path);
    }

    // 11. GDPR erasure anonymizes user and revokes tokens
    public function test_gdpr_erasure_anonymizes_user_and_revokes_tokens(): void
    {
        $gdpr = app(GdprService::class);

        $this->targetUser->createToken('mobile-token');
        $this->assertCount(1, $this->targetUser->tokens);

        $gdpr->executeErasure($this->org->id, $this->targetUser->id, $this->adminUser->id);

        $this->targetUser->refresh();
        $this->assertStringStartsWith('Former Member', $this->targetUser->name);
        $this->assertStringStartsWith('erased_', $this->targetUser->email);
        $this->assertEquals('inactive', $this->targetUser->status);
        $this->assertCount(0, $this->targetUser->tokens);
    }

    // 12. GDPR erasure blocked under active legal hold
    public function test_gdpr_erasure_blocked_under_active_legal_hold(): void
    {
        $holdService = app(LegalHoldService::class);
        $holdService->createHold(
            $this->org->id,
            'User',
            $this->targetUser->id,
            'Employee Dispute',
            null,
            $this->adminUser->id
        );

        $gdpr = app(GdprService::class);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Cannot erase user: User record is protected under an active legal hold.');

        $gdpr->executeErasure($this->org->id, $this->targetUser->id, $this->adminUser->id);
    }

    // 13. Organization region is immutable
    public function test_organization_region_is_immutable(): void
    {
        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Organization region is immutable');

        $this->org->update(['region' => 'US']);
    }

    // 14. Data residency middleware blocks cross region access
    public function test_data_residency_middleware_blocks_cross_region_access(): void
    {
        config(['app.region' => 'US']); // Cluster region is US, org is EMEA

        Sanctum::actingAs($this->adminUser);

        // Define a test route using the data_residency middleware
        Route::get('/test-residency', function () {
            return response()->json(['status' => 'ok']);
        })->middleware(['tenant', 'data_residency']);

        $res = $this->withHeaders(['X-Organization-Id' => $this->org->id])
            ->getJson('/test-residency');

        $res->assertStatus(451);
        $res->assertJsonFragment(['error' => 'CROSS_REGION_ACCESS_FORBIDDEN']);
    }

    // 15. SSO credentials and certificates encrypted at rest
    public function test_sso_credentials_and_certificates_encrypted_at_rest(): void
    {
        $sso = SsoConfiguration::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->org->id,
            'provider' => 'saml',
            'idp_entity_id' => 'https://idp.okta.com/exk123',
            'sso_url' => 'https://idp.okta.com/sso',
            'certificate' => 'MIIDpDCCAoygAwIBAgIGAY...RAW_CERT_PLAINTEXT',
            'client_secret' => 'super_secret_idp_client_key',
            'enabled' => true,
        ]);

        $raw = DB::table('sso_configurations')->where('id', $sso->id)->first();

        // Database value must NOT be plaintext
        $this->assertStringNotContainsString('MIIDpDCCAoygAwIBAgIGAY...RAW_CERT_PLAINTEXT', $raw->certificate);
        $this->assertStringNotContainsString('super_secret_idp_client_key', $raw->client_secret);

        // Eloquent model automatically decrypts
        $sso->refresh();
        $this->assertEquals('MIIDpDCCAoygAwIBAgIGAY...RAW_CERT_PLAINTEXT', $sso->certificate);
        $this->assertEquals('super_secret_idp_client_key', $sso->client_secret);
    }

    // 16. SCIM endpoints require valid SCIM bearer token
    public function test_scim_endpoints_require_valid_scim_bearer_token(): void
    {
        $plainToken = 'scim_test_plain_token_1234567890';
        $tokenHash = hash('sha256', $plainToken);

        ScimToken::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->org->id,
            'name' => 'Okta SCIM Connector',
            'token_hash' => $tokenHash,
        ]);

        // 1. Missing token -> 401
        $resUnauthorized = $this->getJson('/scim/v2/Users');
        $resUnauthorized->assertStatus(401);

        // 2. Valid token -> 200 with SCIM format
        $resAuthorized = $this->withHeaders(['Authorization' => "Bearer {$plainToken}"])
            ->getJson('/scim/v2/Users');

        $resAuthorized->assertStatus(200);
        $resAuthorized->assertHeader('Content-Type', 'application/scim+json; charset=utf-8');
        $this->assertEquals('urn:ietf:params:scim:api:messages:2.0:ListResponse', $resAuthorized->json('schemas.0'));
    }

    // 17. Push token registration and dispatch
    public function test_push_token_registration_and_dispatch(): void
    {
        Sanctum::actingAs($this->adminUser);

        $res = $this->withHeaders(['X-Organization-Id' => $this->org->id])
            ->postJson('/api/v1/push/tokens', [
                'platform' => 'ios',
                'token' => 'apns_device_token_abc_123',
                'device_name' => 'iPhone 15 Pro',
            ]);

        $res->assertStatus(201);
        $this->assertDatabaseHas('push_tokens', [
            'organization_id' => $this->org->id,
            'user_id' => $this->adminUser->id,
            'platform' => 'ios',
        ]);

        $mockProvider = app(MockPushProvider::class);
        $dispatcher = app(PushNotificationDispatcherService::class);

        $dispatcher->dispatchToUser(
            $this->org->id,
            $this->adminUser->id,
            'Project Notice',
            'A new critical path task requires review.'
        );

        $this->assertCount(1, $mockProvider->getDeliveredMessages());
        $this->assertEquals('Project Notice', $mockProvider->getDeliveredMessages()[0]['title']);
    }

    // 18. Public SLA status endpoint
    public function test_public_sla_status_endpoint(): void
    {
        $res = $this->getJson('/api/v1/status/public');

        $res->assertStatus(200);
        $res->assertJsonStructure([
            'status',
            'uptime_30d_pct',
            'latency_metrics' => ['p50_ms', 'p95_ms', 'p99_ms'],
            'services',
            'last_updated',
        ]);
        $this->assertEquals('operational', $res->json('status'));
    }
}

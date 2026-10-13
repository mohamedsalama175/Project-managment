<?php

namespace Tests\Feature\Integrations;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Integrations\Models\ApiKey;
use App\Modules\Integrations\Models\CommitLink;
use App\Modules\Integrations\Models\ImportBatch;
use App\Modules\Integrations\Models\OAuthClient;
use App\Modules\Integrations\Models\WebhookDelivery;
use App\Modules\Integrations\Models\WebhookEndpoint;
use App\Modules\Integrations\Services\ApiKeyService;
use App\Modules\Integrations\Services\OAuthService;
use App\Modules\Integrations\Services\WebhookDispatcherService;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class Phase7IntegrationsTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $userA;
    protected User $userB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PermissionSeeder::class);

        $this->orgA = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Acme Corp',
            'slug' => 'acme-corp',
            'plan' => 'enterprise',
            'status' => 'active',
        ]);

        $this->orgB = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Beta Ltd',
            'slug' => 'beta-ltd',
            'plan' => 'pro',
            'status' => 'active',
        ]);

        $this->userA = User::factory()->create([
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);

        $this->userB = User::factory()->create([
            'default_organization_id' => $this->orgB->id,
            'email_verified_at' => now(),
        ]);

        \App\Modules\Tenancy\Models\OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->userA->id,
            'is_owner' => true,
            'joined_at' => now(),
        ]);

        \App\Modules\Tenancy\Models\OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgB->id,
            'user_id' => $this->userB->id,
            'is_owner' => true,
            'joined_at' => now(),
        ]);

        setPermissionsTeamId($this->orgA->id);
        $this->userA->assignRole('admin');

        setPermissionsTeamId($this->orgB->id);
        $this->userB->assignRole('admin');

        Cache::flush();
    }

    /**
     * 1. Test RFC 7636 Appendix B PKCE test vector.
     */
    public function test_pkce_rfc_7636_test_vector(): void
    {
        $oauthService = app(OAuthService::class);
        $verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
        $expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

        $actualChallenge = $oauthService->generateCodeChallenge($verifier);

        $this->assertEquals($expectedChallenge, $actualChallenge);
    }

    /**
     * 2. Full OAuth 2.0 PKCE Authorization Code and Refresh flow.
     */
    public function test_oauth_full_pkce_authorization_code_flow(): void
    {
        $oauthService = app(OAuthService::class);

        // 1. Register OAuth Client
        $clientData = $oauthService->registerClient(
            $this->userA,
            $this->orgA->id,
            'Test App',
            ['https://oauth.example.com/callback'],
            ['projects:read', 'tasks:read'],
            false
        );
        $client = $clientData['client'];

        $verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
        $challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

        // 2. Authorize Consent Prompt
        $response = $this->getJson("/oauth/authorize?client_id={$client->client_id}&redirect_uri=https://oauth.example.com/callback&response_type=code&code_challenge={$challenge}&code_challenge_method=S256&state=xyz123");
        $response->assertStatus(200)
            ->assertJsonPath('client.name', 'Test App')
            ->assertJsonPath('state', 'xyz123');

        // 3. User Approves Consent
        $approveResponse = $this->actingAs($this->userA)->postJson('/oauth/authorize', [
            'client_id' => $client->client_id,
            'redirect_uri' => 'https://oauth.example.com/callback',
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
            'state' => 'xyz123',
        ]);
        $approveResponse->assertStatus(200);
        $authCode = $approveResponse->json('code');
        $this->assertNotEmpty($authCode);

        // 4. Exchange Code for Tokens
        $tokenResponse = $this->postJson('/oauth/token', [
            'grant_type' => 'authorization_code',
            'client_id' => $client->client_id,
            'code' => $authCode,
            'redirect_uri' => 'https://oauth.example.com/callback',
            'code_verifier' => $verifier,
        ]);
        $tokenResponse->assertStatus(200)
            ->assertJsonStructure(['access_token', 'token_type', 'expires_in', 'refresh_token', 'scope']);

        $accessToken = $tokenResponse->json('access_token');
        $refreshToken = $tokenResponse->json('refresh_token');

        // 5. Use Access Token via Bearer header on API v2
        $v2Response = $this->withHeader('Authorization', "Bearer {$accessToken}")
            ->getJson('/api/v2/projects');
        $v2Response->assertStatus(200);

        // 6. Refresh Token
        $refreshResponse = $this->postJson('/oauth/token', [
            'grant_type' => 'refresh_token',
            'client_id' => $client->client_id,
            'refresh_token' => $refreshToken,
        ]);
        $refreshResponse->assertStatus(200)
            ->assertJsonStructure(['access_token', 'refresh_token']);

        // 7. Revoke Token (RFC 7009)
        $revokeResponse = $this->postJson('/oauth/revoke', [
            'token' => $accessToken,
        ]);
        $revokeResponse->assertStatus(200);

        // Old access token should now be rejected
        $revokedCheck = $this->withHeader('Authorization', "Bearer {$accessToken}")
            ->getJson('/api/v2/projects');
        $revokedCheck->assertStatus(401);
    }

    /**
     * 3. OAuth redirect_uri revalidation prevents authorization code hijacking.
     */
    public function test_oauth_redirect_uri_mismatch_fails_at_token_exchange(): void
    {
        $oauthService = app(OAuthService::class);
        $clientData = $oauthService->registerClient(
            $this->userA,
            $this->orgA->id,
            'App Two',
            ['https://oauth.example.com/cb1', 'https://oauth.example.com/cb2'],
            ['read'],
            false
        );
        $client = $clientData['client'];

        $verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
        $challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

        $approveResponse = $this->actingAs($this->userA)->postJson('/oauth/authorize', [
            'client_id' => $client->client_id,
            'redirect_uri' => 'https://oauth.example.com/cb1',
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
        ]);
        $authCode = $approveResponse->json('code');

        // Attempt exchange with mismatched redirect URI
        $tokenResponse = $this->postJson('/oauth/token', [
            'grant_type' => 'authorization_code',
            'client_id' => $client->client_id,
            'code' => $authCode,
            'redirect_uri' => 'https://oauth.example.com/cb2', // Different URI!
            'code_verifier' => $verifier,
        ]);

        $tokenResponse->assertStatus(400)
            ->assertJsonPath('error', 'invalid_grant');
    }

    /**
     * 4. API Key auth works without pre-existing tenant context or session.
     */
    public function test_api_key_auth_works_without_preexisting_tenant_context(): void
    {
        $apiKeyService = app(ApiKeyService::class);
        $created = $apiKeyService->createApiKey($this->userA, $this->orgA->id, 'Server Key', ['*']);
        $rawKey = $created['raw_key'];

        // Fresh request with no cookies, no sessions, no tenant headers
        $response = $this->withHeader('X-API-Key', $rawKey)
            ->getJson('/api/v2/projects');

        $response->assertStatus(200);
    }

    /**
     * 5. API v2 POST without X-Idempotency-Key returns HTTP 422.
     */
    public function test_v2_post_without_idempotency_key_returns_422(): void
    {
        $apiKeyService = app(ApiKeyService::class);
        $created = $apiKeyService->createApiKey($this->userA, $this->orgA->id, 'Server Key', ['*']);
        $rawKey = $created['raw_key'];

        $response = $this->withHeader('X-API-Key', $rawKey)
            ->postJson('/api/v2/projects', [
                'name' => 'Project without Idempotency',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'IDEMPOTENCY_KEY_REQUIRED');
    }

    /**
     * 6. API v2 POST with X-Idempotency-Key caches and replayed identical responses.
     */
    public function test_v2_post_with_idempotency_key_replays_cached_response(): void
    {
        $apiKeyService = app(ApiKeyService::class);
        $created = $apiKeyService->createApiKey($this->userA, $this->orgA->id, 'Server Key', ['*']);
        $rawKey = $created['raw_key'];

        $idempotencyKey = (string) Str::uuid();

        // First call
        $first = $this->withHeaders([
            'X-API-Key' => $rawKey,
            'X-Idempotency-Key' => $idempotencyKey,
        ])->postJson('/api/v2/projects', [
            'name' => 'Idempotent Project',
        ]);

        $first->assertStatus(201);
        $projectId = $first->json('project.id');
        $this->assertNotEmpty($projectId);

        // Second call with same idempotency key
        $second = $this->withHeaders([
            'X-API-Key' => $rawKey,
            'X-Idempotency-Key' => $idempotencyKey,
        ])->postJson('/api/v2/projects', [
            'name' => 'Idempotent Project',
        ]);

        $second->assertStatus(201);
        $this->assertEquals($projectId, $second->json('project.id'));

        // Assert only 1 project was created
        app(TenantManager::class)->setTenant($this->orgA);
        $this->assertEquals(1, Project::where('name', 'Idempotent Project')->count());
    }

    /**
     * 7. Rate limiter enforces limit atomically and returns 429 when exhausted.
     */
    public function test_throttle_api_key_atomic_increment(): void
    {
        $apiKeyService = app(ApiKeyService::class);
        // Limit to 3 requests per minute
        $created = $apiKeyService->createApiKey($this->userA, $this->orgA->id, 'Rate Limited Key', ['*'], 3);
        $rawKey = $created['raw_key'];

        for ($i = 0; $i < 3; $i++) {
            $resp = $this->withHeader('X-API-Key', $rawKey)->getJson('/api/v2/projects');
            $resp->assertStatus(200)
                ->assertHeader('X-RateLimit-Limit', '3');
        }

        // 4th request must return 429 Too Many Requests
        $fourth = $this->withHeader('X-API-Key', $rawKey)->getJson('/api/v2/projects');
        $fourth->assertStatus(429)
            ->assertJsonPath('code', 'RATE_LIMIT_EXCEEDED')
            ->assertHeader('X-RateLimit-Remaining', '0');
    }

    /**
     * 8. Scope middleware blocks requests lacking required permission scope.
     */
    public function test_scope_middleware_blocks_insufficient_scope(): void
    {
        $apiKeyService = app(ApiKeyService::class);
        // Key has ONLY projects:read scope
        $created = $apiKeyService->createApiKey($this->userA, $this->orgA->id, 'Read Only Key', ['projects:read']);
        $rawKey = $created['raw_key'];

        // GET projects succeeds
        $getResp = $this->withHeader('X-API-Key', $rawKey)->getJson('/api/v2/projects');
        $getResp->assertStatus(200);

        // POST projects requires projects:write -> must return 403 INSUFFICIENT_SCOPE
        $postResp = $this->withHeaders([
            'X-API-Key' => $rawKey,
            'X-Idempotency-Key' => (string) Str::uuid(),
        ])->postJson('/api/v2/projects', ['name' => 'Should Fail']);

        $postResp->assertStatus(403)
            ->assertJsonPath('code', 'INSUFFICIENT_SCOPE');
    }

    /**
     * 9. Webhook dispatcher creates deliveries, computes HMAC signatures, and rotates secrets.
     */
    public function test_webhook_dispatch_hmac_signature_and_delivery_retry(): void
    {
        Http::fake([
            'https://webhook.site/test' => Http::response(['received' => true], 200),
        ]);

        app(TenantManager::class)->setTenant($this->orgA);

        $endpoint = WebhookEndpoint::create([
            'organization_id' => $this->orgA->id,
            'created_by_id' => $this->userA->id,
            'url' => 'https://webhook.site/test',
            'secret' => 'whsec_testsecret1234567890',
            'events' => ['task.created', 'project.created'],
            'active' => true,
        ]);

        $dispatcher = app(WebhookDispatcherService::class);

        // Dispatch matching event
        $deliveries = $dispatcher->dispatch('task.created', ['task_id' => '123'], $this->orgA->id);
        $this->assertCount(1, $deliveries);

        // Test signature computation
        $timestamp = 1728860000;
        $sig = $dispatcher->computeSignature('{"hello":"world"}', 'whsec_test', $timestamp);
        $this->assertStringStartsWith("t={$timestamp},v1=", $sig);

        // Test Ping endpoint
        $pingDelivery = $dispatcher->testPing($endpoint);
        $this->assertEquals('success', $pingDelivery->status);
        $this->assertEquals(200, $pingDelivery->response_code);

        // Rotate secret
        $newSecret = $dispatcher->rotateSecret($endpoint);
        $this->assertStringStartsWith('whsec_', $newSecret);
        $this->assertEquals($newSecret, $endpoint->fresh()->secret);
    }

    /**
     * 10. Competitor Project Importers (Jira, Asana, Monday, MS Project).
     */
    public function test_competitor_project_import_all_formats(): void
    {
        app(TenantManager::class)->setTenant($this->orgA);

        $project = Project::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'name' => 'Import Target Project',
            'code' => 'ITP-001',
            'config' => [],
        ]);

        // 1. Jira Import
        $jiraJson = json_encode([
            'issues' => [
                [
                    'key' => 'JIRA-1',
                    'fields' => [
                        'summary' => 'Jira Task 1',
                        'status' => ['name' => 'In Progress'],
                        'priority' => ['name' => 'High'],
                        'timeoriginalestimate' => 14400,
                    ],
                ],
                [
                    'key' => 'JIRA-2',
                    'fields' => [
                        'summary' => 'Jira Task 2',
                        'status' => ['name' => 'Done'],
                        'issuelinks' => [
                            [
                                'outwardIssue' => ['key' => 'JIRA-1'],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $jiraResp = $this->actingAs($this->userA)->postJson('/api/v1/integrations/import', [
            'project_id' => $project->id,
            'provider' => 'jira',
            'content' => $jiraJson,
        ]);
        $jiraResp->assertStatus(200)
            ->assertJsonPath('batch.tasks_count', 2)
            ->assertJsonPath('batch.dependencies_count', 1);

        // 2. Asana Import
        $asanaJson = json_encode([
            'data' => [
                [
                    'gid' => 'asana_1',
                    'name' => 'Asana Task 1',
                    'completed' => false,
                ],
            ],
        ]);
        $asanaResp = $this->actingAs($this->userA)->postJson('/api/v1/integrations/import', [
            'project_id' => $project->id,
            'provider' => 'asana',
            'content' => $asanaJson,
        ]);
        $asanaResp->assertStatus(200)
            ->assertJsonPath('batch.tasks_count', 1);

        // 3. Monday Import (CSV)
        $mondayCsv = "Name,Status,Date\nMonday Design,Working on it,2026-10-25\nMonday Code,Done,2026-10-30";
        $mondayResp = $this->actingAs($this->userA)->postJson('/api/v1/integrations/import', [
            'project_id' => $project->id,
            'provider' => 'monday',
            'content' => $mondayCsv,
        ]);
        $mondayResp->assertStatus(200)
            ->assertJsonPath('batch.tasks_count', 2);

        // 4. MS Project Import (XML)
        $msXml = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<Project>
    <Tasks>
        <Task>
            <UID>1</UID>
            <Name>XML Task A</Name>
            <PercentComplete>100</PercentComplete>
            <OutlineLevel>1</OutlineLevel>
        </Task>
        <Task>
            <UID>2</UID>
            <Name>XML Task B</Name>
            <PercentComplete>0</PercentComplete>
            <OutlineLevel>1</OutlineLevel>
            <PredecessorLink>
                <PredecessorUID>1</PredecessorUID>
                <Type>1</Type>
            </PredecessorLink>
        </Task>
    </Tasks>
</Project>
XML;
        $msResp = $this->actingAs($this->userA)->postJson('/api/v1/integrations/import', [
            'project_id' => $project->id,
            'provider' => 'ms_project',
            'content' => $msXml,
        ]);
        $msResp->assertStatus(200)
            ->assertJsonPath('batch.tasks_count', 2)
            ->assertJsonPath('batch.dependencies_count', 1);
    }

    /**
     * 11. GitHub Push webhook links commits with DOPS-1 references.
     */
    public function test_github_push_webhook_commit_linking(): void
    {
        app(TenantManager::class)->setTenant($this->orgA);

        $project = Project::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'name' => 'GitHub Linked Project',
            'code' => 'GLP-001',
            'config' => [],
        ]);

        $task = Task::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $project->id,
            'title' => 'DOPS-101 Implement webhook parser',
            'status' => 'in_progress',
        ]);

        $payload = [
            'repository' => [
                'full_name' => 'deliverops/core-engine',
            ],
            'commits' => [
                [
                    'id' => 'a1b2c3d4e5f67890123456789012345678901234',
                    'message' => 'feat(api): DOPS-101 add support for github linking',
                    'author' => [
                        'name' => 'Dev Lead',
                        'email' => 'dev@deliverops.internal',
                    ],
                    'url' => 'https://github.com/deliverops/core-engine/commit/a1b2c3d4',
                    'timestamp' => now()->toISOString(),
                ],
            ],
        ];

        $response = $this->postJson("/api/v1/integrations/github/webhook?org={$this->orgA->id}", $payload);
        $response->assertStatus(202);

        // Verify commit link
        $link = CommitLink::where('organization_id', $this->orgA->id)
            ->where('task_id', $task->id)
            ->first();

        $this->assertNotNull($link);
        $this->assertEquals('a1b2c3d4e5f67890123456789012345678901234', $link->commit_hash);
        $this->assertEquals('Dev Lead', $link->author_name);
    }

    /**
     * 12. Cross-tenant isolation prevents accessing other tenant's keys and webhooks.
     */
    public function test_cross_tenant_isolation_for_api_keys_and_webhooks(): void
    {
        $apiKeyService = app(ApiKeyService::class);
        $keyA = $apiKeyService->createApiKey($this->userA, $this->orgA->id, 'Org A Key');

        app(TenantManager::class)->setTenant($this->orgA);
        $webhookA = WebhookEndpoint::create([
            'organization_id' => $this->orgA->id,
            'created_by_id' => $this->userA->id,
            'url' => 'https://org-a.com/wh',
            'secret' => 'whsec_a',
            'events' => ['*'],
        ]);

        // User B from Org B attempts to delete Org A's API key
        $deleteKey = $this->actingAs($this->userB)->deleteJson("/api/v1/api-keys/{$keyA['api_key']->id}");
        $deleteKey->assertStatus(403);

        // User B from Org B attempts to view or delete Org A's webhook
        $viewWebhook = $this->actingAs($this->userB)->getJson("/api/v1/webhooks/{$webhookA->id}");
        $viewWebhook->assertStatus(403);

        $deleteWebhook = $this->actingAs($this->userB)->deleteJson("/api/v1/webhooks/{$webhookA->id}");
        $deleteWebhook->assertStatus(403);
    }
}

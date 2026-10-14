<?php

namespace Tests\Unit\Middleware;

use App\Http\Middleware\AuthenticateScimToken;
use App\Http\Middleware\EnforceDataResidency;
use App\Http\Middleware\SecurityHeadersMiddleware;
use App\Http\Middleware\TrackSlaMetrics;
use App\Modules\Identity\Models\ScimToken;
use App\Modules\Monitoring\Models\SlaMetric;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Tests\TestCase;

class MiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_security_headers_middleware_attaches_all_security_headers(): void
    {
        $middleware = new SecurityHeadersMiddleware();
        $request = Request::create('/test-endpoint', 'GET');

        $response = $middleware->handle($request, function () {
            return new Response('OK');
        });

        $this->assertEquals('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertEquals('DENY', $response->headers->get('X-Frame-Options'));
        $this->assertEquals('1; mode=block', $response->headers->get('X-XSS-Protection'));
        $this->assertEquals('strict-origin-when-cross-origin', $response->headers->get('Referrer-Policy'));
        $this->assertStringContainsString('max-age=31536000', $response->headers->get('Strict-Transport-Security'));
    }

    public function test_enforce_data_residency_allows_matching_region(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner(['region' => 'MENA']);
        $tenantManager = app(TenantManager::class);
        $tenantManager->setTenant($org);

        config(['app.region' => 'MENA']);

        $middleware = new EnforceDataResidency($tenantManager);
        $request = Request::create('/api/v1/projects', 'GET');

        $response = $middleware->handle($request, function () {
            return new Response('OK', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_enforce_data_residency_blocks_mismatched_region_with_451(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner(['region' => 'EMEA']);
        $tenantManager = app(TenantManager::class);
        $tenantManager->setTenant($org);

        config(['app.region' => 'MENA']);

        $middleware = new EnforceDataResidency($tenantManager);
        $request = Request::create('/api/v1/projects', 'GET');

        $response = $middleware->handle($request, function () {
            return new Response('OK', 200);
        });

        $this->assertEquals(451, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('CROSS_REGION_ACCESS_FORBIDDEN', $data['error']);
    }

    public function test_track_sla_metrics_records_endpoint_duration_and_status(): void
    {
        $middleware = new TrackSlaMetrics();
        $request = Request::create('/api/v1/projects/tasks', 'GET');

        $response = $middleware->handle($request, function () {
            usleep(1000); // 1ms delay
            return new Response('{"status":"ok"}', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());

        $metric = SlaMetric::where('endpoint', 'api/v1/projects/tasks')->first();
        $this->assertNotNull($metric);
        $this->assertEquals('GET', $metric->method);
        $this->assertEquals(200, $metric->status_code);
        $this->assertGreaterThan(0, $metric->duration_ms);
    }

    public function test_scim_token_middleware_rejects_missing_authorization_header(): void
    {
        $tenantManager = app(TenantManager::class);
        $middleware = new AuthenticateScimToken($tenantManager);
        $request = Request::create('/api/v1/scim/v2/Users', 'GET');

        $response = $middleware->handle($request, function () {
            return new Response('OK', 200);
        });

        $this->assertEquals(401, $response->getStatusCode());
    }

    public function test_scim_token_middleware_authenticates_valid_token_and_sets_tenant(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner();
        $plainToken = Str::random(40);

        ScimToken::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $org->id,
            'name' => 'Okta SCIM Integration',
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => now()->addYear(),
        ]);

        $tenantManager = app(TenantManager::class);
        $middleware = new AuthenticateScimToken($tenantManager);
        $request = Request::create('/api/v1/scim/v2/Users', 'GET');
        $request->headers->set('Authorization', 'Bearer ' . $plainToken);

        $response = $middleware->handle($request, function () {
            return new Response('SCIM OK', 200);
        });

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals($org->id, $tenantManager->getTenantId());
    }
}

<?php

use App\Http\Middleware\SecurityHeadersMiddleware;
use App\Modules\Tenancy\Exceptions\PlanLimitExceededException;
use App\Modules\Tenancy\Exceptions\TenantContextMissingException;
use App\Modules\Tenancy\Middleware\EnsureEmailIsVerified;
use App\Modules\Tenancy\Middleware\EnsureTenantContext;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        \App\Console\Commands\DeliverOpsInstallCommand::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->append(SecurityHeadersMiddleware::class);
        $middleware->append(\App\Http\Middleware\TrackSlaMetrics::class);

        $middleware->validateCsrfTokens(except: [
            'api/v1/system/install',
            'api/v1/system/install/*',
            'api/v1/integrations/github/webhook',
            'api/v1/integrations/slack/actions',
            'api/v1/integrations/teams/webhook',
            'oauth/token',
            'oauth/revoke',
            'api/v2/*',
            'scim/v2/*',
            'api/v1/auth/sso/callback',
        ]);

        $middleware->alias([
            'tenant' => EnsureTenantContext::class,
            'tenant.onboarding' => \App\Modules\Onboarding\Middleware\EnsureOnboardingTenantContext::class,
            'organization.scope' => \App\Modules\Tenancy\Middleware\EnsureOrganizationScope::class,
            'email.verified' => EnsureEmailIsVerified::class,
            'api_key_or_oauth' => \App\Modules\Integrations\Middleware\AuthenticateApiKeyOrOAuth::class,
            'scope' => \App\Modules\Integrations\Middleware\RequireScope::class,
            'require.idempotency' => \App\Modules\Integrations\Middleware\RequireIdempotencyKey::class,
            'throttle.api_key' => \App\Modules\Integrations\Middleware\ThrottleApiKey::class,
            'verify.github' => \App\Modules\Integrations\Middleware\VerifyGitHubSignature::class,
            'verify.slack' => \App\Modules\Integrations\Middleware\VerifySlackSignature::class,
            'verify.teams' => \App\Modules\Integrations\Middleware\VerifyTeamsSignature::class,
            'auth.scim_token' => \App\Http\Middleware\AuthenticateScimToken::class,
            'data_residency' => \App\Http\Middleware\EnforceDataResidency::class,
            'track.sla' => \App\Http\Middleware\TrackSlaMetrics::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
            if ($request->is('api/*')) {
                return true;
            }
            return $request->expectsJson();
        });

        // PlanLimitExceededException mapping to HTTP 422 (HIGH-02)
        $exceptions->render(function (PlanLimitExceededException $e, Request $request) {
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'ORG_PLAN_LIMIT_EXCEEDED',
                'details' => [
                    'limit' => $e->getLimit(),
                    'current' => $e->getCurrent(),
                ],
            ], 422);
        });

        // TenantContextMissingException mapping to HTTP 500 (Item 20)
        $exceptions->render(function (TenantContextMissingException $e, Request $request) {
            Log::critical('Tenant context missing on scoped operation', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'A fatal tenant context resolution error occurred.',
                'code' => 'TENANT_CONTEXT_MISSING_ERROR',
            ], 500);
        });
    })->create();

<?php

use App\Modules\Integrations\Controllers\ApiKeyController;
use App\Modules\Integrations\Controllers\ApiV2\DocsController;
use App\Modules\Integrations\Controllers\ApiV2\ProjectsV2Controller;
use App\Modules\Integrations\Controllers\ApiV2\TasksV2Controller;
use App\Modules\Integrations\Controllers\CompetitorImportController;
use App\Modules\Integrations\Controllers\GitHubWebhookController;
use App\Modules\Integrations\Controllers\OAuthClientController;
use App\Modules\Integrations\Controllers\OAuthController;
use App\Modules\Integrations\Controllers\SlackIntegrationController;
use App\Modules\Integrations\Controllers\TeamsIntegrationController;
use App\Modules\Integrations\Controllers\WebhookDeliveryController;
use App\Modules\Integrations\Controllers\WebhookEndpointController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public OAuth 2.0 & OpenAPI Documentation Routes
|--------------------------------------------------------------------------
*/
Route::prefix('oauth')->group(function () {
    Route::get('authorize', [OAuthController::class, 'showAuthorize']);
    Route::post('authorize', [OAuthController::class, 'approveAuthorization'])->middleware(['auth:sanctum', 'tenant']);
    Route::post('token', [OAuthController::class, 'issueToken']);
    Route::post('revoke', [OAuthController::class, 'revokeToken']);
});

Route::prefix('api/docs')->group(function () {
    Route::get('/', [DocsController::class, 'openApi']);
    Route::get('openapi.json', [DocsController::class, 'openApi']);
});

/*
|--------------------------------------------------------------------------
| Inbound Third-Party Webhook Receivers
|--------------------------------------------------------------------------
*/
Route::prefix('api/v1/integrations')->group(function () {
    Route::post('github/webhook', [GitHubWebhookController::class, 'handleWebhook'])
        ->middleware('verify.github');
});

/*
|--------------------------------------------------------------------------
| Management Routes (DeliverOps Dashboard UI / Sanctum Auth)
|--------------------------------------------------------------------------
*/
Route::prefix('api/v1')->middleware(['auth:sanctum', 'tenant'])->group(function () {
    // API Keys Management
    Route::apiResource('api-keys', ApiKeyController::class)->only(['index', 'store', 'destroy']);

    // OAuth Applications Management
    Route::apiResource('oauth-apps', OAuthClientController::class);

    // Webhooks & Deliveries (Specific routes declared BEFORE apiResource to avoid route collision)
    Route::get('webhooks/deliveries', [WebhookDeliveryController::class, 'index']);
    Route::get('webhooks/deliveries/{delivery}', [WebhookDeliveryController::class, 'show']);
    Route::post('webhooks/deliveries/{delivery}/retry', [WebhookDeliveryController::class, 'retry']);
    Route::post('webhooks/{webhook}/test', [WebhookEndpointController::class, 'testPing']);
    Route::post('webhooks/{webhook}/rotate-secret', [WebhookEndpointController::class, 'rotateSecret']);
    Route::apiResource('webhooks', WebhookEndpointController::class);

    // Slack Connector
    Route::prefix('integrations/slack')->group(function () {
        Route::get('/', [SlackIntegrationController::class, 'status']);
        Route::post('connect', [SlackIntegrationController::class, 'connect']);
        Route::post('disconnect', [SlackIntegrationController::class, 'disconnect']);
        Route::post('test', [SlackIntegrationController::class, 'test']);
    });

    // Teams Connector
    Route::prefix('integrations/teams')->group(function () {
        Route::get('/', [TeamsIntegrationController::class, 'status']);
        Route::post('connect', [TeamsIntegrationController::class, 'connect']);
        Route::post('disconnect', [TeamsIntegrationController::class, 'disconnect']);
        Route::post('test', [TeamsIntegrationController::class, 'test']);
    });

    // Competitor Importers
    Route::prefix('integrations/import')->group(function () {
        Route::post('/', [CompetitorImportController::class, 'import']);
        Route::get('batches', [CompetitorImportController::class, 'batches']);
    });
});

/*
|--------------------------------------------------------------------------
| Public REST API v2 Routes (Token-Bucket Throttled, Scoped, Idempotent)
|--------------------------------------------------------------------------
*/
Route::prefix('api/v2')
    ->middleware(['api_key_or_oauth', 'throttle.api_key', 'require.idempotency'])
    ->group(function () {
        // Projects v2
        Route::get('projects', [ProjectsV2Controller::class, 'index'])->middleware('scope:projects:read');
        Route::post('projects', [ProjectsV2Controller::class, 'store'])->middleware('scope:projects:write');
        Route::get('projects/{project}', [ProjectsV2Controller::class, 'show'])->middleware('scope:projects:read');
        Route::put('projects/{project}', [ProjectsV2Controller::class, 'update'])->middleware('scope:projects:write');
        Route::delete('projects/{project}', [ProjectsV2Controller::class, 'destroy'])->middleware('scope:projects:write');

        // Tasks v2
        Route::get('tasks', [TasksV2Controller::class, 'index'])->middleware('scope:tasks:read');
        Route::post('tasks', [TasksV2Controller::class, 'store'])->middleware('scope:tasks:write');
        Route::get('tasks/{task}', [TasksV2Controller::class, 'show'])->middleware('scope:tasks:read');
        Route::put('tasks/{task}', [TasksV2Controller::class, 'update'])->middleware('scope:tasks:write');
        Route::delete('tasks/{task}', [TasksV2Controller::class, 'destroy'])->middleware('scope:tasks:write');
    });

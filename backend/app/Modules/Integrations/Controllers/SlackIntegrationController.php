<?php

namespace App\Modules\Integrations\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Integrations\Models\IntegrationConnection;
use App\Modules\Integrations\Services\SlackService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SlackIntegrationController extends Controller
{
    public function __construct(
        protected SlackService $slackService,
        protected TenantManager $tenantManager
    ) {}

    public function status(): JsonResponse
    {
        $this->authorize('viewAny', IntegrationConnection::class);

        $tenantId = $this->tenantManager->getTenantId();
        $conn = IntegrationConnection::where('organization_id', $tenantId)
            ->where('provider', 'slack')
            ->first();

        return response()->json([
            'connected' => $conn?->isConnected() ?? false,
            'connection' => $conn ? [
                'id' => $conn->id,
                'status' => $conn->status,
                'webhook_url_configured' => !empty($conn->settings['webhook_url']),
                'channel' => $conn->settings['channel'] ?? null,
                'updated_at' => $conn->updated_at,
            ] : null,
        ]);
    }

    public function connect(Request $request): JsonResponse
    {
        $this->authorize('create', IntegrationConnection::class);

        $validated = $request->validate([
            'webhook_url' => ['required', 'url'],
            'channel' => ['nullable', 'string', 'max:100'],
        ]);

        $tenantId = $this->tenantManager->getTenantId();

        $conn = IntegrationConnection::updateOrCreate(
            ['organization_id' => $tenantId, 'provider' => 'slack'],
            [
                'status' => 'connected',
                'settings' => [
                    'webhook_url' => $validated['webhook_url'],
                    'channel' => $validated['channel'] ?? null,
                ],
            ]
        );

        return response()->json([
            'message' => 'Slack integration connected successfully.',
            'connected' => true,
            'connection' => [
                'id' => $conn->id,
                'status' => $conn->status,
                'channel' => $conn->settings['channel'] ?? null,
            ],
        ]);
    }

    public function disconnect(): JsonResponse
    {
        $this->authorize('delete', IntegrationConnection::class);

        $tenantId = $this->tenantManager->getTenantId();
        IntegrationConnection::where('organization_id', $tenantId)
            ->where('provider', 'slack')
            ->update(['status' => 'disconnected']);

        return response()->json([
            'message' => 'Slack integration disconnected successfully.',
            'connected' => false,
        ]);
    }

    public function test(): JsonResponse
    {
        $this->authorize('viewAny', IntegrationConnection::class);

        $tenantId = $this->tenantManager->getTenantId();
        $success = $this->slackService->sendNotification(
            $tenantId,
            'Hello from DeliverOps! Slack integration is functioning perfectly.'
        );

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Test notification sent to Slack successfully.' : 'Failed to send test notification to Slack.',
        ]);
    }
}

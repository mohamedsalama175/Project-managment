<?php

namespace App\Modules\Integrations\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Integrations\Models\IntegrationConnection;
use App\Modules\Integrations\Services\TeamsService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamsIntegrationController extends Controller
{
    public function __construct(
        protected TeamsService $teamsService,
        protected TenantManager $tenantManager
    ) {}

    public function status(): JsonResponse
    {
        $this->authorize('viewAny', IntegrationConnection::class);

        $tenantId = $this->tenantManager->getTenantId();
        $conn = IntegrationConnection::where('organization_id', $tenantId)
            ->where('provider', 'teams')
            ->first();

        return response()->json([
            'connected' => $conn?->isConnected() ?? false,
            'connection' => $conn ? [
                'id' => $conn->id,
                'status' => $conn->status,
                'webhook_url_configured' => !empty($conn->settings['webhook_url']),
                'updated_at' => $conn->updated_at,
            ] : null,
        ]);
    }

    public function connect(Request $request): JsonResponse
    {
        $this->authorize('create', IntegrationConnection::class);

        $validated = $request->validate([
            'webhook_url' => ['required', 'url'],
        ]);

        $tenantId = $this->tenantManager->getTenantId();

        $conn = IntegrationConnection::updateOrCreate(
            ['organization_id' => $tenantId, 'provider' => 'teams'],
            [
                'status' => 'connected',
                'settings' => [
                    'webhook_url' => $validated['webhook_url'],
                ],
            ]
        );

        return response()->json([
            'message' => 'Microsoft Teams integration connected successfully.',
            'connected' => true,
            'connection' => [
                'id' => $conn->id,
                'status' => $conn->status,
            ],
        ]);
    }

    public function disconnect(): JsonResponse
    {
        $this->authorize('delete', IntegrationConnection::class);

        $tenantId = $this->tenantManager->getTenantId();
        IntegrationConnection::where('organization_id', $tenantId)
            ->where('provider', 'teams')
            ->update(['status' => 'disconnected']);

        return response()->json([
            'message' => 'Microsoft Teams integration disconnected successfully.',
            'connected' => false,
        ]);
    }

    public function test(): JsonResponse
    {
        $this->authorize('viewAny', IntegrationConnection::class);

        $tenantId = $this->tenantManager->getTenantId();
        $success = $this->teamsService->sendNotification(
            $tenantId,
            'DeliverOps Notification Test',
            'Microsoft Teams connector is configured and receiving messages.',
            ['Status' => 'Active', 'Time' => now()->toDateTimeString()]
        );

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Test notification sent to Microsoft Teams.' : 'Failed to send test notification.',
        ]);
    }
}

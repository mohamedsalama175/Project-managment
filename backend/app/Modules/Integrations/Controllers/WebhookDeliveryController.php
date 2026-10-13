<?php

namespace App\Modules\Integrations\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Integrations\Jobs\DeliverWebhookJob;
use App\Modules\Integrations\Models\WebhookDelivery;
use App\Modules\Integrations\Models\WebhookEndpoint;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookDeliveryController extends Controller
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', WebhookEndpoint::class);

        $tenantId = $this->tenantManager->getTenantId();

        $query = WebhookDelivery::whereHas('endpoint', function ($q) use ($tenantId) {
            $q->where('organization_id', $tenantId);
        })->with('endpoint:id,url,events');

        if ($request->has('webhook_endpoint_id')) {
            $query->where('webhook_endpoint_id', $request->query('webhook_endpoint_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        $deliveries = $query->orderByDesc('created_at')->paginate(25);

        return response()->json($deliveries);
    }

    public function show(WebhookDelivery $delivery): JsonResponse
    {
        $this->authorize('view', $delivery->endpoint);

        return response()->json([
            'delivery' => $delivery->load('endpoint:id,url,events'),
        ]);
    }

    public function retry(WebhookDelivery $delivery): JsonResponse
    {
        $this->authorize('update', $delivery->endpoint);

        // Reset delivery for manual retry
        $delivery->update([
            'status' => 'pending',
            'next_retry_at' => null,
            'error_message' => null,
        ]);

        DeliverWebhookJob::dispatchSync($delivery->id);

        return response()->json([
            'message' => 'Webhook delivery retried.',
            'delivery' => $delivery->fresh(),
        ]);
    }
}

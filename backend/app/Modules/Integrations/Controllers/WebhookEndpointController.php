<?php

namespace App\Modules\Integrations\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Integrations\Models\WebhookEndpoint;
use App\Modules\Integrations\Services\WebhookDispatcherService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookEndpointController extends Controller
{
    public function __construct(
        protected WebhookDispatcherService $dispatcherService,
        protected TenantManager $tenantManager
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', WebhookEndpoint::class);

        $tenantId = $this->tenantManager->getTenantId();
        $endpoints = WebhookEndpoint::where('organization_id', $tenantId)
            ->withCount('deliveries')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'webhook_endpoints' => $endpoints,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', WebhookEndpoint::class);

        $validated = $request->validate([
            'url' => ['required', 'url', 'max:2048'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['string'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $tenantId = $this->tenantManager->getTenantId();
        $user = $request->user();
        $secret = 'whsec_' . bin2hex(random_bytes(24));

        $endpoint = WebhookEndpoint::create([
            'organization_id' => $tenantId,
            'created_by_id' => $user?->id,
            'url' => $validated['url'],
            'secret' => $secret,
            'events' => $validated['events'],
            'description' => $validated['description'] ?? null,
            'active' => true,
            'consecutive_failed_attempts' => 0,
        ]);

        return response()->json([
            'message' => 'Webhook endpoint created successfully. Copy this signing secret now.',
            'webhook_endpoint' => $endpoint,
            'secret' => $secret,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $webhook = WebhookEndpoint::withoutGlobalScopes()->findOrFail($id);
        $tenantId = $this->tenantManager->getTenantId();

        if ($webhook->organization_id !== $tenantId) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $this->authorize('view', $webhook);

        return response()->json([
            'webhook_endpoint' => $webhook->load(['deliveries' => fn($q) => $q->take(20)]),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $webhook = WebhookEndpoint::withoutGlobalScopes()->findOrFail($id);
        $tenantId = $this->tenantManager->getTenantId();

        if ($webhook->organization_id !== $tenantId) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $this->authorize('update', $webhook);

        $validated = $request->validate([
            'url' => ['sometimes', 'required', 'url', 'max:2048'],
            'events' => ['sometimes', 'required', 'array', 'min:1'],
            'events.*' => ['string'],
            'description' => ['nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['is_active'])) {
            $validated['active'] = $validated['is_active'];
            unset($validated['is_active']);
        }

        $webhook->update($validated);

        return response()->json([
            'message' => 'Webhook endpoint updated successfully.',
            'webhook_endpoint' => $webhook->fresh(),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $webhook = WebhookEndpoint::withoutGlobalScopes()->findOrFail($id);
        $tenantId = $this->tenantManager->getTenantId();

        if ($webhook->organization_id !== $tenantId) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $this->authorize('delete', $webhook);

        $webhook->delete();

        return response()->json([
            'message' => 'Webhook endpoint deleted successfully.',
        ]);
    }

    public function testPing(string $id): JsonResponse
    {
        $webhook = WebhookEndpoint::withoutGlobalScopes()->findOrFail($id);
        $tenantId = $this->tenantManager->getTenantId();

        if ($webhook->organization_id !== $tenantId) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $this->authorize('view', $webhook);

        $delivery = $this->dispatcherService->testPing($webhook);

        return response()->json([
            'message' => 'Test ping sent.',
            'delivery' => $delivery,
        ]);
    }

    public function rotateSecret(string $id): JsonResponse
    {
        $webhook = WebhookEndpoint::withoutGlobalScopes()->findOrFail($id);
        $tenantId = $this->tenantManager->getTenantId();

        if ($webhook->organization_id !== $tenantId) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $this->authorize('update', $webhook);

        $newSecret = $this->dispatcherService->rotateSecret($webhook);

        return response()->json([
            'message' => 'Signing secret rotated successfully.',
            'new_secret' => $newSecret,
        ]);
    }
}

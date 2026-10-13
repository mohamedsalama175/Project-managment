<?php

namespace App\Modules\Integrations\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Integrations\Models\ApiKey;
use App\Modules\Integrations\Services\ApiKeyService;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiKeyController extends Controller
{
    public function __construct(
        protected ApiKeyService $apiKeyService,
        protected TenantManager $tenantManager
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ApiKey::class);

        $tenantId = $this->tenantManager->getTenantId();
        $keys = ApiKey::where('organization_id', $tenantId)
            ->select([
                'id',
                'name',
                'key_prefix',
                'scopes',
                'rate_limit_per_minute',
                'last_used_at',
                'expires_at',
                'revoked_at',
                'created_at',
            ])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'api_keys' => $keys,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ApiKey::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'scopes' => ['nullable', 'array'],
            'scopes.*' => ['string', 'in:' . implode(',', config('deliverops.api_scopes', ['*']))],
            'rate_limit_per_minute' => ['nullable', 'integer', 'min:10', 'max:3600'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        $tenantId = $this->tenantManager->getTenantId();
        $user = $request->user();

        $scopes = $validated['scopes'] ?? ['*'];
        $rateLimit = $validated['rate_limit_per_minute'] ?? 60;
        $expiresAt = !empty($validated['expires_at']) ? Carbon::parse($validated['expires_at']) : null;

        $result = $this->apiKeyService->createApiKey(
            $user,
            $tenantId,
            $validated['name'],
            $scopes,
            $rateLimit,
            $expiresAt
        );

        return response()->json([
            'message' => 'API key created successfully. Store this secret key now, as it will never be displayed again.',
            'api_key' => $result['api_key'],
            'raw_key' => $result['raw_key'],
        ], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $apiKey = ApiKey::findOrFail($id);

        $tenantId = $this->tenantManager->getTenantId();
        if ($apiKey->organization_id !== $tenantId) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $this->authorize('delete', $apiKey);

        $this->apiKeyService->revokeApiKey($apiKey);

        return response()->json([
            'message' => 'API key revoked successfully.',
        ]);
    }
}

<?php

namespace App\Modules\Integrations\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Integrations\Models\OAuthClient;
use App\Modules\Integrations\Services\OAuthService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OAuthClientController extends Controller
{
    public function __construct(
        protected OAuthService $oauthService,
        protected TenantManager $tenantManager
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', OAuthClient::class);

        $tenantId = $this->tenantManager->getTenantId();
        $clients = OAuthClient::where('organization_id', $tenantId)
            ->select([
                'id',
                'name',
                'client_id',
                'redirect_uris',
                'scopes',
                'is_confidential',
                'created_by_name',
                'created_by_email',
                'created_at',
            ])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'oauth_clients' => $clients,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', OAuthClient::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'redirect_uris' => ['required', 'array', 'min:1'],
            'redirect_uris.*' => ['required', 'url'],
            'scopes' => ['nullable', 'array'],
            'is_confidential' => ['nullable', 'boolean'],
        ]);

        $tenantId = $this->tenantManager->getTenantId();
        $user = $request->user();

        $result = $this->oauthService->registerClient(
            $user,
            $tenantId,
            $validated['name'],
            $validated['redirect_uris'],
            $validated['scopes'] ?? ['read', 'write'],
            (bool) ($validated['is_confidential'] ?? false)
        );

        return response()->json([
            'message' => 'OAuth application registered successfully.',
            'oauth_client' => $result['client'],
            'client_secret' => $result['client_secret'],
        ], 201);
    }

    public function show(OAuthClient $client): JsonResponse
    {
        $this->authorize('view', $client);

        return response()->json([
            'oauth_client' => $client->makeHidden(['client_secret_hash']),
        ]);
    }

    public function update(Request $request, OAuthClient $client): JsonResponse
    {
        $this->authorize('update', $client);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'redirect_uris' => ['sometimes', 'required', 'array', 'min:1'],
            'redirect_uris.*' => ['url'],
            'scopes' => ['sometimes', 'array'],
        ]);

        $client->update($validated);

        return response()->json([
            'message' => 'OAuth application updated successfully.',
            'oauth_client' => $client->fresh()->makeHidden(['client_secret_hash']),
        ]);
    }

    public function destroy(OAuthClient $client): JsonResponse
    {
        $this->authorize('delete', $client);

        $client->delete();

        return response()->json([
            'message' => 'OAuth application deleted successfully.',
        ]);
    }
}

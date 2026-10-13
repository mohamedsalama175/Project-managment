<?php

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Models\ScimToken;
use App\Modules\Identity\Models\SsoConfiguration;
use App\Modules\Identity\Services\SsoService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SsoController extends Controller
{
    public function __construct(
        protected SsoService $ssoService,
        protected TenantManager $tenantManager
    ) {}

    public function redirect(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'organization_slug' => 'required|string',
        ]);

        $res = $this->ssoService->initiateLogin($validated['organization_slug']);

        return response()->json($res);
    }

    public function callback(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'organization_id' => 'required|string',
            'claims' => 'required|array',
        ]);

        $res = $this->ssoService->handleCallback($validated['organization_id'], $validated['claims']);

        return response()->json($res);
    }

    public function showConfig(): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $config = SsoConfiguration::where('organization_id', $orgId)->first();

        return response()->json(['sso_configuration' => $config]);
    }

    public function updateConfig(Request $request): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $validated = $request->validate([
            'provider' => 'required|in:saml,oidc',
            'idp_entity_id' => 'required|string|max:512',
            'sso_url' => 'required|string|url|max:1024',
            'metadata_url' => 'nullable|string|url|max:1024',
            'certificate' => 'nullable|string',
            'client_id' => 'nullable|string|max:255',
            'client_secret' => 'nullable|string|max:2048',
            'attribute_mapping' => 'nullable|array',
            'role_mapping' => 'nullable|array',
            'enabled' => 'boolean',
        ]);

        $config = SsoConfiguration::updateOrCreate(
            ['organization_id' => $orgId],
            $validated
        );

        return response()->json([
            'message' => 'SSO configuration saved successfully.',
            'sso_configuration' => $config,
        ]);
    }

    public function createScimToken(Request $request): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'expires_days' => 'nullable|integer|min:1|max:365',
        ]);

        $plainToken = 'scim_' . Str::random(48);
        $tokenHash = hash('sha256', $plainToken);
        $expiresAt = isset($validated['expires_days']) ? now()->addDays($validated['expires_days']) : null;

        $scimToken = ScimToken::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $orgId,
            'name' => $validated['name'],
            'token_hash' => $tokenHash,
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'message' => 'SCIM token generated successfully. Copy this token now as it will not be shown again.',
            'plain_text_token' => $plainToken,
            'scim_token' => $scimToken,
        ], 201);
    }

    public function revokeScimToken(string $id): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $token = ScimToken::where('organization_id', $orgId)->findOrFail($id);
        $token->delete();

        return response()->json(['message' => 'SCIM token revoked successfully.']);
    }
}

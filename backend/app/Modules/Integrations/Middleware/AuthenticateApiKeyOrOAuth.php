<?php

namespace App\Modules\Integrations\Middleware;

use App\Modules\Integrations\Models\ApiKey;
use App\Modules\Integrations\Models\OAuthAccessToken;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiKeyOrOAuth
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // 1. Check for X-API-Key header
        $rawApiKey = $request->header('X-API-Key');
        if ($rawApiKey) {
            $keyHash = hash('sha256', $rawApiKey);
            $apiKey = ApiKey::where('key_hash', $keyHash)->first();

            if (!$apiKey || $apiKey->isRevoked() || $apiKey->isExpired()) {
                return response()->json([
                    'message' => 'Invalid or expired API key.',
                    'code' => 'UNAUTHENTICATED',
                ], 401);
            }

            // Update last_used_at silently
            $apiKey->updateQuietly(['last_used_at' => now()]);

            // Hydrate tenant
            $org = Organization::find($apiKey->organization_id);
            if (!$org) {
                return response()->json(['error' => 'invalid_tenant'], 500);
            }

            $this->tenantManager->setTenant($org);
            setPermissionsTeamId($org->id);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            $request->attributes->set('api_key', $apiKey);
            $request->setUserResolver(fn() => $apiKey->user);
            auth()->setUser($apiKey->user);

            return $next($request);
        }

        // 2. Check for Bearer token
        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $rawToken = substr($authHeader, 7);
            $tokenHash = hash('sha256', $rawToken);
            $accessToken = OAuthAccessToken::where('token_hash', $tokenHash)->first();

            if (!$accessToken || $accessToken->revoked_at !== null || $accessToken->isExpired()) {
                return response()->json([
                    'message' => 'Invalid or expired OAuth access token.',
                    'code' => 'UNAUTHENTICATED',
                ], 401);
            }

            // Hydrate tenant
            $org = Organization::find($accessToken->organization_id);
            if (!$org) {
                return response()->json(['error' => 'invalid_tenant'], 500);
            }

            $this->tenantManager->setTenant($org);
            setPermissionsTeamId($org->id);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            $request->attributes->set('oauth_token', $accessToken);
            $request->setUserResolver(fn() => $accessToken->user);
            auth()->setUser($accessToken->user);

            return $next($request);
        }

        return response()->json([
            'message' => 'Authentication credentials required (X-API-Key or Bearer token).',
            'code' => 'UNAUTHENTICATED',
        ], 401);
    }
}

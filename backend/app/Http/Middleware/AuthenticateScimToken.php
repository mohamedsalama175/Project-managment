<?php

namespace App\Http\Middleware;

use App\Modules\Identity\Models\ScimToken;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateScimToken
{
    public function __construct(protected TenantManager $tenantManager) {}

    public function handle(Request $request, Closure $next): Response
    {
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json([
                'schemas' => ['urn:ietf:params:scim:api:messages:2.0:Error'],
                'detail' => 'Authorization header missing or invalid Bearer format.',
                'status' => '401',
            ], 401, ['Content-Type' => 'application/scim+json']);
        }

        $plainToken = substr($authHeader, 7);
        $tokenHash = hash('sha256', $plainToken);

        $scimToken = ScimToken::where('token_hash', $tokenHash)->first();

        if (!$scimToken) {
            return response()->json([
                'schemas' => ['urn:ietf:params:scim:api:messages:2.0:Error'],
                'detail' => 'Invalid SCIM token.',
                'status' => '401',
            ], 401, ['Content-Type' => 'application/scim+json']);
        }

        if ($scimToken->expires_at && $scimToken->expires_at->isPast()) {
            return response()->json([
                'schemas' => ['urn:ietf:params:scim:api:messages:2.0:Error'],
                'detail' => 'SCIM token has expired.',
                'status' => '401',
            ], 401, ['Content-Type' => 'application/scim+json']);
        }

        $scimToken->update(['last_used_at' => now()]);

        // Establish tenant context
        $org = Organization::find($scimToken->organization_id);
        if (!$org) {
            return response()->json([
                'schemas' => ['urn:ietf:params:scim:api:messages:2.0:Error'],
                'detail' => 'Target tenant organization not found.',
                'status' => '404',
            ], 404, ['Content-Type' => 'application/scim+json']);
        }

        $this->tenantManager->setTenant($org);

        $response = $next($request);
        $response->headers->set('Content-Type', 'application/scim+json; charset=utf-8');

        return $response;
    }
}

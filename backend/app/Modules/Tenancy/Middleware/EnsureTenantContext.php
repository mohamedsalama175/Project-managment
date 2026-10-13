<?php

namespace App\Modules\Tenancy\Middleware;

use App\Modules\Tenancy\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantContext
{
    public function __construct(protected TenantManager $tenantManager) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'code' => 'AUTH_UNAUTHENTICATED'
            ], 401);
        }

        // X-Organization-Id header is the authoritative per-request source (Item 9)
        $headerOrgId = $request->header('X-Organization-Id');
        $targetOrgId = $headerOrgId ?: $user->default_organization_id;

        if (!$targetOrgId) {
            return response()->json([
                'message' => 'No active organization selected.',
                'code' => 'TENANT_CONTEXT_MISSING'
            ], 400);
        }

        // Verify user is an active member of target organization
        $membership = $user->organizations()
            ->where('organizations.id', $targetOrgId)
            ->whereIn('organizations.status', ['active', 'trialing'])
            ->first();

        if (!$membership) {
            return response()->json([
                'message' => 'Access denied to target organization.',
                'code' => 'TENANT_ACCESS_DENIED'
            ], 403);
        }

        $this->tenantManager->setTenant($membership);
        setPermissionsTeamId($targetOrgId);

        return $next($request);
    }
}

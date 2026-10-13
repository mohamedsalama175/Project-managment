<?php

namespace App\Modules\Tenancy\Middleware;

use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationScope
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

        // Authoritative precedence: 1. X-Organization-Id header, 2. Session, 3. user default_organization_id (DRIFT-05)
        $headerOrgId = $request->header('X-Organization-Id');
        $sessionOrgId = $request->hasSession() ? ($request->session()->get('organization_id') ?: $request->session()->get('current_organization_id')) : null;
        $targetOrgId = $headerOrgId ?: ($sessionOrgId ?: $user->default_organization_id);

        if (!$targetOrgId) {
            return response()->json([
                'message' => 'No active organization selected.',
                'code' => 'TENANT_CONTEXT_MISSING'
            ], 400);
        }

        // Verify user is an active member of target organization via organization_users
        $membership = $user->organizations()
            ->where('organizations.id', $targetOrgId)
            ->whereIn('organizations.status', ['active', 'trialing'])
            ->first();

        if (!$membership) {
            $isMember = OrganizationUser::where('organization_id', $targetOrgId)
                ->where('user_id', $user->id)
                ->exists();

            if ($isMember) {
                $membership = Organization::where('id', $targetOrgId)
                    ->whereIn('status', ['active', 'trialing'])
                    ->first();
            }
        }

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

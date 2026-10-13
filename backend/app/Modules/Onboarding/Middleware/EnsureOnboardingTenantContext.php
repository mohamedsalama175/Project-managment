<?php

namespace App\Modules\Onboarding\Middleware;

use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboardingTenantContext
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'code' => 'AUTH_UNAUTHENTICATED',
            ], 401);
        }

        $tenantId = $this->tenantManager->getTenantId();

        if (!$tenantId) {
            $requestedOrgId = $request->header('X-Organization-Id')
                ?: ($user->default_organization_id
                ?: OrganizationUser::where('user_id', $user->id)->value('organization_id'));

            if ($requestedOrgId) {
                // Verify user is a member of this organization
                $isMember = OrganizationUser::where('organization_id', $requestedOrgId)
                    ->where('user_id', $user->id)
                    ->exists();

                if ($isMember) {
                    $tenantId = $requestedOrgId;
                    $this->tenantManager->setTenantId($tenantId);
                    setPermissionsTeamId($tenantId);
                }
            }
        }

        if (!$tenantId) {
            return response()->json([
                'message' => 'No active organization selected for onboarding context.',
                'code' => 'TENANT_CONTEXT_MISSING',
            ], 400);
        }

        return $next($request);
    }
}

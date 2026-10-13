<?php

namespace App\Http\Middleware;

use App\Modules\Tenancy\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceDataResidency
{
    public function __construct(protected TenantManager $tenantManager) {}

    public function handle(Request $request, Closure $next): Response
    {
        $currentTenant = $this->tenantManager->getTenant();
        $serverRegion = config('app.region', 'MENA');

        if ($currentTenant && $serverRegion !== 'all' && strtoupper($currentTenant->region) !== strtoupper($serverRegion)) {
            return response()->json([
                'error' => 'CROSS_REGION_ACCESS_FORBIDDEN',
                'message' => "Tenant data is resident in region {$currentTenant->region} and cannot be processed by cluster region {$serverRegion}.",
            ], 451);
        }

        return $next($request);
    }
}

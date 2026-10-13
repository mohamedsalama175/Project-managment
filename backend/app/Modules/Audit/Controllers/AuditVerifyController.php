<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Services\AuditHashChainService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditVerifyController extends Controller
{
    public function __construct(
        protected AuditHashChainService $hashChainService,
        protected TenantManager $tenantManager
    ) {}

    public function verify(Request $request): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $sinceId = $request->query('since_id');
        $limit = min(1000, max(1, (int) $request->query('limit', 500)));

        $result = $this->hashChainService->verifyChain($orgId, $sinceId, $limit);

        return response()->json($result);
    }
}

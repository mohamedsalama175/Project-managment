<?php

namespace App\Modules\AI\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Services\AiRiskEngineService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiRiskPredictionController extends Controller
{
    public function __construct(
        protected AiRiskEngineService $riskEngine,
        protected TenantManager $tenantManager
    ) {}

    public function riskScore(Request $request, string $projectId): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $result = $this->riskEngine->calculateProjectRisk($tenantId, $request->user(), $projectId);

        return response()->json($result);
    }
}

<?php

namespace App\Modules\AI\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Services\AiSummarizationService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiSummarizationController extends Controller
{
    public function __construct(
        protected AiSummarizationService $summarizationService,
        protected TenantManager $tenantManager
    ) {}

    public function summarize(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scope' => ['required', 'string', 'in:project,task,portfolio'],
            'target_id' => ['required', 'string'],
            'time_range' => ['nullable', 'string', 'in:24h,7d,30d,90d'],
        ]);

        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $result = $this->summarizationService->summarize(
            $tenantId,
            $request->user(),
            $validated['scope'],
            $validated['target_id'],
            $validated['time_range'] ?? '7d'
        );

        return response()->json($result);
    }
}

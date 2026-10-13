<?php

namespace App\Modules\AI\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Services\AiTaskEstimatorService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiEstimationController extends Controller
{
    public function __construct(
        protected AiTaskEstimatorService $estimatorService,
        protected TenantManager $tenantManager
    ) {}

    public function estimate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'category' => ['nullable', 'string', 'max:100'],
            'project_id' => ['nullable', 'string'],
        ]);

        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $result = $this->estimatorService->estimate(
            $tenantId,
            $request->user(),
            $validated['name'],
            $validated['description'] ?? null,
            $validated['category'] ?? null,
            $validated['project_id'] ?? null
        );

        return response()->json($result);
    }
}

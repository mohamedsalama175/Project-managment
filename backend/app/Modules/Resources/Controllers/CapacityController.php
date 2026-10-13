<?php

namespace App\Modules\Resources\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Resources\Services\CapacityForecastService;
use App\Modules\Resources\Services\HiringRecommendationService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CapacityController extends Controller
{
    public function __construct(
        protected CapacityForecastService $forecastService,
        protected HiringRecommendationService $hiringService
    ) {}

    public function current(Request $request): JsonResponse
    {
        $tenantId = app(TenantManager::class)->getTenantId() ?? $request->user()->default_organization_id;
        $weeks = $request->integer('weeks', 8);

        $data = $this->forecastService->getForecast($tenantId, $weeks);

        return response()->json($data);
    }

    public function forecast(Request $request): JsonResponse
    {
        $tenantId = app(TenantManager::class)->getTenantId() ?? $request->user()->default_organization_id;
        $weeks = $request->integer('weeks', 26);

        $data = $this->forecastService->getForecast($tenantId, $weeks);

        return response()->json($data);
    }

    public function hiringRecommendations(Request $request): JsonResponse
    {
        $tenantId = app(TenantManager::class)->getTenantId() ?? $request->user()->default_organization_id;
        $weeks = $request->integer('weeks', 26);

        $data = $this->hiringService->getRecommendations($tenantId, $weeks);

        return response()->json($data);
    }
}

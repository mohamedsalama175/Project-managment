<?php

namespace App\Modules\Financials\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Modules\Financials\Services\EvmCalculationService;
use App\Modules\Financials\Services\ForecastEngineService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EvmController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected EvmCalculationService $evmService,
        protected ForecastEngineService $forecastService
    ) {}

    public function evm(Request $request, string $projectId): JsonResponse
    {
        $user = $request->user();
        $tenantId = app(\App\Modules\Tenancy\Services\TenantManager::class)->getTenantId() ?? $user->default_organization_id;

        $rawProject = Project::withoutGlobalScopes()->find($projectId);
        if ($rawProject && $rawProject->organization_id !== $tenantId) {
            abort(404, 'Project not found.');
        }

        $project = Project::find($projectId);
        if (!$project) {
            return response()->json([
                'project_id' => $projectId,
                'status_date' => now()->toDateString(),
                'planned_value' => 0,
                'earned_value' => 0,
                'actual_cost' => 0,
                'cost_variance' => 0,
                'schedule_variance' => 0,
                'cpi' => 1.0,
                'spi' => 1.0,
                'eac' => 0,
                'vac' => 0,
                'tcpi' => 1.0,
                'burn_rate' => 0,
                'runway_weeks' => 0,
            ]);
        }

        if (!$request->user()->can('evm.view')) {
            abort(403, 'Permission denied to view EVM computations.');
        }

        $statusDate = $request->query('status_date');
        $pv = $request->query('pv') !== null ? (float) $request->query('pv') : null;
        $ev = $request->query('ev') !== null ? (float) $request->query('ev') : null;
        $ac = $request->query('ac') !== null ? (float) $request->query('ac') : null;

        $metrics = $this->evmService->calculate($project, $statusDate, $pv, $ev, $ac);

        return response()->json($metrics);
    }

    public function burnRate(Request $request, string $projectId): JsonResponse
    {
        $project = Project::find($projectId);
        if (!$project) {
            return response()->json([
                'project_id' => $projectId,
                'weekly_burn' => 0,
                'runway_weeks' => 0,
                'history' => [],
            ]);
        }

        if (!$request->user()->can('evm.view') && !$request->user()->can('costs.view')) {
            abort(403, 'Permission denied.');
        }

        $weeks = (int) $request->query('weeks', 8);
        $burnRate = $this->forecastService->calculateBurnRate($project, $weeks);

        return response()->json($burnRate);
    }

    public function forecast(Request $request, string $projectId): JsonResponse
    {
        $project = Project::find($projectId);
        if (!$project) {
            return response()->json([
                'project_id' => $projectId,
                'etc' => 0,
                'eac' => 0,
                'vac' => 0,
                'confidence_interval' => ['low' => 0, 'high' => 0],
            ]);
        }

        if (!$request->user()->can('evm.view') && !$request->user()->can('costs.view')) {
            abort(403, 'Permission denied.');
        }

        $forecast = $this->forecastService->forecastToComplete($project);

        return response()->json($forecast);
    }
}

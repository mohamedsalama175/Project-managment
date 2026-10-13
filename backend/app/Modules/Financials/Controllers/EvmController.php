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
        $project = Project::findOrFail($projectId);
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
        $project = Project::findOrFail($projectId);
        if (!$request->user()->can('evm.view') && !$request->user()->can('costs.view')) {
            abort(403, 'Permission denied.');
        }

        $weeks = (int) $request->query('weeks', 8);
        $burnRate = $this->forecastService->calculateBurnRate($project, $weeks);

        return response()->json($burnRate);
    }

    public function forecast(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        if (!$request->user()->can('evm.view') && !$request->user()->can('costs.view')) {
            abort(403, 'Permission denied.');
        }

        $forecast = $this->forecastService->forecastToComplete($project);

        return response()->json($forecast);
    }
}

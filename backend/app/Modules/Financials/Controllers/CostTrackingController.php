<?php

namespace App\Modules\Financials\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Modules\Financials\Models\ProjectCostSnapshot;
use App\Modules\Financials\Services\CostCalculationService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CostTrackingController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected CostCalculationService $costService
    ) {}

    public function index(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        if (!$request->user()->can('costs.view')) {
            abort(403, 'Permission denied to view project costs.');
        }

        $from = $request->query('from');
        $to = $request->query('to');

        $costs = $this->costService->calculateProjectCosts($project, $from, $to);

        return response()->json($costs);
    }

    public function takeSnapshot(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        if (!$request->user()->can('costs.view') && !$request->user()->can('budget.manage')) {
            abort(403, 'Permission denied to take cost snapshots.');
        }

        $date = $request->input('snapshot_date');
        $snapshot = $this->costService->createCostSnapshot($project, $date);

        return response()->json([
            'message' => 'Project cost snapshot recorded successfully.',
            'snapshot' => $snapshot,
        ], 201);
    }

    public function snapshots(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        if (!$request->user()->can('costs.view')) {
            abort(403, 'Permission denied to view snapshots.');
        }

        $snapshots = ProjectCostSnapshot::where('project_id', $project->id)
            ->orderByDesc('snapshot_date')
            ->get();

        return response()->json([
            'snapshots' => $snapshots,
        ]);
    }
}

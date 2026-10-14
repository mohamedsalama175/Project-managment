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
                'summary' => [
                    'total_hours' => 0,
                    'labor_cost' => 0,
                    'expense_cost' => 0,
                    'total_cost' => 0,
                    'billable_amount' => 0,
                    'currency' => 'USD',
                ],
                'by_user' => [],
                'by_task' => [],
                'by_week' => [],
                'time_entries' => [],
            ]);
        }

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
        $project = Project::find($projectId);
        if (!$project) {
            return response()->json([
                'message' => 'Project not found.',
                'code' => 'PROJECT_NOT_FOUND',
            ], 404);
        }

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
        $project = Project::find($projectId);
        if (!$project) {
            return response()->json([
                'snapshots' => [],
            ]);
        }

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

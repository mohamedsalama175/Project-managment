<?php

namespace App\Modules\Baselines\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Modules\Baselines\Services\BaselineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BaselineController extends Controller
{
    public function __construct(
        protected BaselineService $baselineService
    ) {}

    public function lock(Request $request, Project $project): JsonResponse
    {
        $this->authorize('lockBaseline', $project);

        $this->baselineService->lockBaseline($project, $request->user());

        return response()->json([
            'message' => 'Project baseline locked successfully.',
        ]);
    }

    public function clear(Request $request, Project $project): JsonResponse
    {
        $this->authorize('lockBaseline', $project);

        $this->baselineService->clearBaseline($project, $request->user());

        return response()->json([
            'message' => 'Project baseline cleared successfully.',
        ]);
    }

    public function variance(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $variance = $this->baselineService->getVarianceMetrics($project);

        return response()->json([
            'data' => $variance,
        ]);
    }
}

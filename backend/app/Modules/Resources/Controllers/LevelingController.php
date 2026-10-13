<?php

namespace App\Modules\Resources\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Modules\Resources\Services\ResourceLevelingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LevelingController extends Controller
{
    public function __construct(
        protected ResourceLevelingService $levelingService
    ) {}

    public function propose(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $this->authorize('update', $project);

        $validated = $request->validate([
            'mode' => ['required', 'string', 'in:minimize_overallocation,smooth_weekly_load,protect_critical_path'],
        ]);

        $proposal = $this->levelingService->propose($project, $validated['mode']);

        return response()->json($proposal);
    }

    public function apply(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $this->authorize('update', $project);

        $validated = $request->validate([
            'state_hash' => ['required', 'string'],
            'task_ids' => ['required', 'array'],
            'task_ids.*' => ['required', 'string'],
        ]);

        $result = $this->levelingService->apply(
            $project,
            $validated['state_hash'],
            $validated['task_ids'],
            $request->user()
        );

        return response()->json($result);
    }
}

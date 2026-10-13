<?php

namespace App\Modules\Collaboration\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Modules\Collaboration\Services\ReviewWorkflowService;
use App\Modules\Tasks\Resources\TaskResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskReviewController extends Controller
{
    public function __construct(
        protected ReviewWorkflowService $reviewService
    ) {}

    public function requestReview(Request $request, Project $project, Task $task): JsonResponse
    {
        $this->authorize('requestReview', $task);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->reviewService->requestReview($task, $request->user(), $validated['note'] ?? null);

        return response()->json([
            'message' => 'Task submitted for review.',
            'data' => new TaskResource($updated),
        ]);
    }

    public function approve(Request $request, Project $project, Task $task): JsonResponse
    {
        $this->authorize('approveReview', $task);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->reviewService->approveReview($task, $request->user(), $validated['note'] ?? null);

        return response()->json([
            'message' => 'Task deliverable approved and marked Completed.',
            'data' => new TaskResource($updated),
        ]);
    }

    public function reject(Request $request, Project $project, Task $task): JsonResponse
    {
        $this->authorize('approveReview', $task);

        $validated = $request->validate([
            'note' => ['required', 'string', 'max:1000'],
        ]);

        $updated = $this->reviewService->rejectReview($task, $request->user(), $validated['note']);

        return response()->json([
            'message' => 'Changes requested. Task moved back to In Progress.',
            'data' => new TaskResource($updated),
        ]);
    }
}

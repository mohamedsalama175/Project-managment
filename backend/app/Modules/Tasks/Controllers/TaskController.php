<?php

namespace App\Modules\Tasks\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Modules\Scheduling\Services\CpmSchedulingService;
use App\Modules\Tasks\Requests\StoreTaskRequest;
use App\Modules\Tasks\Requests\UpdateTaskRequest;
use App\Modules\Tasks\Resources\TaskResource;
use App\Modules\Tasks\Services\TaskService;
use App\Modules\Tasks\Services\WbsHierarchyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function __construct(
        protected TaskService $taskService,
        protected WbsHierarchyService $wbsService,
        protected CpmSchedulingService $cpmService
    ) {}

    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $tasks = $project->tasks()
            ->with(['primaryOwner', 'reviewer', 'predecessors', 'successors', 'effortAllocations'])
            ->orderBy('order_index')
            ->get();

        return response()->json([
            'data' => TaskResource::collection($tasks),
            'treeVersion' => (int) $project->tree_version,
        ]);
    }

    public function store(StoreTaskRequest $request, Project $project): JsonResponse
    {
        $this->authorize('create', [Task::class, $project]);

        $task = $this->taskService->createTask($project, $request->validated(), $request->user());

        return (new TaskResource($task))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        return response()->json([
            'data' => new TaskResource($task->load(['primaryOwner', 'reviewer', 'predecessors', 'effortAllocations'])),
        ]);
    }

    public function update(UpdateTaskRequest $request, Project $project, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $updated = $this->taskService->updateTask($task, $request->validated(), $request->user());

        return response()->json([
            'message' => 'Task updated successfully.',
            'data' => new TaskResource($updated),
            'treeVersion' => (int) $project->fresh()->tree_version,
        ]);
    }

    public function destroy(Request $request, Project $project, Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        $this->taskService->deleteTask($task, $request->user());

        return response()->json([
            'message' => 'Task deleted successfully.',
            'treeVersion' => (int) $project->fresh()->tree_version,
        ]);
    }

    public function reorder(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'ordered_task_ids' => ['required', 'array'],
            'ordered_task_ids.*' => ['string', 'exists:tasks,id'],
        ]);

        $this->wbsService->reorder($project, $validated['ordered_task_ids']);
        $project->increment('tree_version');

        return response()->json([
            'message' => 'Task ordering updated successfully.',
            'treeVersion' => (int) $project->fresh()->tree_version,
        ]);
    }

    public function criticalPath(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $cpm = $this->cpmService->calculateCriticalPath($project);

        return response()->json([
            'data' => $cpm,
            'treeVersion' => (int) $project->tree_version,
        ]);
    }
}

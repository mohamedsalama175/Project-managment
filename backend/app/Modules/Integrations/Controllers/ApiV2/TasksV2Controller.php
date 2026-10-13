<?php

namespace App\Modules\Integrations\Controllers\ApiV2;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TasksV2Controller extends Controller
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId();
        $query = Task::where('organization_id', $tenantId)->with(['project:id,name']);

        if ($request->has('project_id')) {
            $query->where('project_id', $request->query('project_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        $tasks = $query->paginate($request->integer('per_page', 25));

        return response()->json($tasks);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'priority' => ['nullable', 'string', 'in:low,medium,high,urgent'],
            'status' => ['nullable', 'string', 'in:todo,in_progress,review,blocked,done'],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
        ]);

        $project = Project::findOrFail($validated['project_id']);
        $tenantId = $this->tenantManager->getTenantId() ?? $project->organization_id;

        if ($project->organization_id !== $tenantId) {
            return response()->json(['message' => 'Project not found.'], 404);
        }

        $maxOrder = Task::where('project_id', $project->id)->max('order_index') ?? 0;

        $task = Task::create([
            'organization_id' => $tenantId,
            'project_id' => $project->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'priority' => $validated['priority'] ?? 'medium',
            'status' => $validated['status'] ?? 'todo',
            'start_date' => $validated['start_date'] ?? null,
            'due_date' => $validated['due_date'] ?? null,
            'estimated_hours' => $validated['estimated_hours'] ?? 0,
            'order_index' => $maxOrder + 1,
        ]);

        return response()->json([
            'message' => 'Task created via API v2.',
            'task' => $task,
        ], 201);
    }

    public function show(Task $task): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($task->organization_id !== $tenantId) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        return response()->json([
            'task' => $task->load(['project:id,name', 'predecessors', 'successors']),
        ]);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($task->organization_id !== $tenantId) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'priority' => ['sometimes', 'string', 'in:low,medium,high,urgent'],
            'status' => ['sometimes', 'string', 'in:todo,in_progress,review,blocked,done'],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
        ]);

        $task->update($validated);

        return response()->json([
            'message' => 'Task updated via API v2.',
            'task' => $task->fresh(),
        ]);
    }

    public function destroy(Task $task): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($task->organization_id !== $tenantId) {
            return response()->json(['message' => 'Task not found.'], 404);
        }

        $task->delete();

        return response()->json([
            'message' => 'Task deleted via API v2.',
        ]);
    }
}

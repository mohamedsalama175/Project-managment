<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Modules\Tasks\Resources\TaskResource;
use Illuminate\Http\Request;

class TasksController extends Controller
{
    public function index(Request $request)
    {
        $query = Task::query();

        if (!auth()->user()->can('tasks.view.all')) {
            $userId = auth()->id();
            $query->where(function ($q) use ($userId) {
                $q->where('assigned_to', $userId)
                  ->orWhere('primary_owner_id', $userId);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return TaskResource::collection($query->paginate());
    }

    public function show(Task $task)
    {
        if (!auth()->user()->can('tasks.view.all')) {
            $userId = auth()->id();
            $isAssigned = $task->assigned_to === $userId || $task->primary_owner_id === $userId;
            if (!$isAssigned) {
                abort(403, 'You can only view your own tasks.');
            }
        }

        return new TaskResource($task);
    }

    public function update(Request $request, Task $task)
    {
        if (!auth()->user()->can('tasks.view.all')) {
            $userId = auth()->id();
            $isAssigned = $task->assigned_to === $userId || $task->primary_owner_id === $userId;
            if (!$isAssigned) {
                abort(403, 'You can only update your own tasks.');
            }
        }

        $validated = $request->validate([
            'pct' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'progress' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'status' => ['sometimes', 'string'],
            'name' => ['sometimes', 'string'],
        ]);

        if (isset($validated['progress'])) {
            $validated['pct'] = $validated['progress'];
            unset($validated['progress']);
        }

        $task->update($validated);

        return new TaskResource($task);
    }
}

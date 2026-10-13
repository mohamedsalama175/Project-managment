<?php

namespace App\Modules\Collaboration\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Modules\Collaboration\Models\TaskWatcher;
use App\Modules\Collaboration\Resources\TaskWatcherResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskWatcherController extends Controller
{
    public function index(Request $request, Project $project, Task $task): JsonResponse
    {
        $watchers = $task->watchers()->with('user')->get();

        return response()->json([
            'data' => TaskWatcherResource::collection($watchers),
            'is_watching' => $task->watchers()->where('user_id', $request->user()->id)->exists(),
        ]);
    }

    public function store(Request $request, Project $project, Task $task): JsonResponse
    {
        $watcher = $task->watchers()->firstOrCreate([
            'organization_id' => $task->organization_id,
            'user_id' => $request->user()->id,
        ], [
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Now watching task.',
            'is_watching' => true,
            'watcher' => new TaskWatcherResource($watcher->load('user')),
        ]);
    }

    public function destroy(Request $request, Project $project, Task $task): JsonResponse
    {
        $task->watchers()->where('user_id', $request->user()->id)->delete();

        return response()->json([
            'message' => 'Unwatched task.',
            'is_watching' => false,
        ]);
    }
}

<?php

namespace App\Modules\Collaboration\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Modules\Collaboration\Resources\ActivityEventResource;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityEventController extends Controller
{
    public function projectFeed(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        if ($project->is_sample) {
            $org = Organization::find($project->organization_id);
            if (!$org || $org->sample_project_id === null) {
                abort(404, 'Project not found.');
            }
        }

        $limit = min(50, max(5, (int) $request->query('limit', 20)));

        $events = $project->activityEvents()
            ->with('actor')
            ->orderBy('created_at', 'desc')
            ->paginate($limit);

        return response()->json([
            'data' => ActivityEventResource::collection($events),
            'meta' => [
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'total' => $events->total(),
            ],
        ]);
    }

    public function taskFeed(Request $request, Project $project, Task $task): JsonResponse
    {
        $this->authorize('view', $project);

        if ($project->is_sample) {
            $org = Organization::find($project->organization_id);
            if (!$org || $org->sample_project_id === null) {
                abort(404, 'Project not found.');
            }
        }

        $limit = min(50, max(5, (int) $request->query('limit', 20)));

        $events = $task->activityEvents()
            ->with('actor')
            ->orderBy('created_at', 'desc')
            ->paginate($limit);

        return response()->json([
            'data' => ActivityEventResource::collection($events),
            'meta' => [
                'current_page' => $events->currentPage(),
                'last_page' => $events->lastPage(),
                'total' => $events->total(),
            ],
        ]);
    }
}

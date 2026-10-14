<?php

namespace App\Modules\Projects\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use App\Modules\Projects\Requests\StoreProjectRequest;
use App\Modules\Projects\Requests\UpdateProjectRequest;
use App\Modules\Projects\Resources\ProjectResource;
use App\Modules\Projects\Services\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function __construct(
        protected ProjectService $projectService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);

        $projects = $this->projectService->listProjects($request->user(), $request->all());

        foreach ($projects as $project) {
            $completedCount = $project->tasks()->where('status', 'Completed')->count();
            if (($project->progress_pct ?? 0) > 0 && $completedCount === 0) {
                \Illuminate\Support\Facades\Log::warning("Project {$project->id} ({$project->code}) has progress > 0% ({$project->progress_pct}%) but 0 completed tasks.");
            }
        }

        return ProjectResource::collection($projects)->response();
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $this->authorize('create', Project::class);

        $project = $this->projectService->createProject($request->validated(), $request->user());

        return (new ProjectResource($project->load('projectManager')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'data' => new ProjectResource($project->load(['projectManager', 'members'])),
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $updated = $this->projectService->updateProject($project, $request->validated(), $request->user());

        return response()->json([
            'message' => 'Project updated successfully.',
            'data' => new ProjectResource($updated),
        ]);
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $this->projectService->archiveProject($project, $request->user());

        return response()->json([
            'message' => 'Project archived successfully.',
        ]);
    }

    public function restore(Request $request, Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $this->projectService->restoreProject($project, $request->user());

        return response()->json([
            'message' => 'Project restored successfully.',
        ]);
    }

    public function addMember(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'user_id' => ['required', 'string', 'exists:users,id'],
            'project_role' => ['required', 'in:lead,contributor,reviewer,stakeholder'],
        ]);

        $targetUser = User::findOrFail($validated['user_id']);
        $this->projectService->addMember($project, $targetUser, $validated['project_role'], $request->user());

        return response()->json([
            'message' => 'Project member added successfully.',
        ]);
    }

    public function removeMember(Request $request, Project $project, User $user): JsonResponse
    {
        $this->authorize('update', $project);

        $this->projectService->removeMember($project, $user, $request->user());

        return response()->json([
            'message' => 'Project member removed successfully.',
        ]);
    }
}

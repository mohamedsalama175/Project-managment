<?php

namespace App\Modules\Integrations\Controllers\ApiV2;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProjectsV2Controller extends Controller
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId();
        $query = Project::where('organization_id', $tenantId)->withCount(['tasks', 'members']);

        if ($request->has('is_archived')) {
            $query->where('is_archived', $request->boolean('is_archived'));
        }

        $projects = $query->paginate($request->integer('per_page', 20));

        return response()->json($projects);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:2000'],
            'budget_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $tenantId = $this->tenantManager->getTenantId();
        $user = $request->user();

        $code = $validated['code'] ?? ('PRJ-' . strtoupper(Str::random(6)));

        $project = Project::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $tenantId,
            'project_manager_id' => $user?->id,
            'name' => $validated['name'],
            'code' => $code,
            'description' => $validated['description'] ?? null,
            'config' => [],
            'budget_amount' => $validated['budget_amount'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Project created via API v2.',
            'project' => $project,
        ], 201);
    }

    public function show(Project $project): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($project->organization_id !== $tenantId) {
            return response()->json(['message' => 'Project not found.'], 404);
        }

        return response()->json([
            'project' => $project->load(['tasks', 'projectManager:id,name,email']),
        ]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($project->organization_id !== $tenantId) {
            return response()->json(['message' => 'Project not found.'], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_archived' => ['sometimes', 'boolean'],
            'budget_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $project->update($validated);

        return response()->json([
            'message' => 'Project updated via API v2.',
            'project' => $project->fresh(),
        ]);
    }

    public function destroy(Project $project): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($project->organization_id !== $tenantId) {
            return response()->json(['message' => 'Project not found.'], 404);
        }

        $project->delete();

        return response()->json([
            'message' => 'Project deleted via API v2.',
        ]);
    }
}

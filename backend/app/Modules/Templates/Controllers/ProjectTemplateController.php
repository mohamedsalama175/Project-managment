<?php

namespace App\Modules\Templates\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Modules\Templates\Models\ProjectTemplate;
use App\Modules\Templates\Requests\CreateProjectFromTemplateRequest;
use App\Modules\Templates\Requests\SaveAsTemplateRequest;
use App\Modules\Templates\Resources\ProjectTemplateResource;
use App\Modules\Templates\Services\ProjectTemplateService;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ProjectTemplateController extends Controller
{
    public function __construct(
        protected ProjectTemplateService $templateService,
        protected TenantManager $tenantManager
    ) {}

    /**
     * List all available templates (hybrid visibility: system + tenant).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', ProjectTemplate::class);

        $templates = $this->templateService->listTemplates(
            $request->query('search'),
            $request->query('industry')
        );

        return ProjectTemplateResource::collection($templates);
    }

    /**
     * Show details of a specific template.
     */
    public function show(string $id): ProjectTemplateResource
    {
        $template = $this->templateService->getTemplate($id);
        Gate::authorize('view', $template);

        return new ProjectTemplateResource($template);
    }

    /**
     * Instantiate a new project from a template.
     */
    public function instantiate(CreateProjectFromTemplateRequest $request, string $id): JsonResponse
    {
        $template = $this->templateService->getTemplate($id);
        Gate::authorize('view', $template);
        Gate::authorize('create', Project::class);

        $user = $request->user();
        $tenantId = $this->tenantManager->getTenantId() ?: $user->default_organization_id;
        $org = Organization::findOrFail($tenantId);

        $project = $this->templateService->createProjectFromTemplate(
            $template,
            $org,
            $user,
            $request->validated()
        );

        return response()->json([
            'message' => 'Project created from template successfully.',
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'code' => $project->code,
                'tasks_count' => $project->tasks()->count(),
            ],
        ], 201);
    }

    /**
     * Save an existing project as a reusable template.
     */
    public function saveAsTemplate(SaveAsTemplateRequest $request, string $projectId): JsonResponse
    {
        Gate::authorize('create', ProjectTemplate::class);

        $project = Project::findOrFail($projectId);
        Gate::authorize('view', $project);

        $template = $this->templateService->saveAsTemplate(
            $project,
            $request->user(),
            $request->validated()
        );

        return (new ProjectTemplateResource($template))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Delete a custom tenant template (system templates cannot be deleted).
     */
    public function destroy(string $id): JsonResponse
    {
        $template = $this->templateService->getTemplate($id);
        if ($template->is_system) {
            abort(403, 'System templates are protected and cannot be deleted.');
        }
        Gate::authorize('delete', $template);

        $template->delete();

        return response()->json([
            'message' => 'Project template deleted successfully.',
        ]);
    }
}

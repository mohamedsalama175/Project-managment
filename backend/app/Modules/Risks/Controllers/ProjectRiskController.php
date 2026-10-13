<?php

namespace App\Modules\Risks\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectRisk;
use App\Modules\Risks\Requests\StoreProjectRiskRequest;
use App\Modules\Risks\Requests\UpdateProjectRiskRequest;
use App\Modules\Risks\Resources\ProjectRiskResource;
use App\Modules\Risks\Services\ProjectRiskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectRiskController extends Controller
{
    public function __construct(
        protected ProjectRiskService $riskService
    ) {}

    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('viewAny', [ProjectRisk::class, $project]);

        $risks = $this->riskService->listRisks($project);

        return response()->json([
            'data' => ProjectRiskResource::collection($risks),
        ]);
    }

    public function store(StoreProjectRiskRequest $request, Project $project): JsonResponse
    {
        $this->authorize('create', [ProjectRisk::class, $project]);

        $risk = $this->riskService->createRisk($project, $request->validated(), $request->user());

        return (new ProjectRiskResource($risk))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Project $project, ProjectRisk $risk): JsonResponse
    {
        $this->authorize('view', $risk);

        return response()->json([
            'data' => new ProjectRiskResource($risk->load('owner')),
        ]);
    }

    public function update(UpdateProjectRiskRequest $request, Project $project, ProjectRisk $risk): JsonResponse
    {
        $this->authorize('update', $risk);

        $updated = $this->riskService->updateRisk($risk, $request->validated(), $request->user());

        return response()->json([
            'message' => 'Risk updated successfully.',
            'data' => new ProjectRiskResource($updated),
        ]);
    }

    public function destroy(Request $request, Project $project, ProjectRisk $risk): JsonResponse
    {
        $this->authorize('delete', $risk);

        $this->riskService->deleteRisk($risk, $request->user());

        return response()->json([
            'message' => 'Risk deleted successfully.',
        ]);
    }
}

<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Modules\Audit\Services\LegacyImportService;
use App\Modules\Projects\Resources\ProjectResource;
use App\Modules\Risks\Resources\ProjectRiskResource;
use App\Modules\Tasks\Resources\TaskResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportExportController extends Controller
{
    public function __construct(
        protected LegacyImportService $importService
    ) {}

    public function export(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $tasks = $project->tasks()
            ->with(['predecessors', 'effortAllocations', 'primaryOwner'])
            ->orderBy('order_index')
            ->get();

        $risks = $project->risks()->with('owner')->get();

        return response()->json([
            'version' => '5.0',
            'exportedAt' => now()->toISOString(),
            'project' => new ProjectResource($project),
            'tasks' => TaskResource::collection($tasks),
            'risks' => ProjectRiskResource::collection($risks),
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'config' => ['nullable', 'array'],
            'hasLockedBaseline' => ['nullable', 'boolean'],
            'tasks' => ['required', 'array'],
            'risks' => ['nullable', 'array'],
        ]);

        $idempotencyKey = $request->header('X-Idempotency-Key');

        $project = $this->importService->import($payload, $request->user(), $idempotencyKey);

        $status = $project->wasRecentlyCreated ? 201 : 200;

        return (new ProjectResource($project))
            ->response()
            ->setStatusCode($status);
    }
}

<?php

namespace App\Modules\Tasks\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Modules\Tasks\Requests\ImportTasksRequest;
use App\Modules\Tasks\Services\TaskImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class TaskImportController extends Controller
{
    public function __construct(
        protected TaskImportService $importService
    ) {}

    /**
     * Import tasks into a project via CSV/JSON with dry-run support.
     * Rate limited by heavy_import limiter.
     */
    public function import(ImportTasksRequest $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        Gate::authorize('view', $project);
        Gate::authorize('create', Task::class);

        $dryRun = $request->boolean('dry_run', false);
        $source = $request->hasFile('file') ? $request->file('file') : $request->input('tasks');

        $result = $this->importService->import(
            $project,
            $request->user(),
            $source,
            $dryRun
        );

        $statusCode = $dryRun ? 200 : 201;

        return response()->json($result, $statusCode);
    }
}

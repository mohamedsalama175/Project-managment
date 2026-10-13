<?php

namespace App\Modules\Integrations\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Modules\Integrations\Models\ImportBatch;
use App\Modules\Integrations\Services\Importers\AsanaImporter;
use App\Modules\Integrations\Services\Importers\JiraImporter;
use App\Modules\Integrations\Services\Importers\MondayImporter;
use App\Modules\Integrations\Services\Importers\MsProjectImporter;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompetitorImportController extends Controller
{
    public function __construct(
        protected JiraImporter $jiraImporter,
        protected AsanaImporter $asanaImporter,
        protected MondayImporter $mondayImporter,
        protected MsProjectImporter $msProjectImporter,
        protected TenantManager $tenantManager
    ) {}

    public function import(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('imports.execute')) {
            return response()->json([
                'message' => 'Forbidden. Missing imports.execute permission.',
                'code' => 'FORBIDDEN',
            ], 403);
        }

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'provider' => ['required', 'in:jira,asana,monday,ms_project'],
            'file' => ['nullable', 'file'],
            'content' => ['nullable', 'string'],
        ]);

        $project = Project::findOrFail($validated['project_id']);
        $tenantId = $this->tenantManager->getTenantId() ?? $project->organization_id;

        if ($project->organization_id !== $tenantId) {
            return response()->json(['message' => 'Project does not belong to active tenant.'], 403);
        }

        $rawContent = '';
        $fileName = 'direct_input';

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $fileName = $file->getClientOriginalName();
            $rawContent = file_get_contents($file->getRealPath());
        } elseif (!empty($validated['content'])) {
            $rawContent = $validated['content'];
            $fileName = 'content_upload.' . ($validated['provider'] === 'monday' ? 'csv' : ($validated['provider'] === 'ms_project' ? 'xml' : 'json'));
        } else {
            return response()->json(['message' => 'Either file or content string is required.'], 422);
        }

        $importer = match ($validated['provider']) {
            'jira' => $this->jiraImporter,
            'asana' => $this->asanaImporter,
            'monday' => $this->mondayImporter,
            'ms_project' => $this->msProjectImporter,
        };

        $batch = $importer->import($project, $user, $fileName, $rawContent);

        $status = $batch->status === 'completed' ? 200 : 422;

        return response()->json([
            'message' => $batch->status === 'completed' ? 'Project data imported successfully.' : 'Import failed.',
            'batch' => $batch,
        ], $status);
    }

    public function batches(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('imports.execute')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $tenantId = $this->tenantManager->getTenantId();
        $query = ImportBatch::where('organization_id', $tenantId)->with(['project:id,name', 'user:id,name']);

        if ($request->has('project_id')) {
            $query->where('project_id', $request->query('project_id'));
        }

        $batches = $query->orderByDesc('created_at')->paginate(20);

        return response()->json($batches);
    }
}

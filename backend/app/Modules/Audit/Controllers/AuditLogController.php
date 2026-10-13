<?php

namespace App\Modules\Audit\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Project;
use App\Modules\Audit\Resources\AuditLogResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function projectLogs(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        if (!$request->user()->can('audit.view')) {
            abort(403, 'User does not possess permission to inspect audit trails.');
        }

        $logs = AuditLog::where('project_id', $project->id)
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 30));

        return AuditLogResource::collection($logs)->response();
    }

    public function globalLogs(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!$actor->hasRole('admin') && !$actor->can('audit.view')) {
            abort(403, 'Administrative permission required for platform-wide audit access.');
        }

        $logs = AuditLog::orderByDesc('created_at')
            ->paginate($request->input('per_page', 50));

        return AuditLogResource::collection($logs)->response();
    }
}

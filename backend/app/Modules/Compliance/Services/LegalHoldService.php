<?php

namespace App\Modules\Compliance\Services;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\Task;
use App\Modules\Collaboration\Models\TaskComment;
use App\Modules\Compliance\Models\LegalHold;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LegalHoldService
{
    public function createHold(
        string $orgId,
        string $entityType,
        string $entityId,
        string $reason,
        ?string $caseNumber = null,
        string $actorId
    ): LegalHold {
        return LegalHold::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $orgId,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'reason' => $reason,
            'case_number' => $caseNumber,
            'created_by_id' => $actorId,
            'created_at' => now(),
            'released_at' => null,
        ]);
    }

    public function releaseHold(string $orgId, string $holdId, string $actorId): LegalHold
    {
        $hold = LegalHold::where('organization_id', $orgId)->findOrFail($holdId);
        $hold->update(['released_at' => now()]);

        return $hold;
    }

    public function isEntityHeld(string $orgId, string $entityType, string $entityId): bool
    {
        // 0. Organization-wide hold check
        $orgHold = LegalHold::where('organization_id', $orgId)
            ->where(function ($q) {
                $q->where('entity_type', 'Organization')
                  ->orWhere('entity_type', 'organization');
            })
            ->whereNull('released_at')
            ->exists();

        if ($orgHold) {
            return true;
        }

        // 1. Direct hold check
        $directHold = LegalHold::where('organization_id', $orgId)
            ->where(function ($q) use ($entityType) {
                $q->where('entity_type', $entityType)
                  ->orWhere('entity_type', strtolower($entityType));
            })
            ->where('entity_id', $entityId)
            ->whereNull('released_at')
            ->exists();

        if ($directHold) {
            return true;
        }

        // 2. Hierarchical parent hold check (e.g. Task under held Project)
        if ($entityType === 'Task') {
            $task = Task::withoutGlobalScopes()->find($entityId);
            if ($task && $task->project_id) {
                return LegalHold::where('organization_id', $orgId)
                    ->where('entity_type', 'Project')
                    ->where('entity_id', $task->project_id)
                    ->whereNull('released_at')
                    ->exists();
            }
        }

        return false;
    }

    public function exportEdiscovery(string $orgId, string $holdId): array
    {
        $hold = LegalHold::where('organization_id', $orgId)->findOrFail($holdId);

        $payload = [
            'legal_hold' => $hold,
            'exported_at' => now()->toIso8601String(),
            'records' => [],
        ];

        if ($hold->entity_type === 'Project') {
            $project = Project::withoutGlobalScopes()->find($hold->entity_id);
            $tasks = Task::withoutGlobalScopes()->where('project_id', $hold->entity_id)->get();
            $taskIds = $tasks->pluck('id');
            $comments = TaskComment::withoutGlobalScopes()->whereIn('task_id', $taskIds)->get();
            $audits = AuditLog::withoutGlobalScopes()->where('project_id', $hold->entity_id)->get();

            $payload['records'] = [
                'project' => $project,
                'tasks' => $tasks,
                'comments' => $comments,
                'audit_logs' => $audits,
            ];
        } elseif ($hold->entity_type === 'Task') {
            $task = Task::withoutGlobalScopes()->find($hold->entity_id);
            $comments = TaskComment::withoutGlobalScopes()->where('task_id', $hold->entity_id)->get();
            $audits = AuditLog::withoutGlobalScopes()->where('task_id', $hold->entity_id)->get();

            $payload['records'] = [
                'task' => $task,
                'comments' => $comments,
                'audit_logs' => $audits,
            ];
        }

        $filename = "ediscovery_{$hold->id}_" . time() . ".json";
        Storage::disk('local')->put("ediscovery/{$filename}", json_encode($payload, JSON_PRETTY_PRINT));

        return [
            'file_name' => $filename,
            'record_count' => count($payload['records']),
            'hold' => $hold,
            'download_url' => url("/api/v1/compliance/ediscovery/download/{$filename}"),
        ];
    }
}

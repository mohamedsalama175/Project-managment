<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class DeliverOpsAuditService
{
    public function log(
        Model $entity,
        string $action,
        ?User $actor = null,
        ?string $fieldName = null,
        mixed $oldValue = null,
        mixed $newValue = null,
        ?string $reason = null
    ): AuditLog {
        $projectId = null;
        $taskId = null;

        if ($entity instanceof Project) {
            $projectId = $entity->id;
        } elseif ($entity instanceof Task) {
            $projectId = $entity->project_id;
            $taskId = $entity->id;
        } elseif (isset($entity->project_id)) {
            $projectId = $entity->project_id;
            $taskId = $entity->task_id ?? null;
        } elseif (isset($entity->task_id)) {
            $taskId = $entity->task_id;
            $task = Task::find($taskId);
            $projectId = $task?->project_id;
        }

        $orgId = app(\App\Modules\Tenancy\Services\TenantManager::class)->getTenantId()
            ?? ($entity->organization_id ?? null)
            ?? ($actor?->default_organization_id ?? null)
            ?? '01HZX000000000000000000000';

        return AuditLog::create([
            'id' => (string) str()->ulid(),
            'organization_id' => $orgId,
            'project_id' => $projectId,
            'task_id' => $taskId,
            'entity_type' => class_basename($entity),
            'entity_id' => (string) $entity->getKey(),
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name ?? 'Unauthenticated / System',
            'actor_role' => $actor?->roles->first()?->name ?? 'system',
            'action' => $action,
            'field_name' => $fieldName,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'reason' => $reason,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_at' => now(),
        ]);
    }
}

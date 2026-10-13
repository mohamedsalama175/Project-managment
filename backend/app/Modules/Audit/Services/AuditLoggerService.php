<?php

namespace App\Modules\Audit\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Support\Str;

class AuditLoggerService
{
    public function __construct(protected TenantManager $tenantManager) {}

    public function log(
        string $action,
        ?string $auditableType = null,
        ?string $auditableId = null,
        ?string $projectId = null,
        ?string $organizationId = null,
        mixed $oldValues = null,
        mixed $newValues = null,
        ?User $actor = null,
        ?string $reason = null,
        ?string $fieldName = null
    ): AuditLog {
        $actor = $actor ?? auth()->user();
        $orgId = $organizationId
            ?? $this->tenantManager->getTenantId()
            ?? $actor?->default_organization_id
            ?? '01HZX000000000000000000000';

        return AuditLog::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $orgId,
            'project_id' => $projectId,
            'task_id' => null,
            'entity_type' => $auditableType ? class_basename($auditableType) : 'System',
            'entity_id' => $auditableId ?? (string) Str::ulid(),
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name ?? 'Unauthenticated / System',
            'actor_role' => $actor?->roles->first()?->name ?? 'system',
            'action' => $action,
            'field_name' => $fieldName,
            'old_value' => $oldValues,
            'new_value' => $newValues,
            'reason' => $reason,
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'created_at' => now(),
        ]);
    }
}

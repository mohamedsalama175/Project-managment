<?php

namespace App\Modules\Collaboration\Services;

use App\Modules\Collaboration\Models\ActivityEvent;
use App\Modules\Tenancy\Services\TenantManager;

class ActivityLoggerService
{
    public function log(array $attributes): ActivityEvent
    {
        $tenantId = $attributes['organization_id'] ?? app(TenantManager::class)->getTenantId();

        return ActivityEvent::create([
            'organization_id' => $tenantId,
            'project_id' => $attributes['project_id'],
            'task_id' => $attributes['task_id'] ?? null,
            'actor_id' => $attributes['actor_id'] ?? auth()->id(),
            'action' => $attributes['action'],
            'metadata' => $attributes['metadata'] ?? null,
        ]);
    }
}

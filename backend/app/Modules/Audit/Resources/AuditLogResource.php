<?php

namespace App\Modules\Audit\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'projectId' => $this->project_id,
            'action' => $this->action,
            'eventType' => $this->action,
            'entityType' => $this->entity_type,
            'entityId' => $this->entity_id,
            'actorId' => $this->actor_id,
            'actorName' => $this->actor_name,
            'actorRole' => $this->actor_role,
            'oldValue' => $this->old_value,
            'newValue' => $this->new_value,
            'reason' => $this->reason,
            'ipAddress' => $this->ip_address,
            'userAgent' => $this->user_agent,
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}

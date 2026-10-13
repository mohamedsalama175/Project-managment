<?php

namespace App\Modules\Risks\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectRiskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'projectId' => $this->project_id,
            'title' => $this->title,
            'description' => $this->description,
            'type' => $this->type,
            'severity' => $this->severity,
            'likelihood' => $this->likelihood,
            'status' => $this->status,
            'mitigationPlan' => $this->mitigation_plan,
            'ownerId' => $this->owner_id,
            'owner' => $this->whenLoaded('owner', function () {
                return $this->owner ? [
                    'id' => $this->owner->id,
                    'name' => $this->owner->name,
                    'email' => $this->owner->email,
                ] : null;
            }),
            'linkedTaskIds' => $this->linked_task_ids ?? [],
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}

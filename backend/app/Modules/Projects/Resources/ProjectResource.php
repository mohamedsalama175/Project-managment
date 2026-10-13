<?php

namespace App\Modules\Projects\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'clientName' => $this->client_name,
            'projectType' => $this->project_type,
            'description' => $this->description,
            'projectManagerId' => $this->project_manager_id,
            'projectManager' => $this->whenLoaded('projectManager', function () {
                return $this->projectManager ? [
                    'id' => $this->projectManager->id,
                    'name' => $this->projectManager->name,
                    'email' => $this->projectManager->email,
                    'jobTitle' => $this->projectManager->job_title,
                ] : null;
            }),
            'hasLockedBaseline' => (bool) $this->has_locked_baseline,
            'isArchived' => (bool) $this->is_archived,
            'treeVersion' => (int) $this->tree_version,
            'config' => $this->config ?? [
                'weekendDays' => [5, 6],
                'holidays' => [],
                'autoSchedule' => true,
                'durationMode' => 'working_days',
            ],
            'membersCount' => $this->members()->count(),
            'tasksCount' => $this->tasks()->count(),
            'risksCount' => $this->risks()->count(),
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}

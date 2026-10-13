<?php

namespace App\Modules\Collaboration\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ActivityEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'task_id' => $this->task_id,
            'action' => $this->action,
            'metadata' => $this->metadata,
            'actor' => $this->actor ? [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
                'email' => $this->actor->email,
                'avatar_url' => $this->actor->avatar_path ? Storage::url($this->actor->avatar_path) : null,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}

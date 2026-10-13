<?php

namespace App\Modules\Notifications\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'type' => $this->event_type ?: $this->type,
            'title' => $this->title,
            'body' => $this->body,
            'action_url' => $this->action_url,
            'task_id' => $this->task_id,
            'project_id' => $this->project_id,
            'data' => $this->data,
            'is_read' => $this->read_at !== null,
            'read_at' => $this->read_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}

<?php

namespace App\Modules\Collaboration\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class TaskCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isTombstone = $this->trashed();

        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'user_id' => $this->user_id,
            'parent_comment_id' => $this->parent_comment_id,
            'content' => $isTombstone ? '[deleted]' : $this->content,
            'mentions' => $this->mentions ?? [],
            'is_edited' => (bool) $this->edited_at,
            'edited_at' => $this->edited_at?->toISOString(),
            'is_tombstone' => $isTombstone,
            'created_at' => $this->created_at?->toISOString(),
            'user' => ($isTombstone || !$this->user || $this->user->trashed()) ? null : [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => ($request->user()?->hasRole('admin') || $request->user()?->id === $this->user->id) ? $this->user->email : null,
                'avatar_url' => $this->user->avatar_path ? Storage::url($this->user->avatar_path) : null,
            ],
            'reactions' => $this->whenLoaded('reactions', function () {
                $grouped = $this->reactions->groupBy('emoji');
                $result = [];
                foreach ($grouped as $emoji => $items) {
                    $result[$emoji] = [
                        'count' => $items->count(),
                        'has_reacted' => $items->contains('user_id', auth()->id()),
                        'users' => $items->map(fn($r) => $r->user?->name)->filter()->values()->take(5),
                    ];
                }
                return $result;
            }),
            'replies' => TaskCommentResource::collection($this->whenLoaded('replies')),
        ];
    }
}

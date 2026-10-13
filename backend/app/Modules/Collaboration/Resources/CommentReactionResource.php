<?php

namespace App\Modules\Collaboration\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentReactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'comment_id' => $this->comment_id,
            'user_id' => $this->user_id,
            'emoji' => $this->emoji,
            'user_name' => $this->user?->name,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}

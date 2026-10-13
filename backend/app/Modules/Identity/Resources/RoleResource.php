<?php

namespace App\Modules\Identity\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'displayName' => $this->display_name ?? ucwords(str_replace('_', ' ', $this->name)),
            'description' => $this->description,
            'isSystem' => (bool) $this->is_system,
            'usersCount' => $this->users_count ?? $this->users()->count(),
            'permissions' => $this->permissions->pluck('name'),
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}

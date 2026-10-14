<?php

namespace App\Modules\Identity\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatarUrl' => $this->avatar_path ? (str_starts_with($this->avatar_path, 'data:') || str_starts_with($this->avatar_path, 'http') || str_starts_with($this->avatar_path, '/') ? $this->avatar_path : Storage::disk('public')->url($this->avatar_path)) : null,
            'jobTitle' => $this->job_title,
            'department' => $this->department,
            'skills' => $this->skills ?? [],
            'weeklyCapacityHours' => (float) $this->weekly_capacity_hours,
            'status' => $this->status,
            'color' => $this->color,
            'defaultOrganizationId' => $this->default_organization_id,
            'roles' => $this->roles->pluck('name'),
            'primaryRole' => $this->roles->first()?->name ?? 'viewer',
            'mustChangePassword' => (bool) $this->must_change_password,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}

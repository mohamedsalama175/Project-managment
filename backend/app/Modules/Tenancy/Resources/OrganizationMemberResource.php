<?php

namespace App\Modules\Tenancy\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'jobTitle' => $this->job_title,
            'department' => $this->department,
            'status' => $this->status,
            'color' => $this->color,
            'avatarPath' => $this->avatar_path,
            'weeklyCapacityHours' => (float) $this->weekly_capacity_hours,
            'isOwner' => isset($this->pivot) ? (bool) $this->pivot->is_owner : false,
            'joinedAt' => isset($this->pivot) ? $this->pivot->joined_at : null,
            'roles' => $this->roles->pluck('name')->values()->toArray(),
            'role' => $this->roles->first()?->name ?? 'contributor',
        ];
    }
}

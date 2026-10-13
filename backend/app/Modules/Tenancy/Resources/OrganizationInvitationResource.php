<?php

namespace App\Modules\Tenancy\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationInvitationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organizationId' => $this->organization_id,
            'email' => $this->email,
            'role' => $this->role,
            'invitedBy' => [
                'id' => $this->invited_by,
                'name' => $this->invited_by_name,
                'email' => $this->invited_by_email,
            ],
            'expiresAt' => $this->expires_at?->toIso8601String(),
            'acceptedAt' => $this->accepted_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}

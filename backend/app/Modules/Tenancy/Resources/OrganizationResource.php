<?php

namespace App\Modules\Tenancy\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'domain' => $this->domain,
            'industry' => $this->industry,
            'region' => $this->region,
            'plan' => $this->plan,
            'trialEndsAt' => $this->trial_ends_at?->toIso8601String(),
            'billingEmail' => $this->billing_email,
            'timezone' => $this->timezone,
            'defaultCalendar' => $this->default_calendar,
            'logoPath' => $this->logo_path,
            'settings' => $this->settings ?? [],
            'planLimits' => $this->plan_limits ?? [],
            'status' => $this->status,
            'isOwner' => isset($this->pivot) ? (bool) $this->pivot->is_owner : false,
            'joinedAt' => isset($this->pivot) ? $this->pivot->joined_at : null,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Modules\Onboarding\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnboardingProgressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'user_id' => $this->user_id,
            'flow_type' => $this->flow_type,
            'current_step' => (int) $this->current_step,
            'total_steps' => $this->flow_type === 'owner' ? 7 : 3,
            'completed_steps' => $this->completed_steps ?? [],
            'skipped_steps' => $this->skipped_steps ?? [],
            'is_completed' => (bool) $this->is_completed,
            'tour_completed' => (bool) $this->tour_completed,
            'completed_at' => $this->completed_at?->toIso8601String(),
        ];
    }
}

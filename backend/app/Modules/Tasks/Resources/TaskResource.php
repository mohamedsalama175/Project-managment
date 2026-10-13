<?php

namespace App\Modules\Tasks\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'projectId' => $this->project_id,
            'parentId' => $this->parent_id,
            'name' => $this->name,
            'category' => $this->category,
            'priority' => $this->priority ?? 'Medium',
            'start' => $this->start_date,
            'end' => $this->end_date,
            'durationDays' => (int) $this->duration_days,
            'pct' => (int) $this->pct,
            'isMilestone' => (bool) $this->is_milestone,
            'status' => $this->status ?? 'Not Started',
            'blockReason' => $this->block_reason,
            'blockingRiskId' => $this->blocking_risk_id,
            'order' => (int) $this->order_index,

            // Accountability & Ownership
            'primaryOwnerId' => $this->primary_owner_id,
            'primaryOwner' => $this->whenLoaded('primaryOwner', function () {
                return $this->primaryOwner ? [
                    'id' => $this->primaryOwner->id,
                    'name' => $this->primaryOwner->name,
                    'email' => $this->primaryOwner->email,
                    'avatarUrl' => $this->primaryOwner->avatar_url,
                ] : null;
            }),
            'primaryOwnerHours' => $this->primary_owner_hours !== null ? (float) $this->primary_owner_hours : null,
            'reviewerId' => $this->reviewer_id,
            'reviewer' => $this->whenLoaded('reviewer', function () {
                return $this->reviewer ? [
                    'id' => $this->reviewer->id,
                    'name' => $this->reviewer->name,
                    'email' => $this->reviewer->email,
                ] : null;
            }),
            'reviewStatus' => $this->review_status ?? 'none',
            'reviewNote' => $this->review_note,

            // Effort & Baselines
            'estimatedHours' => $this->estimated_hours !== null ? (float) $this->estimated_hours : null,
            'loggedHours' => (float) ($this->logged_hours ?? 0),
            'baselineStart' => $this->baseline_start,
            'baselineEnd' => $this->baseline_end,

            // Relational Collections
            'dependsOn' => $this->predecessors->pluck('id'),
            'contributorAllocations' => $this->effortAllocations->map(fn ($ea) => [
                'memberId' => $ea->member_id,
                'allocatedHours' => (float) $ea->allocated_hours,
            ]),
            'commentsCount' => $this->comments()->count(),
            'lockVersion' => (int) $this->lock_version,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}

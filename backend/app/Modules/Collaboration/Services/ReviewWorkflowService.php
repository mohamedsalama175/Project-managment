<?php

namespace App\Modules\Collaboration\Services;

use App\Models\Task;
use App\Models\User;
use App\Services\DeliverOpsAuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReviewWorkflowService
{
    public function __construct(
        protected DeliverOpsAuditService $auditService
    ) {}

    public function requestReview(Task $task, User $actor, ?string $note = null): Task
    {
        return DB::transaction(function () use ($task, $actor, $note) {
            $oldValues = $task->toArray();

            $task->update([
                'status' => 'In Review',
                'review_status' => 'pending_review',
                'review_note' => $note,
            ]);

            $this->auditService->log(
                entity: $task,
                action: 'task.review_requested',
                actor: $actor,
                oldValue: $oldValues,
                newValue: $task->toArray()
            );

            return $task->fresh(['primaryOwner', 'reviewer', 'effortAllocations']);
        });
    }

    public function approveReview(Task $task, User $actor, ?string $note = null): Task
    {
        // Enforce strict Anti-Self-Approval invariant
        // 1. Primary Owner cannot approve
        // 2. Effort Contributors cannot approve
        $isPrimaryOwner = $task->primary_owner_id === $actor->id;
        $isContributor = $task->effortAllocations()->where('user_id', $actor->id)->exists();

        if (($isPrimaryOwner || $isContributor) && !$actor->hasRole('admin')) {
            throw ValidationException::withMessages([
                'reviewer' => ['Governance Violation: The task primary owner and contributing members cannot approve their own deliverable review.'],
            ]);
        }

        return DB::transaction(function () use ($task, $actor, $note) {
            $oldValues = $task->toArray();

            $task->update([
                'status' => 'Completed',
                'review_status' => 'approved',
                'pct' => 100,
                'review_note' => $note ?? 'Deliverable reviewed and approved.',
            ]);

            $this->auditService->log(
                entity: $task,
                action: 'task.review_approved',
                actor: $actor,
                oldValue: $oldValues,
                newValue: $task->toArray()
            );

            return $task->fresh(['primaryOwner', 'reviewer', 'effortAllocations']);
        });
    }

    public function rejectReview(Task $task, User $actor, ?string $note = null): Task
    {
        $isPrimaryOwner = $task->primary_owner_id === $actor->id;
        $isContributor = $task->effortAllocations()->where('user_id', $actor->id)->exists();

        if (($isPrimaryOwner || $isContributor) && !$actor->hasRole('admin')) {
            throw ValidationException::withMessages([
                'reviewer' => ['Governance Violation: The task owner or contributor cannot reject or sign off on their own review.'],
            ]);
        }

        // Mandatory rejection note
        if (empty(trim($note ?? ''))) {
            throw ValidationException::withMessages([
                'review_note' => ['A review note explaining the required changes is mandatory when requesting changes.'],
            ]);
        }

        return DB::transaction(function () use ($task, $actor, $note) {
            $oldValues = $task->toArray();

            // Progress percentage capped at <= 95% upon rejection
            $currentPct = (int) ($task->pct ?? 0);
            $cappedPct = $currentPct >= 100 ? 90 : min(95, $currentPct);

            $task->update([
                'status' => 'In Progress',
                'review_status' => 'changes_requested',
                'pct' => $cappedPct,
                'review_note' => trim($note),
            ]);

            $this->auditService->log(
                entity: $task,
                action: 'task.review_rejected',
                actor: $actor,
                oldValue: $oldValues,
                newValue: $task->toArray()
            );

            return $task->fresh(['primaryOwner', 'reviewer', 'effortAllocations']);
        });
    }
}

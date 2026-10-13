<?php

namespace App\Modules\Resources\Services;

use App\Models\User;
use App\Modules\Resources\Events\TimeEntryTransitionedEvent;
use App\Modules\Resources\Models\TimeEntry;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TimesheetService
{
    public function roundHours(float $hours, string $mode = '15m'): float
    {
        return match ($mode) {
            '15m' => round($hours * 4) / 4,
            '30m' => round($hours * 2) / 2,
            '60m' => round($hours),
            default => round($hours, 2),
        };
    }

    public function submit(array $entryIds, User $user): array
    {
        $tenantId = app(TenantManager::class)->getTenantId();

        $entries = TimeEntry::whereIn('id', $entryIds)
            ->where('organization_id', $tenantId)
            ->where('user_id', $user->id)
            ->whereNull('approved_at')
            ->get();

        $submittedIds = [];

        DB::transaction(function () use ($entries, $user, &$submittedIds) {
            foreach ($entries as $entry) {
                $entry->update([
                    'submitted_at' => now(),
                    'rejected_at' => null,
                    'rejection_reason' => null,
                ]);

                $submittedIds[] = $entry->id;

                event(new TimeEntryTransitionedEvent($entry, 'time_entry_submitted', $user));
            }
        });

        return [
            'submitted_count' => count($submittedIds),
            'submitted_ids' => $submittedIds,
        ];
    }

    public function approve(TimeEntry $entry, User $approver): TimeEntry
    {
        if ($entry->user_id === $approver->id && !$approver->hasRole('admin')) {
            throw new HttpException(403, 'Users cannot approve their own timesheet entries.');
        }

        if ($entry->approved_at !== null) {
            throw new HttpException(422, 'Time entry is already approved.');
        }

        $entry->update([
            'approved_at' => now(),
            'approved_by_id' => $approver->id,
            'approved_by_ulid_snapshot' => $approver->id,
            'approved_by_name' => $approver->name,
            'rejected_at' => null,
            'rejection_reason' => null,
        ]);

        event(new TimeEntryTransitionedEvent($entry, 'time_entry_approved', $approver));

        return $entry;
    }

    public function reject(TimeEntry $entry, User $rejector, string $reason): TimeEntry
    {
        if ($entry->approved_at !== null) {
            throw new HttpException(422, 'Approved time entries cannot be rejected. Submit a correction entry instead.');
        }

        $entry->update([
            'rejected_at' => now(),
            'rejection_reason' => $reason,
            'submitted_at' => null,
        ]);

        event(new TimeEntryTransitionedEvent($entry, 'time_entry_rejected', $rejector, ['reason' => $reason]));

        return $entry;
    }

    public function bulkApprove(array $entryIds, User $approver): array
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        $approvedIds = [];
        $failedIds = [];
        $reasonSummary = [
            'self_approval_prohibited' => 0,
            'already_approved' => 0,
            'not_submitted' => 0,
            'not_found' => 0,
        ];

        $entries = TimeEntry::whereIn('id', $entryIds)
            ->where('organization_id', $tenantId)
            ->get()
            ->keyBy('id');

        DB::transaction(function () use ($entryIds, $entries, $approver, &$approvedIds, &$failedIds, &$reasonSummary) {
            foreach ($entryIds as $id) {
                $entry = $entries->get($id);
                if (!$entry) {
                    $failedIds[] = ['id' => $id, 'reason' => 'not_found'];
                    $reasonSummary['not_found']++;
                    continue;
                }

                if ($entry->user_id === $approver->id && !$approver->hasRole('admin')) {
                    $failedIds[] = ['id' => $id, 'reason' => 'self_approval_prohibited'];
                    $reasonSummary['self_approval_prohibited']++;
                    continue;
                }

                if ($entry->approved_at !== null) {
                    $failedIds[] = ['id' => $id, 'reason' => 'already_approved'];
                    $reasonSummary['already_approved']++;
                    continue;
                }

                if ($entry->submitted_at === null) {
                    $failedIds[] = ['id' => $id, 'reason' => 'not_submitted'];
                    $reasonSummary['not_submitted']++;
                    continue;
                }

                $entry->update([
                    'approved_at' => now(),
                    'approved_by_id' => $approver->id,
                    'approved_by_ulid_snapshot' => $approver->id,
                    'approved_by_name' => $approver->name,
                    'rejected_at' => null,
                    'rejection_reason' => null,
                ]);

                $approvedIds[] = $id;

                event(new TimeEntryTransitionedEvent($entry, 'time_entry_approved', $approver));
            }
        });

        return [
            'approved_count' => count($approvedIds),
            'failed_count' => count($failedIds),
            'approved_ids' => $approvedIds,
            'failed_ids' => $failedIds,
            'reason_summary' => array_filter($reasonSummary),
        ];
    }

    public function bulkReject(array $entryIds, User $rejector, string $reason): array
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        $rejectedIds = [];

        $entries = TimeEntry::whereIn('id', $entryIds)
            ->where('organization_id', $tenantId)
            ->whereNull('approved_at')
            ->get();

        DB::transaction(function () use ($entries, $rejector, $reason, &$rejectedIds) {
            foreach ($entries as $entry) {
                $entry->update([
                    'rejected_at' => now(),
                    'rejection_reason' => $reason,
                    'submitted_at' => null,
                ]);

                $rejectedIds[] = $entry->id;

                event(new TimeEntryTransitionedEvent($entry, 'time_entry_rejected', $rejector, ['reason' => $reason]));
            }
        });

        return [
            'rejected_count' => count($rejectedIds),
            'rejected_ids' => $rejectedIds,
        ];
    }
}

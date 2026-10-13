<?php

namespace App\Modules\Audit\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuditHashChainService
{
    public function appendAuditLog(
        string $organizationId,
        string $action,
        string $entityType,
        string $entityId,
        ?string $actorId = null,
        ?string $projectId = null,
        ?string $taskId = null,
        ?string $fieldName = null,
        mixed $oldValue = null,
        mixed $newValue = null,
        ?string $reason = null
    ): AuditLog {
        return DB::transaction(function () use (
            $organizationId, $action, $entityType, $entityId,
            $actorId, $projectId, $taskId, $fieldName, $oldValue, $newValue, $reason
        ) {
            $state = DB::table('audit_chain_state')
                ->where('organization_id', $organizationId)
                ->lockForUpdate()
                ->first();

            $previousHash = $state?->head_hash ?? str_repeat('0', 64);
            $newTotalLogs = ((int) ($state?->total_logs ?? 0)) + 1;
            $id = (string) Str::ulid();
            $createdAt = now()->utc()->toIso8601String();
            $userAgent = Str::limit(request()?->userAgent() ?? '', 500, '');

            $rowHash = hash('sha256', "{$id}|{$organizationId}|{$entityType}|{$entityId}|{$action}|{$actorId}|{$previousHash}|{$createdAt}");

            $log = AuditLog::create([
                'id' => $id,
                'organization_id' => $organizationId,
                'project_id' => $projectId,
                'task_id' => $taskId,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'actor_id' => $actorId,
                'previous_hash' => $previousHash,
                'row_hash' => $rowHash,
                'actor_name' => auth()->user()?->name ?? 'System',
                'actor_role' => auth()->user()?->roles->first()?->name ?? 'system',
                'action' => $action,
                'field_name' => $fieldName,
                'old_value' => $oldValue,
                'new_value' => $newValue,
                'reason' => $reason,
                'ip_address' => request()?->ip(),
                'user_agent' => $userAgent,
                'created_at' => $createdAt,
            ]);

            DB::table('audit_chain_state')->updateOrInsert(
                ['organization_id' => $organizationId],
                [
                    'head_hash' => $rowHash,
                    'head_log_id' => $id,
                    'total_logs' => $newTotalLogs,
                    'updated_at' => now(),
                ]
            );

            return $log;
        });
    }

    public function verifyChain(string $organizationId, ?string $sinceId = null, int $limit = 500): array
    {
        $query = AuditLog::where('organization_id', $organizationId)
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc');

        $expectedPrevHash = str_repeat('0', 64);

        if ($sinceId) {
            $sinceLog = AuditLog::where('organization_id', $organizationId)->where('id', $sinceId)->first();
            if ($sinceLog) {
                $expectedPrevHash = $sinceLog->row_hash;
                $query->where(function ($q) use ($sinceLog) {
                    $q->where('created_at', '>', $sinceLog->created_at)
                      ->orWhere(function ($q2) use ($sinceLog) {
                          $q2->where('created_at', '=', $sinceLog->created_at)
                             ->where('id', '>', $sinceLog->id);
                      });
                });
            }
        }

        $logs = $query->limit($limit)->get();
        $verifiedCount = 0;

        foreach ($logs as $log) {
            if ($log->previous_hash !== $expectedPrevHash) {
                return [
                    'verified' => false,
                    'tampered_row_id' => $log->id,
                    'reason' => 'Broken chain link: previous_hash does not match preceding row_hash (possible row deletion)',
                    'expected_previous_hash' => $expectedPrevHash,
                    'actual_previous_hash' => $log->previous_hash,
                ];
            }

            $isoCreatedAt = \Carbon\Carbon::parse($log->created_at)->utc()->toIso8601String();
            $recomputed = hash('sha256', "{$log->id}|{$organizationId}|{$log->entity_type}|{$log->entity_id}|{$log->action}|{$log->actor_id}|{$log->previous_hash}|{$isoCreatedAt}");
            if ($log->row_hash !== $recomputed) {
                return [
                    'verified' => false,
                    'tampered_row_id' => $log->id,
                    'reason' => 'Row payload hash mismatch (data tampering detected)',
                    'expected_row_hash' => $recomputed,
                    'actual_row_hash' => $log->row_hash,
                ];
            }

            $expectedPrevHash = $log->row_hash;
            $verifiedCount++;
        }

        return [
            'verified' => true,
            'chain_length' => $verifiedCount,
            'head_hash' => $logs->last()?->row_hash ?? $expectedPrevHash,
            'has_more' => $logs->count() === $limit,
            'next_since_id' => $logs->last()?->id,
        ];
    }
}

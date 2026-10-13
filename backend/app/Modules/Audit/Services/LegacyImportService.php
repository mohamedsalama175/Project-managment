<?php

namespace App\Modules\Audit\Services;

use App\Models\IdempotencyKey;
use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Models\TaskEffortAllocation;
use App\Models\User;
use App\Services\DeliverOpsAuditService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LegacyImportService
{
    public function __construct(
        protected DeliverOpsAuditService $auditService
    ) {}

    public function import(array $payload, User $actor, ?string $idempotencyKey = null): Project
    {
        if (!$actor->can('projects.import') && !$actor->hasRole('admin')) {
            abort(403, 'Permission denied: projects.import capability required to execute data imports.');
        }

        // Idempotency check scoped to user
        if ($idempotencyKey) {
            $existing = IdempotencyKey::where('user_id', $actor->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing && isset($existing->response_body['project_id'])) {
                $cachedProject = Project::find($existing->response_body['project_id']);
                if ($cachedProject) {
                    return $cachedProject;
                }
            }
        }

        return DB::transaction(function () use ($payload, $actor, $idempotencyKey) {
            // PASS 1: Project Creation
            $projectName = $payload['name'] ?? ('Imported Project ' . Carbon::now()->format('Y-m-d H:i'));
            $projectCode = $payload['code'] ?? ('IMP-' . strtoupper(Str::random(6)));
            $project = Project::create([
                'name' => $projectName,
                'code' => $projectCode,
                'description' => $payload['description'] ?? 'Imported from legacy JSON archive',
                'project_manager_id' => $actor->id,
                'config' => $payload['config'] ?? [
                    'weekendDays' => [5, 6],
                    'holidays' => [],
                    'autoSchedule' => true,
                    'durationMode' => 'working_days',
                ],
                'has_locked_baseline' => !empty($payload['hasLockedBaseline']),
                'is_archived' => false,
                'tree_version' => 1,
            ]);

            $idMap = []; // legacy task id -> new ULID
            $rawTasks = $payload['tasks'] ?? [];

            // PASS 2: Tasks Creation (Flat)
            foreach ($rawTasks as $index => $t) {
                $legacyId = (string) ($t['id'] ?? Str::ulid());
                $startDate = Carbon::parse($t['start'] ?? Carbon::now());
                $endDate = Carbon::parse($t['end'] ?? $startDate->copy()->addDays(5));
                $duration = max(1, $startDate->diffInDays($endDate) + 1);

                $task = Task::create([
                    'project_id' => $project->id,
                    'name' => $t['name'] ?? 'Untitled Task',
                    'category' => $t['category'] ?? 'General',
                    'priority' => $t['priority'] ?? 'Medium',
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                    'pct' => $t['pct'] ?? 0,
                    'is_milestone' => !empty($t['isMilestone']),
                    'status' => $t['status'] ?? 'Not Started',
                    'block_reason' => $t['blockReason'] ?? null,
                    'order_index' => $t['order'] ?? $index,
                    'primary_owner_id' => $t['primaryOwnerId'] ?? null,
                    'primary_owner_hours' => $t['primaryOwnerHours'] ?? null,
                    'reviewer_id' => $t['reviewerId'] ?? null,
                    'review_status' => $t['reviewStatus'] ?? 'none',
                    'review_note' => $t['reviewNote'] ?? null,
                    'estimated_hours' => $t['estimatedHours'] ?? null,
                    'logged_hours' => $t['loggedHours'] ?? 0,
                    'baseline_start' => $t['baselineStart'] ?? null,
                    'baseline_end' => $t['baselineEnd'] ?? null,
                    'lock_version' => 1,
                ]);

                $idMap[$legacyId] = $task->id;
            }

            // PASS 3: Hierarchy Parent Resolution
            foreach ($rawTasks as $t) {
                $legacyId = (string) ($t['id'] ?? '');
                $legacyParentId = (string) ($t['parentId'] ?? '');

                if ($legacyId && $legacyParentId && isset($idMap[$legacyId]) && isset($idMap[$legacyParentId])) {
                    Task::where('id', $idMap[$legacyId])->update([
                        'parent_id' => $idMap[$legacyParentId],
                    ]);
                }
            }

            // PASS 4: Dependencies & Allocations Resolution
            foreach ($rawTasks as $t) {
                $legacyId = (string) ($t['id'] ?? '');
                if (!$legacyId || !isset($idMap[$legacyId])) {
                    continue;
                }

                $newTaskId = $idMap[$legacyId];
                $task = Task::find($newTaskId);

                // Dependencies
                $dependsOn = $t['dependsOn'] ?? [];
                $validPredIds = [];
                foreach ($dependsOn as $pLegacyId) {
                    if (isset($idMap[(string) $pLegacyId])) {
                        $validPredIds[] = $idMap[(string) $pLegacyId];
                    }
                }
                if (!empty($validPredIds)) {
                    $task->predecessors()->sync(array_fill_keys($validPredIds, ['dependency_type' => 'finish_to_start']));
                }

                // Effort Allocations
                $allocations = $t['contributorAllocations'] ?? [];
                foreach ($allocations as $alloc) {
                    if (!empty($alloc['memberId']) && isset($alloc['allocatedHours'])) {
                        TaskEffortAllocation::create([
                            'project_id' => $project->id,
                            'task_id' => $newTaskId,
                            'member_id' => $alloc['memberId'],
                            'allocated_hours' => (float) $alloc['allocatedHours'],
                        ]);
                    }
                }
            }

            // PASS 5: Risks Resolution
            $rawRisks = $payload['risks'] ?? [];
            foreach ($rawRisks as $r) {
                $linkedTasks = [];
                foreach (($r['linkedTaskIds'] ?? []) as $ltId) {
                    if (isset($idMap[(string) $ltId])) {
                        $linkedTasks[] = $idMap[(string) $ltId];
                    }
                }

                $risk = ProjectRisk::create([
                    'project_id' => $project->id,
                    'title' => $r['title'] ?? 'Imported Risk',
                    'description' => $r['description'] ?? 'Imported project risk description.',
                    'type' => $r['type'] ?? 'risk',
                    'severity' => $r['severity'] ?? 'medium',
                    'likelihood' => $r['likelihood'] ?? null,
                    'impact' => $r['impact'] ?? 'medium',
                    'status' => $r['status'] ?? 'open',
                    'mitigation_plan' => $r['mitigationPlan'] ?? 'Imported mitigation plan',
                    'identified_date' => now()->toDateString(),
                    'due_date' => now()->addDays(14)->toDateString(),
                    'owner_id' => $r['ownerId'] ?? $actor->id,
                ]);

                if (!empty($linkedTasks)) {
                    Task::whereIn('id', $linkedTasks)->update([
                        'blocking_risk_id' => $risk->id,
                        'status' => 'Blocked',
                        'block_reason' => $risk->title,
                    ]);
                }
            }

            // Record idempotency key if present
            if ($idempotencyKey) {
                IdempotencyKey::create([
                    'user_id' => $actor->id,
                    'idempotency_key' => $idempotencyKey,
                    'request_hash' => hash('sha256', json_encode($payload)),
                    'response_code' => 201,
                    'response_body' => ['project_id' => $project->id],
                ]);
            }

            $this->auditService->log(
                entity: $project,
                action: 'project.imported',
                actor: $actor,
                newValue: ['task_count' => count($rawTasks), 'risk_count' => count($rawRisks)]
            );

            $fresh = $project->fresh(['projectManager', 'tasks', 'risks']);
            $fresh->wasRecentlyCreated = true;
            return $fresh;
        });
    }
}

<?php

namespace App\Modules\Risks\Services;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Models\User;
use App\Modules\Scheduling\Services\CpmSchedulingService;
use App\Services\DeliverOpsAuditService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ProjectRiskService
{
    public function __construct(
        protected DeliverOpsAuditService $auditService,
        protected CpmSchedulingService $cpmService
    ) {}

    public function listRisks(Project $project): Collection
    {
        return $project->risks()->with('owner')->orderByDesc('created_at')->get();
    }

    public function createRisk(Project $project, array $data, User $actor): ProjectRisk
    {
        return DB::transaction(function () use ($project, $data, $actor) {
            $risk = ProjectRisk::create([
                'project_id' => $project->id,
                'title' => $data['title'],
                'description' => $data['description'] ?? 'No detailed description provided.',
                'type' => $data['type'] ?? 'risk',
                'severity' => $data['severity'] ?? 'medium',
                'likelihood' => $data['likelihood'] ?? null,
                'impact' => $data['impact'] ?? 'medium',
                'status' => $data['status'] ?? 'open',
                'mitigation_plan' => $data['mitigation_plan'] ?? 'Initial assessment pending.',
                'identified_date' => $data['identified_date'] ?? now()->toDateString(),
                'due_date' => $data['due_date'] ?? now()->addDays(14)->toDateString(),
                'owner_id' => $data['owner_id'] ?? $actor->id,
            ]);

            // If blocker type or linked task provided, link them as blocking_risk_id
            $linkedIds = $data['linked_task_ids'] ?? [];
            if (!empty($data['task_id'])) {
                $linkedIds[] = $data['task_id'];
            }

            if (!empty($linkedIds)) {
                $tasksToBlock = Task::where('project_id', $project->id)
                    ->whereIn('id', $linkedIds)
                    ->get();

                foreach ($tasksToBlock as $taskToBlock) {
                    $prevStatus = $taskToBlock->status !== 'Blocked' ? $taskToBlock->status : 'In Progress';
                    $taskToBlock->update([
                        'status' => 'Blocked',
                        'blocking_risk_id' => $risk->id,
                        'block_reason' => $prevStatus . '||' . $risk->title,
                    ]);
                }

                // Trigger CPM recalculation on task blockage
                $this->cpmService->calculateCriticalPath($project);
            }

            $this->auditService->log(
                entity: $risk,
                action: 'risk.created',
                actor: $actor,
                newValue: $risk->toArray()
            );

            return $risk->fresh('owner');
        });
    }

    public function updateRisk(ProjectRisk $risk, array $data, User $actor): ProjectRisk
    {
        return DB::transaction(function () use ($risk, $data, $actor) {
            $oldValues = $risk->toArray();
            $project = $risk->project;

            $risk->update(array_filter($data, fn ($val) => $val !== null));

            // If resolved or mitigating, restore tasks to their proper pre-blocked state
            if (in_array($risk->status, ['resolved', 'mitigating', 'mitigated', 'closed'])) {
                $blockedTasks = Task::where('project_id', $project->id)
                    ->where('blocking_risk_id', $risk->id)
                    ->get();

                foreach ($blockedTasks as $task) {
                    // Pre-blocked state restoration:
                    $parts = explode('||', (string) $task->block_reason, 2);
                    $targetStatus = !empty($parts[0]) && in_array($parts[0], ['Not Started', 'In Progress', 'In Review'])
                        ? $parts[0]
                        : (((int) $task->pct === 0) ? 'Not Started' : 'In Progress');

                    $task->update([
                        'status' => $targetStatus,
                        'blocking_risk_id' => null,
                        'block_reason' => null,
                    ]);
                }

                // Trigger CPM recalculation upon unblocking tasks
                if ($blockedTasks->isNotEmpty()) {
                    $this->cpmService->calculateCriticalPath($project);
                }
            }

            $this->auditService->log(
                entity: $risk,
                action: 'risk.updated',
                actor: $actor,
                oldValue: $oldValues,
                newValue: $risk->fresh()->toArray()
            );

            return $risk->fresh('owner');
        });
    }

    public function deleteRisk(ProjectRisk $risk, User $actor): void
    {
        DB::transaction(function () use ($risk, $actor) {
            $oldValues = $risk->toArray();
            $project = $risk->project;

            // Clear blocking_risk_id references safely and restore pre-blocked state
            $blockedTasks = Task::where('project_id', $project->id)
                ->where('blocking_risk_id', $risk->id)
                ->get();

            foreach ($blockedTasks as $task) {
                $parts = explode('||', (string) $task->block_reason, 2);
                $targetStatus = !empty($parts[0]) && in_array($parts[0], ['Not Started', 'In Progress', 'In Review'])
                    ? $parts[0]
                    : (((int) $task->pct === 0) ? 'Not Started' : 'In Progress');

                $task->update([
                    'status' => $targetStatus,
                    'blocking_risk_id' => null,
                    'block_reason' => null,
                ]);
            }

            if ($blockedTasks->isNotEmpty()) {
                $this->cpmService->calculateCriticalPath($project);
            }

            $risk->delete();

            $this->auditService->log(
                entity: $risk,
                action: 'risk.deleted',
                actor: $actor,
                oldValue: $oldValues
            );
        });
    }
}

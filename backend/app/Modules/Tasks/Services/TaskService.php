<?php

namespace App\Modules\Tasks\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskEffortAllocation;
use App\Models\User;
use App\Modules\Scheduling\Services\CpmSchedulingService;
use App\Services\DeliverOpsAuditService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class TaskService
{
    public function __construct(
        protected WbsHierarchyService $wbsService,
        protected CpmSchedulingService $cpmService,
        protected DeliverOpsAuditService $auditService
    ) {}

    public function createTask(Project $project, array $data, User $actor): Task
    {
        return DB::transaction(function () use ($project, $data, $actor) {
            $startDate = Carbon::parse($data['start_date']);
            $endDate = Carbon::parse($data['end_date']);
            $durationDays = $data['duration_days'] ?? max(1, $startDate->diffInDays($endDate) + 1);

            $maxOrder = Task::where('project_id', $project->id)->max('order_index') ?? -1;

            $task = Task::create([
                'project_id' => $project->id,
                'parent_id' => $data['parent_id'] ?? null,
                'name' => $data['name'],
                'category' => $data['category'],
                'priority' => $data['priority'] ?? 'Medium',
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'pct' => $data['pct'] ?? 0,
                'is_milestone' => $data['is_milestone'] ?? false,
                'status' => $data['status'] ?? 'Not Started',
                'block_reason' => $data['block_reason'] ?? null,
                'blocking_risk_id' => $data['blocking_risk_id'] ?? null,
                'order_index' => $maxOrder + 1,
                'primary_owner_id' => $data['primary_owner_id'] ?? null,
                'primary_owner_hours' => $data['primary_owner_hours'] ?? null,
                'reviewer_id' => $data['reviewer_id'] ?? null,
                'review_status' => 'none',
                'estimated_hours' => $data['estimated_hours'] ?? null,
                'logged_hours' => 0,
                'lock_version' => 1,
            ]);

            // Validate parent
            if (!empty($task->parent_id)) {
                $this->wbsService->validateParent($task, $task->parent_id);
            }

            // Sync Predecessors
            if (!empty($data['depends_on'])) {
                $this->syncPredecessors($task, $data['depends_on']);
            }

            // Sync Contributor Effort Allocations
            if (!empty($data['contributor_allocations'])) {
                $this->syncEffortAllocations($task, $data['contributor_allocations']);
            }

            // Rollup parent summary row
            if ($task->parent_id) {
                $parent = Task::find($task->parent_id);
                if ($parent) {
                    $this->wbsService->rollupParent($parent);
                }
            }

            $project->increment('tree_version');

            $this->auditService->log(
                entity: $task,
                action: 'task.created',
                actor: $actor,
                newValue: $task->toArray()
            );

            return $task->fresh(['predecessors', 'successors', 'effortAllocations', 'primaryOwner']);
        });
    }

    public function updateTask(Task $task, array $data, User $actor): Task
    {
        return DB::transaction(function () use ($task, $data, $actor) {
            // Optimistic Concurrency Check
            if (isset($data['lock_version']) && (int) $data['lock_version'] !== (int) $task->lock_version) {
                abort(409, 'Conflict: Task has been modified by another user. Please refresh and retry.');
            }

            $oldValues = $task->toArray();
            $project = $task->project;

            if (isset($data['parent_id'])) {
                $this->wbsService->validateParent($task, $data['parent_id']);
            }

            // Calculate duration if dates provided
            if (isset($data['start_date']) && isset($data['end_date'])) {
                $start = Carbon::parse($data['start_date']);
                $end = Carbon::parse($data['end_date']);
                $data['duration_days'] = max(1, $start->diffInDays($end) + 1);
            }

            $dateMoved = (isset($data['start_date']) && $data['start_date'] !== $task->start_date) ||
                (isset($data['end_date']) && $data['end_date'] !== $task->end_date);

            $updatePayload = array_filter($data, fn ($key) => in_array($key, [
                'name', 'category', 'priority', 'start_date', 'end_date',
                'pct', 'is_milestone', 'status', 'block_reason', 'blocking_risk_id',
                'parent_id', 'primary_owner_id', 'primary_owner_hours', 'reviewer_id',
                'estimated_hours', 'logged_hours',
            ], true), ARRAY_FILTER_USE_KEY);

            $updatePayload['lock_version'] = $task->lock_version + 1;

            $task->update($updatePayload);

            if (array_key_exists('depends_on', $data)) {
                $this->syncPredecessors($task, $data['depends_on'] ?? []);
            }

            if (array_key_exists('contributor_allocations', $data)) {
                $this->syncEffortAllocations($task, $data['contributor_allocations'] ?? []);
            }

            // Rollup parent summary
            if ($task->parent_id) {
                $parent = Task::find($task->parent_id);
                if ($parent) {
                    $this->wbsService->rollupParent($parent);
                }
            }

            // Auto-reschedule successors if dates changed
            if ($dateMoved) {
                $this->cpmService->autoRescheduleSuccessors($project, $task);
            }

            $project->increment('tree_version');

            $this->auditService->log(
                entity: $task,
                action: 'task.updated',
                actor: $actor,
                oldValue: $oldValues,
                newValue: $task->fresh()->toArray()
            );

            return $task->fresh(['predecessors', 'successors', 'effortAllocations', 'primaryOwner']);
        });
    }

    public function deleteTask(Task $task, User $actor): void
    {
        DB::transaction(function () use ($task, $actor) {
            $projectId = $task->project_id;
            $oldValues = $task->toArray();
            $parentId = $task->parent_id;

            // Re-parent children to task's parent
            Task::where('parent_id', $task->id)->update(['parent_id' => $parentId]);

            // Detach dependencies
            $task->predecessors()->detach();
            $task->successors()->detach();
            $task->effortAllocations()->delete();

            $task->delete();

            if ($parentId) {
                $parent = Task::find($parentId);
                if ($parent) {
                    $this->wbsService->rollupParent($parent);
                }
            }

            $this->auditService->log(
                entity: $task,
                action: 'task.deleted',
                actor: $actor,
                oldValue: $oldValues
            );
        });
    }

    protected function syncPredecessors(Task $task, array $predecessorIds): void
    {
        $filtered = array_filter($predecessorIds, fn ($id) => $id !== $task->id);

        $validIds = Task::where('project_id', $task->project_id)
            ->whereIn('id', $filtered)
            ->pluck('id')
            ->all();

        $syncData = [];
        foreach ($validIds as $pId) {
            $syncData[$pId] = ['dependency_type' => 'finish_to_start'];
        }

        $task->predecessors()->sync($syncData);
    }

    protected function syncEffortAllocations(Task $task, array $allocations): void
    {
        $task->effortAllocations()->delete();

        foreach ($allocations as $alloc) {
            if (!empty($alloc['member_id']) && isset($alloc['allocated_hours'])) {
                TaskEffortAllocation::create([
                    'project_id' => $task->project_id,
                    'task_id' => $task->id,
                    'member_id' => $alloc['member_id'],
                    'allocated_hours' => max(0, (float) $alloc['allocated_hours']),
                ]);
            }
        }
    }
}

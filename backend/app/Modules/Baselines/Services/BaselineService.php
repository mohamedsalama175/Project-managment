<?php

namespace App\Modules\Baselines\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\DeliverOpsAuditService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BaselineService
{
    public function __construct(
        protected DeliverOpsAuditService $auditService
    ) {}

    public function lockBaseline(Project $project, User $actor): void
    {
        DB::transaction(function () use ($project, $actor) {
            // Snapshot current start and end dates as official baselines
            Task::where('project_id', $project->id)->update([
                'baseline_start' => DB::raw('start_date'),
                'baseline_end' => DB::raw('end_date'),
            ]);

            $project->update(['has_locked_baseline' => true]);

            $this->auditService->log(
                entity: $project,
                action: 'baseline.locked',
                actor: $actor,
                newValue: ['task_count' => $project->tasks()->count()]
            );
        });
    }

    public function clearBaseline(Project $project, User $actor): void
    {
        DB::transaction(function () use ($project, $actor) {
            Task::where('project_id', $project->id)->update([
                'baseline_start' => null,
                'baseline_end' => null,
            ]);

            $project->update(['has_locked_baseline' => false]);

            $this->auditService->log(
                entity: $project,
                action: 'baseline.cleared',
                actor: $actor
            );
        });
    }

    public function getVarianceMetrics(Project $project): array
    {
        $tasks = $project->tasks()->whereNotNull('baseline_end')->get();
        if ($tasks->isEmpty()) {
            return [
                'has_baseline' => false,
                'tasks_measured' => 0,
                'delayed_tasks_count' => 0,
                'net_schedule_slippage_days' => 0,
            ];
        }

        $delayedCount = 0;
        $slippageDays = 0;

        foreach ($tasks as $task) {
            $currEnd = Carbon::parse($task->end_date);
            $baseEnd = Carbon::parse($task->baseline_end);

            if ($currEnd->gt($baseEnd)) {
                $delayedCount++;
                $slippageDays += $baseEnd->diffInDays($currEnd);
            }
        }

        return [
            'has_baseline' => true,
            'tasks_measured' => $tasks->count(),
            'delayed_tasks_count' => $delayedCount,
            'net_schedule_slippage_days' => $slippageDays,
        ];
    }
}

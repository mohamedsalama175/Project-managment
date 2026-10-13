<?php

namespace App\Modules\Scheduling\Services;

use App\Models\Project;
use App\Models\Task;
use App\Modules\Scheduling\Exceptions\CycleDetectedException;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CpmSchedulingService
{
    /**
     * Determines whether a given date is a working day based on project calendar config.
     */
    public function isWorkingDay(Carbon $date, array $weekendDays, array $holidays): bool
    {
        $dayOfWeek = (int) $date->dayOfWeek; // 0 = Sunday, 6 = Saturday
        if (in_array($dayOfWeek, $weekendDays, true)) {
            return false;
        }

        $dateString = $date->format('Y-m-d');
        if (in_array($dateString, $holidays, true)) {
            return false;
        }

        return true;
    }

    /**
     * Adds N working days to a starting date.
     */
    public function addWorkingDays(Carbon $startDate, int $days, array $weekendDays, array $holidays): Carbon
    {
        $current = $startDate->copy();
        if ($days <= 0) {
            return $current;
        }

        // Advance to first working day if starting on a weekend
        while (!$this->isWorkingDay($current, $weekendDays, $holidays)) {
            $current->addDay();
        }

        $added = 1; // start day counts as day 1
        while ($added < $days) {
            $current->addDay();
            if ($this->isWorkingDay($current, $weekendDays, $holidays)) {
                $added++;
            }
        }

        return $current;
    }

    /**
     * Subtracts N working days from an end date.
     */
    public function subWorkingDays(Carbon $endDate, int $days, array $weekendDays, array $holidays): Carbon
    {
        $current = $endDate->copy();
        if ($days <= 0) {
            return $current;
        }

        while (!$this->isWorkingDay($current, $weekendDays, $holidays)) {
            $current->subDay();
        }

        $subtracted = 1;
        while ($subtracted < $days) {
            $current->subDay();
            if ($this->isWorkingDay($current, $weekendDays, $holidays)) {
                $subtracted++;
            }
        }

        return $current;
    }

    /**
     * Finds previous immediate working day on or strictly before a date.
     */
    public function prevWorkingDay(Carbon $date, array $weekendDays, array $holidays, bool $strictlyBefore = false): Carbon
    {
        $current = $date->copy();
        if ($strictlyBefore) {
            $current->subDay();
        }

        while (!$this->isWorkingDay($current, $weekendDays, $holidays)) {
            $current->subDay();
        }

        return $current;
    }

    /**
     * Finds next immediate working day on or strictly after a date.
     */
    public function nextWorkingDay(Carbon $date, array $weekendDays, array $holidays, bool $strictlyAfter = false): Carbon
    {
        $current = $date->copy();
        if ($strictlyAfter) {
            $current->addDay();
        }

        while (!$this->isWorkingDay($current, $weekendDays, $holidays)) {
            $current->addDay();
        }

        return $current;
    }

    /**
     * Counts working days inclusive between two dates.
     */
    public function countWorkingDays(Carbon $start, Carbon $end, array $weekendDays, array $holidays): int
    {
        if ($end->lt($start)) {
            return 0;
        }

        $count = 0;
        $current = $start->copy();
        while ($current->lte($end)) {
            if ($this->isWorkingDay($current, $weekendDays, $holidays)) {
                $count++;
            }
            $current->addDay();
        }

        return $count;
    }

    /**
     * Performs full CPM analysis, calculating critical path, float, and topological sequence.
     */
    public function calculateCriticalPath(Project $project): array
    {
        $tasks = $project->tasks()->with(['predecessors', 'successors'])->get()->keyBy('id');
        if ($tasks->isEmpty()) {
            return ['critical_tasks' => [], 'sorted_order' => [], 'schedule' => []];
        }

        $config = $project->config ?? [];
        $weekendDays = $config['weekendDays'] ?? [5, 6];
        $holidays = $config['holidays'] ?? [];

        // Build adjacency and in-degree tables
        $inDegree = [];
        $adjacency = [];
        $allIds = $tasks->keys()->all();

        foreach ($allIds as $id) {
            $inDegree[$id] = 0;
            $adjacency[$id] = [];
        }

        foreach ($tasks as $task) {
            foreach ($task->successors as $succ) {
                if (isset($adjacency[$task->id]) && isset($inDegree[$succ->id])) {
                    $adjacency[$task->id][] = $succ->id;
                    $inDegree[$succ->id]++;
                }
            }
        }

        // Topological Sort via Kahn's Algorithm
        $queue = [];
        foreach ($inDegree as $id => $degree) {
            if ($degree === 0) {
                $queue[] = $id;
            }
        }

        $sortedOrder = [];
        while (!empty($queue)) {
            $currId = array_shift($queue);
            $sortedOrder[] = $currId;

            foreach ($adjacency[$currId] as $neighborId) {
                $inDegree[$neighborId]--;
                if ($inDegree[$neighborId] === 0) {
                    $queue[] = $neighborId;
                }
            }
        }

        // Cycle detection check
        if (count($sortedOrder) !== count($allIds)) {
            throw new CycleDetectedException();
        }

        // 1. FORWARD PASS (Early Start, Early Finish)
        $earlyStart = [];
        $earlyFinish = [];

        foreach ($sortedOrder as $taskId) {
            $task = $tasks[$taskId];
            $durationDays = max(1, (int) $task->duration_days);

            $predFinishDates = [];
            foreach ($task->predecessors as $pred) {
                if (isset($earlyFinish[$pred->id])) {
                    $predFinishDates[] = $earlyFinish[$pred->id];
                }
            }

            if (empty($predFinishDates)) {
                $es = Carbon::parse($task->start_date);
                $es = $this->nextWorkingDay($es, $weekendDays, $holidays);
            } else {
                // Max of predecessor early finishes
                $maxPredFinish = collect($predFinishDates)->max();
                $es = $this->nextWorkingDay($maxPredFinish->copy(), $weekendDays, $holidays, true);
            }

            $ef = $this->addWorkingDays($es, $durationDays, $weekendDays, $holidays);
            $earlyStart[$taskId] = $es;
            $earlyFinish[$taskId] = $ef;
        }

        // 2. BACKWARD PASS (Late Start, Late Finish)
        $projectFinish = collect($earlyFinish)->max();
        $lateFinish = [];
        $lateStart = [];

        $reversedOrder = array_reverse($sortedOrder);
        foreach ($reversedOrder as $taskId) {
            $task = $tasks[$taskId];
            $durationDays = max(1, (int) $task->duration_days);

            $succStartDates = [];
            foreach ($task->successors as $succ) {
                if (isset($lateStart[$succ->id])) {
                    $succStartDates[] = $lateStart[$succ->id];
                }
            }

            if (empty($succStartDates)) {
                $lf = $earlyFinish[$taskId] ?? $projectFinish->copy();
            } else {
                $minSuccStart = collect($succStartDates)->min();
                $lf = $this->prevWorkingDay($minSuccStart->copy(), $weekendDays, $holidays, true);
            }

            $ls = $this->subWorkingDays($lf, $durationDays, $weekendDays, $holidays);
            $lateFinish[$taskId] = $lf;
            $lateStart[$taskId] = $ls;
        }

        // 3. FLOAT & CRITICAL PATH DETERMINATION
        $schedule = [];
        $criticalTasks = [];

        foreach ($sortedOrder as $taskId) {
            $es = $earlyStart[$taskId];
            $ls = $lateStart[$taskId];

            $totalFloat = $this->countWorkingDays($es, $ls, $weekendDays, $holidays) - 1;
            if ($totalFloat < 0) {
                $totalFloat = 0;
            }

            $isCritical = $totalFloat <= 0;
            if ($isCritical) {
                $criticalTasks[] = $taskId;
            }

            $schedule[$taskId] = [
                'early_start' => $es->format('Y-m-d'),
                'early_finish' => $earlyFinish[$taskId]->format('Y-m-d'),
                'late_start' => $ls->format('Y-m-d'),
                'late_finish' => $lateFinish[$taskId]->format('Y-m-d'),
                'total_float' => $totalFloat,
                'is_critical' => $isCritical,
            ];
        }

        return [
            'critical_tasks' => $criticalTasks,
            'sorted_order' => $sortedOrder,
            'schedule' => $schedule,
        ];
    }

    /**
     * Auto-reschedules all downstream successors when a task moves (Option A cascading schedule).
     */
    public function autoRescheduleSuccessors(Project $project, Task $changedTask): void
    {
        $config = $project->config ?? [];
        if (!($config['autoSchedule'] ?? true)) {
            return;
        }

        $cpm = $this->calculateCriticalPath($project);
        $schedule = $cpm['schedule'];

        foreach ($schedule as $taskId => $metrics) {
            Task::where('id', $taskId)->update([
                'start_date' => $metrics['early_start'],
                'end_date' => $metrics['early_finish'],
            ]);
        }
    }
}

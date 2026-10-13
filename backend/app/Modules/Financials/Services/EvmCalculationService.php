<?php

namespace App\Modules\Financials\Services;

use App\Models\Project;
use App\Models\Task;
use Carbon\Carbon;

class EvmCalculationService
{
    public function __construct(
        protected CostCalculationService $costService
    ) {}

    /**
     * Compute comprehensive Earned Value Management metrics for a project.
     *
     * @param Project $project
     * @param string|null $statusDate
     * @param float|null $manualPv Optional override for planned value
     * @param float|null $manualEv Optional override for earned value
     * @param float|null $manualAc Optional override for actual cost
     * @return array
     */
    public function calculate(
        Project $project,
        ?string $statusDate = null,
        ?float $manualPv = null,
        ?float $manualEv = null,
        ?float $manualAc = null
    ): array {
        $statusDate = $statusDate ? Carbon::parse($statusDate)->toDateString() : Carbon::today()->toDateString();
        $bac = (float) $project->budget_amount;

        // 1. Actual Cost (AC)
        if ($manualAc !== null) {
            $ac = round($manualAc, 2);
        } else {
            $costs = $this->costService->calculateProjectCosts($project, null, $statusDate);
            $ac = round($costs['summary']['total_cost'], 2);
        }

        // 2. Planned Value (PV) & Earned Value (EV)
        $tasks = Task::where('project_id', $project->id)->get();
        $totalTasks = $tasks->count();

        if ($manualPv !== null) {
            $pv = round($manualPv, 2);
        } else {
            $pv = $this->computePlannedValue($project, $tasks, $bac, $statusDate);
        }

        if ($manualEv !== null) {
            $ev = round($manualEv, 2);
        } else {
            $ev = $this->computeEarnedValue($project, $tasks, $bac);
        }

        // 3. Cost Variance (CV) & Schedule Variance (SV)
        $cv = round($ev - $ac, 2);
        $sv = round($ev - $pv, 2);

        // 4. Performance Indices: CPI & SPI (rounded to 4 decimal places)
        $cpi = $ac > 0 ? round($ev / $ac, 4) : 1.0000;
        $spi = $pv > 0 ? round($ev / $pv, 4) : 1.0000;

        // 5. Estimate at Completion (EAC)
        // Standard formula: EAC = BAC / CPI
        if ($cpi > 0) {
            $eac = round($bac / $cpi, 2);
        } else {
            $eac = round($ac + max(0, $bac - $ev), 2);
        }

        // 6. Estimate to Complete (ETC) & Variance at Completion (VAC)
        $etc = round($eac - $ac, 2);
        $vac = round($bac - $eac, 2);

        // 7. To-Complete Performance Index (TCPI)
        // When (BAC - AC) <= 0 or budget overrun occurs, TCPI is undefined / null
        $remainingBudget = $bac - $ac;
        $remainingWork = $bac - $ev;

        if ($remainingBudget <= 0) {
            $tcpi = null;
        } else {
            $tcpi = round($remainingWork / $remainingBudget, 4);
        }

        // Health Indicators
        $costStatus = $cv >= 0 ? 'under_budget' : 'over_budget';
        $scheduleStatus = $sv >= 0 ? 'ahead_of_schedule' : 'behind_schedule';

        return [
            'project_id' => $project->id,
            'status_date' => $statusDate,
            'currency' => $project->budget_currency ?? 'USD',
            'bac' => round($bac, 2),
            'pv' => round($pv, 2),
            'ev' => round($ev, 2),
            'ac' => round($ac, 2),
            'cv' => $cv,
            'sv' => $sv,
            'cpi' => $cpi,
            'spi' => $spi,
            'eac' => $eac,
            'etc' => $etc,
            'vac' => $vac,
            'tcpi' => $tcpi,
            'health' => [
                'cost_status' => $costStatus,
                'schedule_status' => $scheduleStatus,
                'is_cpi_critical' => $cpi < 0.9,
                'is_spi_critical' => $spi < 0.9,
            ],
        ];
    }

    protected function computePlannedValue(Project $project, $tasks, float $bac, string $statusDate): float
    {
        if ($bac <= 0) {
            return 0.0;
        }

        $totalTasks = $tasks->count();
        if ($totalTasks === 0) {
            return 0.0;
        }

        $plannedWeightsSum = 0.0;
        $statusDateCarbon = Carbon::parse($statusDate);

        foreach ($tasks as $task) {
            $taskPlannedProgress = 0.0;
            if ($task->start_date && $task->end_date) {
                $start = Carbon::parse($task->start_date);
                $end = Carbon::parse($task->end_date);

                if ($statusDateCarbon->greaterThanOrEqualTo($end)) {
                    $taskPlannedProgress = 1.0;
                } elseif ($statusDateCarbon->lessThan($start)) {
                    $taskPlannedProgress = 0.0;
                } else {
                    $totalDays = max(1, $start->diffInDays($end));
                    $elapsedDays = $start->diffInDays($statusDateCarbon);
                    $taskPlannedProgress = min(1.0, max(0.0, $elapsedDays / $totalDays));
                }
            } else {
                // If no dates, consider planned if created
                $taskPlannedProgress = 0.5;
            }

            $plannedWeightsSum += ($taskPlannedProgress / $totalTasks);
        }

        return round($plannedWeightsSum * $bac, 2);
    }

    protected function computeEarnedValue(Project $project, $tasks, float $bac): float
    {
        if ($bac <= 0) {
            return 0.0;
        }

        $totalTasks = $tasks->count();
        if ($totalTasks === 0) {
            return 0.0;
        }

        $actualProgressSum = 0.0;
        foreach ($tasks as $task) {
            $progressPct = (float) ($task->pct ?? $task->progress ?? 0);
            $actualProgressSum += ($progressPct / 100.0) / $totalTasks;
        }

        return round($actualProgressSum * $bac, 2);
    }
}

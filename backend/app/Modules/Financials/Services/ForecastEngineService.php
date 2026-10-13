<?php

namespace App\Modules\Financials\Services;

use App\Models\Project;
use Carbon\Carbon;

class ForecastEngineService
{
    public function __construct(
        protected CostCalculationService $costService,
        protected EvmCalculationService $evmService
    ) {}

    /**
     * Compute historical weekly burn rate for a project.
     */
    public function calculateBurnRate(Project $project, int $weeks = 8): array
    {
        $toDate = Carbon::today()->toDateString();
        $fromDate = Carbon::today()->subWeeks($weeks)->startOfWeek()->toDateString();

        $costs = $this->costService->calculateProjectCosts($project, $fromDate, $toDate);
        $weeklyHistory = $costs['by_week'] ?? [];

        // Sort by week ascending
        usort($weeklyHistory, fn($a, $b) => strcmp($a['week'], $b['week']));

        $totalBurn = 0.0;
        foreach ($weeklyHistory as $w) {
            $totalBurn += $w['cost'];
        }

        $activeWeeksCount = count($weeklyHistory);
        $averageWeeklyBurn = $activeWeeksCount > 0 ? round($totalBurn / $activeWeeksCount, 2) : 0.0;

        return [
            'project_id' => $project->id,
            'currency' => $project->budget_currency ?? 'USD',
            'analysis_weeks' => $weeks,
            'active_weeks' => $activeWeeksCount,
            'average_weekly_burn' => $averageWeeklyBurn,
            'total_period_cost' => round($totalBurn, 2),
            'history' => $weeklyHistory,
        ];
    }

    /**
     * Compute forecast-to-complete and budget health alerts.
     */
    public function forecastToComplete(Project $project): array
    {
        $evm = $this->evmService->calculate($project);
        $burnRate = $this->calculateBurnRate($project, 6);

        $bac = $evm['bac'];
        $ac = $evm['ac'];
        $eac = $evm['eac'];
        $etc = $evm['etc'];

        $avgBurn = $burnRate['average_weekly_burn'];
        $weeksRemaining = ($avgBurn > 0 && $etc > 0) ? (int) ceil($etc / $avgBurn) : 0;
        $projectedCompletionDate = $weeksRemaining > 0
            ? Carbon::today()->addWeeks($weeksRemaining)->toDateString()
            : Carbon::today()->toDateString();

        // Check for budget overrun
        $alerts = [];
        if ($bac > 0 && $eac > $bac) {
            $overrunAmount = round($eac - $bac, 2);
            $overrunPct = round(($overrunAmount / $bac) * 100, 2);
            $alerts[] = [
                'type' => 'PROJECT_BUDGET_EXCEEDED',
                'severity' => 'critical',
                'message' => "Project forecast EAC exceeds budget by {$overrunAmount} {$project->budget_currency} ({$overrunPct}%).",
                'budget' => $bac,
                'forecast_cost' => $eac,
                'overrun_amount' => $overrunAmount,
                'overrun_percentage' => $overrunPct,
            ];
        }

        return [
            'project_id' => $project->id,
            'currency' => $project->budget_currency ?? 'USD',
            'bac' => $bac,
            'ac' => $ac,
            'etc' => $etc,
            'eac' => $eac,
            'average_weekly_burn' => $avgBurn,
            'weeks_remaining' => $weeksRemaining,
            'projected_completion_date' => $projectedCompletionDate,
            'cpi' => $evm['cpi'],
            'spi' => $evm['spi'],
            'alerts' => $alerts,
        ];
    }
}

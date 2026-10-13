<?php

namespace App\Modules\AI\Services;

use App\Models\Project;
use App\Models\User;
use App\Modules\AI\Models\ProjectAnomaly;
use App\Modules\Financials\Models\ProjectCostSnapshot;
use App\Modules\Notifications\Services\NotificationDeliveryService;

class ProjectAnomalyDetectorService
{
    public function __construct(
        protected NotificationDeliveryService $notificationService
    ) {}

    public function detectAnomalies(string $tenantId, ?string $projectId = null): array
    {
        $query = Project::where('organization_id', $tenantId)->where('is_archived', false);
        if ($projectId) {
            $query->where('id', $projectId);
        }

        $projects = $query->get();
        $allAnomalies = [];

        foreach ($projects as $project) {
            $anomalies = $this->analyzeProject($project);
            $allAnomalies = array_merge($allAnomalies, $anomalies);
        }

        return $allAnomalies;
    }

    public function analyzeProject(Project $project): array
    {
        $detected = [];
        $snapshots = ProjectCostSnapshot::where('project_id', $project->id)
            ->orderByDesc('snapshot_date')
            ->take(30)
            ->get();

        if ($snapshots->count() < 7) {
            return []; // Insufficient baseline history
        }

        // Use weekly_burn_rate column
        $burnRates = $snapshots->pluck('weekly_burn_rate')->map(fn($v) => (float) $v)->toArray();
        $latestRate = array_shift($burnRates);

        if (count($burnRates) === 0) {
            return [];
        }

        $mean = array_sum($burnRates) / count($burnRates);
        $variance = array_sum(array_map(fn($x) => pow($x - $mean, 2), $burnRates)) / count($burnRates);
        $stdDev = sqrt($variance);

        if ($stdDev > 0) {
            $zScore = ($latestRate - $mean) / $stdDev;

            // Flag values > 3σ from rolling baseline
            if (abs($zScore) >= 3.0) {
                $anomaly = ProjectAnomaly::create([
                    'organization_id' => $project->organization_id,
                    'project_id' => $project->id,
                    'metric' => 'weekly_burn_rate',
                    'current_value' => $latestRate,
                    'baseline_mean' => $mean,
                    'baseline_stddev' => $stdDev,
                    'z_score' => round($zScore, 2),
                    'severity' => abs($zScore) >= 4.0 ? 'critical' : 'warning',
                    'explanation' => "Weekly burn rate of \${$latestRate} deviated by " . number_format($zScore, 1) . "σ from 30-day baseline mean (\${$mean}).",
                ]);

                // Fetch Project Manager via project_manager_id
                $pm = $project->project_manager_id ? User::find($project->project_manager_id) : null;
                if ($pm) {
                    $this->notificationService->dispatch(
                        $pm,
                        'anomaly.detected',
                        "Anomaly Alert: {$project->name}",
                        $anomaly->explanation,
                        "/projects/{$project->id}/financials",
                        null,
                        $project->id
                    );
                }

                $detected[] = $anomaly;
            }
        }

        return $detected;
    }
}

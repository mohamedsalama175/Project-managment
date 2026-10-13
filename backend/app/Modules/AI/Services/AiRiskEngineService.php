<?php

namespace App\Modules\AI\Services;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Models\User;
use App\Modules\Financials\Services\EvmCalculationService;

class AiRiskEngineService
{
    public function __construct(
        protected AiManagerService $aiManager,
        protected EvmCalculationService $evmService
    ) {}

    public function calculateProjectRisk(string $tenantId, ?User $user, string $projectId): array
    {
        // 1. Authorize budget & rate limits
        $this->aiManager->checkBudgetAndAuthorize($tenantId, $user, 'risk_prediction');

        $project = Project::where('organization_id', $tenantId)->findOrFail($projectId);

        // 2. Compute Structural Risk Metrics
        $totalTasks = Task::where('project_id', $projectId)->count();
        $completedTasks = Task::where('project_id', $projectId)->where('status', 'Completed')->count();
        $blockedTasks = Task::where('project_id', $projectId)->where('status', 'Blocked')->count();
        
        $overdueTasks = Task::where('project_id', $projectId)
            ->where('status', '!=', 'Completed')
            ->where('end_date', '<', now()->toDateString())
            ->count();

        // 3. Project Risks (using likelihood column)
        $criticalRisks = ProjectRisk::where('project_id', $projectId)
            ->where('status', 'open')
            ->where(function ($q) {
                $q->where('severity', 'critical')
                  ->orWhere('likelihood', 'high');
            })
            ->count();

        // 4. EVM Schedule Performance Index (SPI)
        $spi = 1.0;
        try {
            $evm = $this->evmService->calculateEvmMetrics($projectId);
            $spi = (float) ($evm['spi'] ?? 1.0);
        } catch (\Throwable $e) {
            // EVM fallback if baseline/rates incomplete
        }

        // 5. Weight Calculation & Score Synthesis
        $score = 15.0; // Base background uncertainty
        $factors = [];

        // Factor 1: Active Blockers
        if ($blockedTasks > 0) {
            $impact = min(30.0, $blockedTasks * 10.0);
            $score += $impact;
            $factors[] = [
                'factor' => 'Active Task Blockers',
                'weight' => round($impact, 1),
                'description' => "{$blockedTasks} task(s) currently marked as Blocked by dependencies or issues.",
                'mitigation_hint' => 'Review blocker roots in the Gantt critical path and reassign unblocked predecessors.',
            ];
        }

        // Factor 2: Schedule Drift & SPI
        if ($spi < 0.95) {
            $impact = min(25.0, (1.0 - $spi) * 50.0);
            $score += $impact;
            $factors[] = [
                'factor' => 'EVM Schedule Drift (SPI < 1.0)',
                'weight' => round($impact, 1),
                'description' => 'Current Schedule Performance Index is ' . number_format($spi, 2) . ', indicating pace behind planned baseline.',
                'mitigation_hint' => 'Perform resource leveling or compress critical path slack.',
            ];
        }

        // Factor 3: Overdue Deliverables
        if ($overdueTasks > 0) {
            $impact = min(25.0, $overdueTasks * 6.0);
            $score += $impact;
            $factors[] = [
                'factor' => 'Past-Due Tasks',
                'weight' => round($impact, 1),
                'description' => "{$overdueTasks} deliverable(s) have passed their scheduled end dates without reaching 100% completion.",
                'mitigation_hint' => 'Reschedule successors or trigger scope adjustment meetings with project stakeholders.',
            ];
        }

        // Factor 4: High Likelihood Project Risks
        if ($criticalRisks > 0) {
            $impact = min(20.0, $criticalRisks * 7.0);
            $score += $impact;
            $factors[] = [
                'factor' => 'Unmitigated Critical Risks',
                'weight' => round($impact, 1),
                'description' => "{$criticalRisks} open risk registers with High likelihood or Critical impact.",
                'mitigation_hint' => 'Execute documented mitigation response plans to lower risk likelihood.',
            ];
        }

        // Factor 5: Task Progress Velocity
        $completionPct = $totalTasks > 0 ? ($completedTasks / $totalTasks) * 100 : 0;
        if ($totalTasks > 10 && $completionPct < 20 && $project->created_at->diffInDays(now()) > 30) {
            $impact = 10.0;
            $score += $impact;
            $factors[] = [
                'factor' => 'Velocity Inertia',
                'weight' => 10.0,
                'description' => 'Low task graduation rate relative to project age.',
                'mitigation_hint' => 'Break down large WBS nodes into discrete subtasks with shorter feedback cycles.',
            ];
        }

        $normalizedScore = (int) min(100, max(5, round($score)));

        $riskLevel = match (true) {
            $normalizedScore >= 75 => 'critical',
            $normalizedScore >= 50 => 'high',
            $normalizedScore >= 25 => 'moderate',
            default => 'low',
        };

        // Sort top 5 factors by weight
        usort($factors, fn($a, $b) => $b['weight'] <=> $a['weight']);
        $topFactors = array_slice($factors, 0, 5);

        // Record usage
        $provider = $this->aiManager->resolveProvider($tenantId);
        $this->aiManager->recordUsage(
            $tenantId,
            $user,
            'risk_prediction',
            config('deliverops.ai.default_provider', 'openai'),
            'risk-engine-v1',
            50,
            50,
            0.0005,
            ['project_id' => $projectId, 'score' => $normalizedScore]
        );

        return [
            'project_id' => $projectId,
            'risk_score' => $normalizedScore,
            'risk_level' => $riskLevel,
            'top_factors' => $topFactors,
        ];
    }
}

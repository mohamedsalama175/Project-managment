<?php

namespace App\Modules\AI\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class AiSummarizationService
{
    public function __construct(
        protected AiManagerService $aiManager,
        protected PiiScrubberService $piiScrubber
    ) {}

    public function summarize(string $tenantId, ?User $user, string $scope, string $targetId, string $timeRange = '7d'): array
    {
        // 1. Authorize budget & rate limits
        $this->aiManager->checkBudgetAndAuthorize($tenantId, $user, 'summarization');

        // Check Cache for recent summary (1 hour TTL)
        $cacheKey = "ai_summary:{$tenantId}:{$scope}:{$targetId}:{$timeRange}";
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        // 2. Fetch Scope Context
        $contextData = [];
        if ($scope === 'project') {
            $project = Project::where('organization_id', $tenantId)->findOrFail($targetId);
            $tasks = Task::where('project_id', $targetId)
                ->select(['name', 'status', 'pct', 'priority', 'end_date'])
                ->take(30)
                ->get()
                ->toArray();

            $contextData = [
                'project_name' => $project->name,
                'code' => $project->code,
                'task_count' => count($tasks),
                'tasks' => $tasks,
            ];
        } elseif ($scope === 'task') {
            $task = Task::where('organization_id', $tenantId)->findOrFail($targetId);
            $contextData = [
                'task_name' => $task->name,
                'status' => $task->status,
                'pct' => $task->pct,
                'priority' => $task->priority,
                'category' => $task->category,
                'block_reason' => $task->block_reason,
            ];
        } else {
            // Portfolio
            $projects = Project::where('organization_id', $tenantId)->where('is_archived', false)->get(['id', 'name', 'code']);
            $contextData = [
                'active_projects_count' => $projects->count(),
                'projects' => $projects->toArray(),
            ];
        }

        // 3. Assemble Prompt & Scrub PII
        $rawPrompt = "You are an executive project management consultant. Generate an analytical executive summary for the following {$scope} context over the past {$timeRange}:\n"
            . json_encode($contextData) . "\n\n"
            . "Respond STRICTLY with a valid JSON object matching this schema:\n"
            . "{\n"
            . '  "headline": string,' . "\n"
            . '  "progress_summary": string,' . "\n"
            . '  "key_risks": [string],' . "\n"
            . '  "blockers": [string],' . "\n"
            . '  "recommended_actions": [string],' . "\n"
            . '  "generated_at": string' . "\n"
            . "}";

        $scrubbed = $this->piiScrubber->scrubText($rawPrompt);

        // 4. Query Provider
        $provider = $this->aiManager->resolveProvider($tenantId);
        $result = $provider->generateText($scrubbed['scrubbed_text'], ['temperature' => 0.3]);
        $rehydratedText = $this->piiScrubber->rehydrate($result['text'], $scrubbed['redaction_map']);

        // 5. Record Usage
        $cost = $provider->calculateCost($result['tokens_in'], $result['tokens_out'], $result['model']);
        $this->aiManager->recordUsage(
            $tenantId,
            $user,
            'summarization',
            config('deliverops.ai.default_provider', 'openai'),
            $result['model'],
            $result['tokens_in'],
            $result['tokens_out'],
            $cost,
            ['scope' => $scope, 'target_id' => $targetId]
        );

        // 6. Parse JSON Output
        $cleanJson = trim($rehydratedText);
        if (preg_match('/```json\s*(.*?)\s*```/s', $cleanJson, $matches)) {
            $cleanJson = $matches[1];
        }

        $decoded = json_decode($cleanJson, true) ?: [
            'headline' => 'Status Summary',
            'progress_summary' => 'Activity logged across project deliverables.',
            'key_risks' => [],
            'blockers' => [],
            'recommended_actions' => ['Review milestone critical path'],
            'generated_at' => now()->toIso8601String(),
        ];

        Cache::put($cacheKey, $decoded, 3600); // Cache for 1 hour

        return $decoded;
    }

    public function generateAndCacheWeeklyDigest(string $tenantId, string $projectId): array
    {
        return $this->summarize($tenantId, null, 'project', $projectId, '7d');
    }
}

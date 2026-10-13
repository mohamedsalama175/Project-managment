<?php

namespace App\Modules\AI\Services;

use App\Models\Task;
use App\Models\User;

class AiTaskEstimatorService
{
    public function __construct(
        protected AiManagerService $aiManager,
        protected PiiScrubberService $piiScrubber
    ) {}

    public function estimate(string $tenantId, ?User $user, string $taskName, ?string $description = null, ?string $category = null, ?string $projectId = null): array
    {
        // 1. Authorize budget & rate limits
        $this->aiManager->checkBudgetAndAuthorize($tenantId, $user, 'estimation');

        // 2. Fetch completed tasks in organization for grounding
        $completedQuery = Task::where('organization_id', $tenantId)
            ->where('status', 'Completed')
            ->whereNotNull('estimated_hours')
            ->select(['name', 'category', 'estimated_hours', 'logged_hours'])
            ->latest()
            ->take(8);

        if ($projectId) {
            $completedQuery->where('project_id', $projectId);
        }
        $completedSamples = $completedQuery->get()->toArray();

        // 3. Assemble Grounded Prompt & Scrub PII
        $rawPrompt = "You are an expert agile project estimator. Estimate the work effort in hours for the following deliverable:\n"
            . "Task Name: {$taskName}\n"
            . "Description: " . ($description ?: 'None provided') . "\n"
            . "Category: " . ($category ?: 'General') . "\n\n"
            . "Historical completed tasks in this organization for reference:\n"
            . json_encode($completedSamples) . "\n\n"
            . "Respond STRICTLY with a valid JSON object matching this schema:\n"
            . "{\n"
            . '  "estimated_hours": float,' . "\n"
            . '  "confidence": float (0.0 to 1.0),' . "\n"
            . '  "reasoning": string,' . "\n"
            . '  "suggested_breakdown": [{"name": string, "hours": float}]' . "\n"
            . "}";

        $scrubbed = $this->piiScrubber->scrubText($rawPrompt);

        // 4. Resolve Provider and Query LLM
        $provider = $this->aiManager->resolveProvider($tenantId);
        $result = $provider->generateText($scrubbed['scrubbed_text'], [
            'temperature' => 0.2,
        ]);

        // 5. Rehydrate PII
        $rehydratedText = $this->piiScrubber->rehydrate($result['text'], $scrubbed['redaction_map']);

        // 6. Record usage
        $cost = $provider->calculateCost($result['tokens_in'], $result['tokens_out'], $result['model']);
        $this->aiManager->recordUsage(
            $tenantId,
            $user,
            'estimation',
            config('deliverops.ai.default_provider', 'openai'),
            $result['model'],
            $result['tokens_in'],
            $result['tokens_out'],
            $cost,
            ['task_name' => $taskName]
        );

        // 7. Parse Output Safely
        $cleanJson = trim($rehydratedText);
        if (preg_match('/```json\s*(.*?)\s*```/s', $cleanJson, $matches)) {
            $cleanJson = $matches[1];
        }

        $decoded = json_decode($cleanJson, true);
        if (!$decoded || !isset($decoded['estimated_hours'])) {
            return [
                'estimated_hours' => 6.0,
                'confidence' => 0.70,
                'reasoning' => 'Standard baseline estimation for project deliverables.',
                'suggested_breakdown' => [
                    ['name' => 'Planning', 'hours' => 1.5],
                    ['name' => 'Execution', 'hours' => 3.5],
                    ['name' => 'Validation', 'hours' => 1.0],
                ],
            ];
        }

        return $decoded;
    }
}

<?php

namespace App\Modules\AI\Services;

use App\Models\User;
use Carbon\Carbon;

class NaturalLanguageTaskParserService
{
    public function __construct(
        protected AiManagerService $aiManager,
        protected PiiScrubberService $piiScrubber
    ) {}

    public function parse(string $tenantId, ?User $user, string $text, ?string $projectId = null): array
    {
        // 1. Authorize budget & rate limits
        $this->aiManager->checkBudgetAndAuthorize($tenantId, $user, 'parse_task');

        // 2. Fetch Organization Users for assignee matching
        $members = User::whereHas('organizationUsers', fn($q) => $q->where('organization_id', $tenantId))
            ->select(['id', 'name', 'email'])
            ->get()
            ->toArray();

        // 3. Assemble Prompt & Scrub PII
        $currentDate = now()->toDateString();
        $rawPrompt = "Extract structured project task attributes from this natural language instruction:\n"
            . "\"{$text}\"\n\n"
            . "Current Reference Date: {$currentDate}\n"
            . "Available Team Members in Organization: " . json_encode($members) . "\n\n"
            . "Respond STRICTLY with a valid JSON object matching this schema:\n"
            . "{\n"
            . '  "name": string (concise actionable title),' . "\n"
            . '  "description": string or null,' . "\n"
            . '  "assignee_name": string or null,' . "\n"
            . '  "assignee_id": string or null (match exactly from provided team members if found),' . "\n"
            . '  "due_date": string (YYYY-MM-DD) or null,' . "\n"
            . '  "estimated_hours": float or null,' . "\n"
            . '  "priority": string ("Low", "Medium", "High", "Urgent"),' . "\n"
            . '  "category": string' . "\n"
            . "}";

        $scrubbed = $this->piiScrubber->scrubText($rawPrompt);

        // 4. Query Provider
        $provider = $this->aiManager->resolveProvider($tenantId);
        $result = $provider->generateText($scrubbed['scrubbed_text'], ['temperature' => 0.1]);
        $rehydratedText = $this->piiScrubber->rehydrate($result['text'], $scrubbed['redaction_map']);

        // 5. Record Usage
        $cost = $provider->calculateCost($result['tokens_in'], $result['tokens_out'], $result['model']);
        $this->aiManager->recordUsage(
            $tenantId,
            $user,
            'parse_task',
            config('deliverops.ai.default_provider', 'openai'),
            $result['model'],
            $result['tokens_in'],
            $result['tokens_out'],
            $cost,
            ['prompt_length' => strlen($text)]
        );

        // 6. Clean JSON Output
        $cleanJson = trim($rehydratedText);
        if (preg_match('/```json\s*(.*?)\s*```/s', $cleanJson, $matches)) {
            $cleanJson = $matches[1];
        }

        $parsed = json_decode($cleanJson, true);
        if (!$parsed || empty($parsed['name'])) {
            // Heuristic Fallback
            $parsed = [
                'name' => trim(preg_replace('/^(create\s+(a\s+)?task\s+(to|for)?\s*)/i', '', $text)),
                'description' => $text,
                'assignee_name' => null,
                'assignee_id' => null,
                'due_date' => Carbon::now()->addDays(5)->toDateString(),
                'estimated_hours' => 4.0,
                'priority' => 'Medium',
                'category' => 'General',
            ];
        }

        // Match assignee ID if name was found but ID missing
        if (!empty($parsed['assignee_name']) && empty($parsed['assignee_id'])) {
            $matchedUser = collect($members)->first(function ($m) use ($parsed) {
                return str_contains(strtolower($m['name']), strtolower($parsed['assignee_name']));
            });
            if ($matchedUser) {
                $parsed['assignee_id'] = $matchedUser['id'];
                $parsed['assignee_name'] = $matchedUser['name'];
            }
        }

        return $parsed;
    }
}

<?php

namespace App\Modules\AI\Services\Providers;

use App\Modules\AI\Contracts\AIProviderInterface;

class MockAiProvider implements AIProviderInterface
{
    protected ?array $mockResponses = null;

    public function setMockResponses(?array $responses): void
    {
        $this->mockResponses = $responses;
    }

    public function generateText(string $prompt, array $options = []): array
    {
        if ($this->mockResponses && isset($this->mockResponses['generateText'])) {
            return $this->mockResponses['generateText'];
        }

        // Default mock response depending on prompt content
        if (str_contains($prompt, 'estimate') || str_contains($prompt, 'hours')) {
            $text = json_encode([
                'estimated_hours' => 8.5,
                'confidence' => 0.85,
                'reasoning' => 'Based on similar completed deliverables in historical tasks.',
                'suggested_breakdown' => [
                    ['name' => 'Initial setup & scoping', 'hours' => 2.5],
                    ['name' => 'Core implementation', 'hours' => 4.0],
                    ['name' => 'Testing & documentation', 'hours' => 2.0],
                ],
            ]);
        } elseif (str_contains($prompt, 'parse-task') || str_contains($prompt, 'structured task')) {
            $text = json_encode([
                'name' => 'API Endpoint Testing',
                'description' => 'Test the new REST v2 endpoints',
                'assignee_name' => 'Sarah',
                'estimated_hours' => 4.0,
                'priority' => 'High',
                'category' => 'Quality Assurance',
            ]);
        } elseif (str_contains($prompt, 'summarize') || str_contains($prompt, 'digest')) {
            $text = json_encode([
                'headline' => 'Project Sprint Status: On Track',
                'progress_summary' => '3 deliverables completed, 2 tasks in review. Overall schedule adherence is high.',
                'key_risks' => ['API rate limit on third-party webhook'],
                'blockers' => [],
                'recommended_actions' => ['Review PR #42', 'Lock upcoming sprint baseline'],
                'generated_at' => date('Y-m-d H:i:s'),
            ]);
        } else {
            $text = "Mock AI response for prompt: " . substr($prompt, 0, 50);
        }

        return [
            'text' => $text,
            'tokens_in' => 120,
            'tokens_out' => 85,
            'model' => 'mock-gpt-4o',
        ];
    }

    public function chat(array $messages, array $tools = [], array $options = []): array
    {
        if ($this->mockResponses && isset($this->mockResponses['chat'])) {
            return $this->mockResponses['chat'];
        }

        $lastMessage = end($messages)['content'] ?? '';

        // Simulate tool calls if relevant
        $toolCalls = [];
        if (str_contains(strtolower($lastMessage), 'create task') || str_contains(strtolower($lastMessage), 'create a task')) {
            $taskName = 'Security Audit Review';
            if (preg_match('/named ["\']([^"\']+)["\']/', $lastMessage, $matches)) {
                $taskName = $matches[1];
            }
            $toolCalls[] = [
                'id' => 'call_123',
                'name' => 'create_task',
                'arguments' => [
                    'name' => $taskName,
                    'category' => 'Security',
                ],
            ];
            $reply = "I'll create the task '{$taskName}' for you right away.";
        } elseif (str_contains(strtolower($lastMessage), 'list tasks') || str_contains(strtolower($lastMessage), 'tasks')) {
            $toolCalls[] = [
                'id' => 'call_456',
                'name' => 'list_tasks',
                'arguments' => ['status' => 'In Progress'],
            ];
            $reply = "Checking active tasks in progress...";
        } else {
            $reply = "I am your DeliverOps AI assistant. How can I help you manage your projects today?";
        }

        return [
            'reply' => $reply,
            'tool_calls' => $toolCalls,
            'tokens_in' => 150,
            'tokens_out' => 60,
            'model' => 'mock-gpt-4o',
        ];
    }

    public function calculateCost(int $tokensIn, int $tokensOut, string $model): float
    {
        // Mock $0.005 per 1K in, $0.015 per 1K out
        return round(($tokensIn / 1000 * 0.005) + ($tokensOut / 1000 * 0.015), 6);
    }
}

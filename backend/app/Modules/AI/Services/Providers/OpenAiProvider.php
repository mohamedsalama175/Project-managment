<?php

namespace App\Modules\AI\Services\Providers;

use App\Modules\AI\Contracts\AIProviderInterface;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OpenAiProvider implements AIProviderInterface
{
    public function __construct(protected ?string $apiKey = null)
    {
        $this->apiKey = $this->apiKey ?: config('services.openai.key');
    }

    public function generateText(string $prompt, array $options = []): array
    {
        if (empty($this->apiKey)) {
            throw new HttpException(503, 'OpenAI API key not configured for this organization.');
        }

        $model = $options['model'] ?? 'gpt-4o';
        $response = Http::withToken($this->apiKey)
            ->timeout(30)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'temperature' => $options['temperature'] ?? 0.3,
            ]);

        if (!$response->successful()) {
            throw new HttpException(502, 'OpenAI API request failed: ' . $response->body());
        }

        $json = $response->json();
        return [
            'text' => $json['choices'][0]['message']['content'] ?? '',
            'tokens_in' => $json['usage']['prompt_tokens'] ?? 0,
            'tokens_out' => $json['usage']['completion_tokens'] ?? 0,
            'model' => $model,
        ];
    }

    public function chat(array $messages, array $tools = [], array $options = []): array
    {
        if (empty($this->apiKey)) {
            throw new HttpException(503, 'OpenAI API key not configured for this organization.');
        }

        $model = $options['model'] ?? 'gpt-4o';
        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.3,
        ];

        if (!empty($tools)) {
            $payload['tools'] = array_map(fn($t) => ['type' => 'function', 'function' => $t], $tools);
        }

        $response = Http::withToken($this->apiKey)
            ->timeout(45)
            ->post('https://api.openai.com/v1/chat/completions', $payload);

        if (!$response->successful()) {
            throw new HttpException(502, 'OpenAI chat completion failed: ' . $response->body());
        }

        $json = $response->json();
        $message = $json['choices'][0]['message'] ?? [];
        $toolCalls = [];

        if (!empty($message['tool_calls'])) {
            foreach ($message['tool_calls'] as $tc) {
                $toolCalls[] = [
                    'id' => $tc['id'] ?? uniqid('call_'),
                    'name' => $tc['function']['name'] ?? '',
                    'arguments' => json_decode($tc['function']['arguments'] ?? '{}', true) ?: [],
                ];
            }
        }

        return [
            'reply' => $message['content'] ?? '',
            'tool_calls' => $toolCalls,
            'tokens_in' => $json['usage']['prompt_tokens'] ?? 0,
            'tokens_out' => $json['usage']['completion_tokens'] ?? 0,
            'model' => $model,
        ];
    }

    public function calculateCost(int $tokensIn, int $tokensOut, string $model): float
    {
        // Standard GPT-4o pricing: $2.50 per 1M tokens in, $10.00 per 1M tokens out
        return round(($tokensIn / 1_000_000 * 2.50) + ($tokensOut / 1_000_000 * 10.00), 6);
    }
}

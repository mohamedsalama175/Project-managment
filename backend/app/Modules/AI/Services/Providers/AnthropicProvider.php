<?php

namespace App\Modules\AI\Services\Providers;

use App\Modules\AI\Contracts\AIProviderInterface;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AnthropicProvider implements AIProviderInterface
{
    public function __construct(protected ?string $apiKey = null)
    {
        $this->apiKey = $this->apiKey ?: config('services.anthropic.key');
    }

    public function generateText(string $prompt, array $options = []): array
    {
        if (empty($this->apiKey)) {
            throw new HttpException(503, 'Anthropic API key not configured.');
        }

        $model = $options['model'] ?? 'claude-3-5-sonnet-20241022';
        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->timeout(30)->post('https://api.anthropic.com/v1/messages', [
            'model' => $model,
            'max_tokens' => 2048,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
        ]);

        if (!$response->successful()) {
            throw new HttpException(502, 'Anthropic request failed: ' . $response->body());
        }

        $json = $response->json();
        return [
            'text' => $json['content'][0]['text'] ?? '',
            'tokens_in' => $json['usage']['input_tokens'] ?? 0,
            'tokens_out' => $json['usage']['output_tokens'] ?? 0,
            'model' => $model,
        ];
    }

    public function chat(array $messages, array $tools = [], array $options = []): array
    {
        if (empty($this->apiKey)) {
            throw new HttpException(503, 'Anthropic API key not configured.');
        }

        $model = $options['model'] ?? 'claude-3-5-sonnet-20241022';
        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->timeout(45)->post('https://api.anthropic.com/v1/messages', [
            'model' => $model,
            'max_tokens' => 2048,
            'messages' => $messages,
        ]);

        if (!$response->successful()) {
            throw new HttpException(502, 'Anthropic chat request failed: ' . $response->body());
        }

        $json = $response->json();
        return [
            'reply' => $json['content'][0]['text'] ?? '',
            'tool_calls' => [],
            'tokens_in' => $json['usage']['input_tokens'] ?? 0,
            'tokens_out' => $json['usage']['output_tokens'] ?? 0,
            'model' => $model,
        ];
    }

    public function calculateCost(int $tokensIn, int $tokensOut, string $model): float
    {
        // Claude 3.5 Sonnet: $3.00/M in, $15.00/M out
        return round(($tokensIn / 1_000_000 * 3.00) + ($tokensOut / 1_000_000 * 15.00), 6);
    }
}

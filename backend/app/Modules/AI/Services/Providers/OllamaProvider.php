<?php

namespace App\Modules\AI\Services\Providers;

use App\Modules\AI\Contracts\AIProviderInterface;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OllamaProvider implements AIProviderInterface
{
    public function __construct(protected ?string $baseUrl = 'http://127.0.0.1:11434') {}

    public function generateText(string $prompt, array $options = []): array
    {
        $model = $options['model'] ?? 'llama3';
        $response = Http::timeout(60)->post("{$this->baseUrl}/api/generate", [
            'model' => $model,
            'prompt' => $prompt,
            'stream' => false,
        ]);

        if (!$response->successful()) {
            throw new HttpException(502, 'Local Ollama request failed: ' . $response->body());
        }

        $json = $response->json();
        return [
            'text' => $json['response'] ?? '',
            'tokens_in' => $json['prompt_eval_count'] ?? (int) (strlen($prompt) / 4),
            'tokens_out' => $json['eval_count'] ?? (int) (strlen($json['response'] ?? '') / 4),
            'model' => $model,
        ];
    }

    public function chat(array $messages, array $tools = [], array $options = []): array
    {
        $model = $options['model'] ?? 'llama3';
        $response = Http::timeout(60)->post("{$this->baseUrl}/api/chat", [
            'model' => $model,
            'messages' => $messages,
            'stream' => false,
        ]);

        if (!$response->successful()) {
            throw new HttpException(502, 'Local Ollama chat failed: ' . $response->body());
        }

        $json = $response->json();
        return [
            'reply' => $json['message']['content'] ?? '',
            'tool_calls' => [],
            'tokens_in' => $json['prompt_eval_count'] ?? 100,
            'tokens_out' => $json['eval_count'] ?? 50,
            'model' => $model,
        ];
    }

    public function calculateCost(int $tokensIn, int $tokensOut, string $model): float
    {
        // Local Ollama hosted inference has zero vendor token API cost
        return 0.000000;
    }
}

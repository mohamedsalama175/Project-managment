<?php

namespace App\Modules\AI\Services\Providers;

use App\Modules\AI\Contracts\AIProviderInterface;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\HttpException;

class GoogleGeminiProvider implements AIProviderInterface
{
    public function __construct(protected ?string $apiKey = null)
    {
        $this->apiKey = $this->apiKey ?: config('services.gemini.key');
    }

    public function generateText(string $prompt, array $options = []): array
    {
        if (empty($this->apiKey)) {
            throw new HttpException(503, 'Google Gemini API key not configured.');
        }

        $model = $options['model'] ?? 'gemini-1.5-pro';
        $response = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$this->apiKey}", [
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
        ]);

        if (!$response->successful()) {
            throw new HttpException(502, 'Gemini request failed: ' . $response->body());
        }

        $json = $response->json();
        $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $tokensIn = $json['usageMetadata']['promptTokenCount'] ?? (int) (strlen($prompt) / 4);
        $tokensOut = $json['usageMetadata']['candidatesTokenCount'] ?? (int) (strlen($text) / 4);

        return [
            'text' => $text,
            'tokens_in' => $tokensIn,
            'tokens_out' => $tokensOut,
            'model' => $model,
        ];
    }

    public function chat(array $messages, array $tools = [], array $options = []): array
    {
        return $this->generateText(end($messages)['content'] ?? '', $options);
    }

    public function calculateCost(int $tokensIn, int $tokensOut, string $model): float
    {
        // Gemini 1.5 Pro: $1.25/M in, $5.00/M out
        return round(($tokensIn / 1_000_000 * 1.25) + ($tokensOut / 1_000_000 * 5.00), 6);
    }
}

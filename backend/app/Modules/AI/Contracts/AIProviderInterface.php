<?php

namespace App\Modules\AI\Contracts;

interface AIProviderInterface
{
    /**
     * Generate text from a prompt
     *
     * @param string $prompt
     * @param array $options
     * @return array ['text' => string, 'tokens_in' => int, 'tokens_out' => int, 'model' => string]
     */
    public function generateText(string $prompt, array $options = []): array;

    /**
     * Multi-turn chat completion with tool calling support
     *
     * @param array $messages
     * @param array $tools
     * @param array $options
     * @return array ['reply' => string, 'tool_calls' => array, 'tokens_in' => int, 'tokens_out' => int, 'model' => string]
     */
    public function chat(array $messages, array $tools = [], array $options = []): array;

    /**
     * Calculate cost in USD based on input/output tokens and model
     *
     * @param int $tokensIn
     * @param int $tokensOut
     * @param string $model
     * @return float
     */
    public function calculateCost(int $tokensIn, int $tokensOut, string $model): float;
}

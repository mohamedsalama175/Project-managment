<?php

namespace App\Modules\AI\Services;

class PiiScrubberService
{
    public const TOKEN_PREFIX = '__DELIVER_OPS_TOK_';

    /**
     * Redact sensitive personal identifers (Emails, Delimited Phone Numbers, IPs)
     *
     * @param string $input
     * @return array ['scrubbed_text' => string, 'redaction_map' => array]
     */
    public function scrubText(string $input): array
    {
        $map = [];
        $index = 1;

        // 1. Email Redaction
        $scrubbed = preg_replace_callback('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', function ($m) use (&$map, &$index) {
            $token = self::TOKEN_PREFIX . "EMAIL_{$index}__";
            $map[$token] = $m[0];
            $index++;
            return $token;
        }, $input);

        // 2. Delimited Phone Redaction (requires delimiter: -, ., space)
        $scrubbed = preg_replace_callback('/(?:\+?\d{1,3}[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/', function ($m) use (&$map, &$index) {
            $token = self::TOKEN_PREFIX . "PHONE_{$index}__";
            $map[$token] = $m[0];
            $index++;
            return $token;
        }, $scrubbed);

        // 3. IPv4 / IPv6 Redaction
        $scrubbed = preg_replace_callback('/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/', function ($m) use (&$map, &$index) {
            $token = self::TOKEN_PREFIX . "IP_{$index}__";
            $map[$token] = $m[0];
            $index++;
            return $token;
        }, $scrubbed);

        return [
            'scrubbed_text' => $scrubbed,
            'redaction_map' => $map,
        ];
    }

    /**
     * Rehydrate tokens back to original values in LLM response
     */
    public function rehydrate(string $text, array $map): string
    {
        if (empty($map)) {
            return $text;
        }

        return strtr($text, $map);
    }
}

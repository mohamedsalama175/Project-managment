<?php

namespace App\Modules\Automation\Services;

class TemplateResolver
{
    /**
     * Recursively resolve {{path}} placeholders within strings, arrays, and nested structures.
     */
    public function resolve(mixed $template, array $context): mixed
    {
        if (is_string($template)) {
            return $this->resolveString($template, $context);
        }

        if (is_array($template)) {
            $resolved = [];
            foreach ($template as $key => $value) {
                $resolvedKey = is_string($key) ? $this->resolveString($key, $context) : $key;
                $resolved[$resolvedKey] = $this->resolve($value, $context);
            }
            return $resolved;
        }

        return $template;
    }

    /**
     * Resolves {{variable.path}} tokens within a string against context using dot notation.
     */
    public function resolveString(string $template, array $context): mixed
    {
        // If string is strictly an exact token e.g. "{{task.id}}", return the direct type (int, float, etc.)
        if (preg_match('/^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/', $template, $matches)) {
            $value = data_get($context, $matches[1]);
            return $value !== null ? $value : '';
        }

        return preg_replace_callback('/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/', function ($matches) use ($context) {
            $val = data_get($context, $matches[1]);
            if (is_null($val)) {
                return '';
            }
            if (is_bool($val)) {
                return $val ? 'true' : 'false';
            }
            if (is_scalar($val) || (is_object($val) && method_exists($val, '__toString'))) {
                return (string) $val;
            }
            return json_encode($val);
        }, $template);
    }
}

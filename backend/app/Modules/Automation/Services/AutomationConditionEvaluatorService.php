<?php

namespace App\Modules\Automation\Services;

class AutomationConditionEvaluatorService
{
    /**
     * Evaluates a set of conditions against a contextual payload.
     * All conditions must evaluate to true (AND logic).
     */
    public function evaluateAll(array $conditions, array $payload): bool
    {
        if (empty($conditions)) {
            return true;
        }

        foreach ($conditions as $condition) {
            if (!$this->evaluateSingle($condition, $payload)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Evaluates a single condition against the payload.
     */
    public function evaluateSingle(array $condition, array $payload): bool
    {
        $field = $condition['field'] ?? null;
        $operator = strtolower(trim($condition['operator'] ?? 'equals'));
        $expectedValue = $condition['value'] ?? null;

        if (!$field) {
            return true;
        }

        $actualValue = data_get($payload, $field);

        return match ($operator) {
            'equals', 'eq', '==' => $actualValue == $expectedValue,
            'not_equals', 'neq', '!=' => $actualValue != $expectedValue,
            'greater_than', 'gt', '>' => (float) $actualValue > (float) $expectedValue,
            'greater_than_or_equal', 'gte', '>=' => (float) $actualValue >= (float) $expectedValue,
            'less_than', 'lt', '<' => (float) $actualValue < (float) $expectedValue,
            'less_than_or_equal', 'lte', '<=' => (float) $actualValue <= (float) $expectedValue,
            'contains' => str_contains(strtolower((string) $actualValue), strtolower((string) $expectedValue)),
            'not_contains' => !str_contains(strtolower((string) $actualValue), strtolower((string) $expectedValue)),
            'starts_with' => str_starts_with(strtolower((string) $actualValue), strtolower((string) $expectedValue)),
            'ends_with' => str_ends_with(strtolower((string) $actualValue), strtolower((string) $expectedValue)),
            'in' => in_array($actualValue, (array) $expectedValue),
            'not_in' => !in_array($actualValue, (array) $expectedValue),
            'is_empty', 'empty' => empty($actualValue),
            'is_not_empty', 'not_empty' => !empty($actualValue),
            default => false,
        };
    }
}

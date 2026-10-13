<?php

namespace App\Modules\Automation\Services;

use App\Modules\Automation\Jobs\ExecuteAutomationRuleJob;
use App\Modules\Automation\Models\AutomationRule;
use Illuminate\Support\Facades\Cache;

class AutomationEngineService
{
    /**
     * Ingest an event and trigger matching automation rules with atomic 60s deduplication.
     */
    public function trigger(string $tenantId, string $eventName, array $payload, int $depth = 1): array
    {
        if ($depth > ExecuteAutomationRuleJob::MAX_DEPTH) {
            return [];
        }

        // 1. Atomic 60-Second Deduplication
        $eventHash = md5($eventName . ':' . json_encode($payload));
        $dedupKey = "automation_dedup:{$tenantId}:{$eventHash}";
        if (!Cache::add($dedupKey, true, 60)) {
            return []; // Duplicate within 60s suppressed
        }

        // 2. Fetch Active Tenant Rules
        $query = AutomationRule::withoutGlobalScopes()
            ->where('organization_id', $tenantId)
            ->where('enabled', true);

        $payloadProjectId = data_get($payload, 'project.id') ?? data_get($payload, 'project_id');
        if ($payloadProjectId) {
            $query->where(function ($q) use ($payloadProjectId) {
                $q->whereNull('project_id')
                  ->orWhere('project_id', $payloadProjectId);
            });
        }

        $rules = $query->get();
        $dispatchedRules = [];

        foreach ($rules as $rule) {
            $ruleTriggerEvent = data_get($rule->trigger, 'event');
            if ($ruleTriggerEvent === $eventName) {
                ExecuteAutomationRuleJob::dispatch(
                    $tenantId,
                    $rule->id,
                    $payload,
                    $depth,
                    $eventHash
                );
                $dispatchedRules[] = $rule->id;
            }
        }

        return $dispatchedRules;
    }
}

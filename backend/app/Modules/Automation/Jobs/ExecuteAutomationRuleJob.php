<?php

namespace App\Modules\Automation\Jobs;

use App\Jobs\TenantAwareJob;
use App\Modules\Automation\Models\AutomationRule;
use App\Modules\Automation\Models\AutomationRun;
use App\Modules\Automation\Services\AutomationActionDispatcherService;
use App\Modules\Automation\Services\AutomationConditionEvaluatorService;
use Illuminate\Support\Facades\Log;

class ExecuteAutomationRuleJob extends TenantAwareJob
{
    public const MAX_DEPTH = 5;

    public function __construct(
        string $organizationId,
        public string $ruleId,
        public array $payload = [],
        public int $depth = 1,
        public ?string $triggerEventId = null
    ) {
        parent::__construct($organizationId);
    }

    protected function executeInTenantContext(): void
    {
        $startTime = hrtime(true);

        // 1. Guard against infinite automation cycles
        if ($this->depth > self::MAX_DEPTH) {
            Log::warning("Automation execution exceeded max recursion depth of " . self::MAX_DEPTH, [
                'rule_id' => $this->ruleId,
                'depth' => $this->depth,
            ]);

            AutomationRun::create([
                'organization_id' => $this->organizationId,
                'rule_id' => $this->ruleId,
                'trigger_event_id' => $this->triggerEventId,
                'status' => 'skipped',
                'depth' => $this->depth,
                'error_message' => 'Recursion depth limit exceeded (max 5)',
                'duration_ms' => 0,
                'executed_at' => now(),
            ]);

            return;
        }

        // 2. Fetch Rule
        $rule = AutomationRule::where('organization_id', $this->organizationId)->find($this->ruleId);
        if (!$rule || !$rule->enabled) {
            return;
        }

        /** @var AutomationConditionEvaluatorService $evaluator */
        $evaluator = app(AutomationConditionEvaluatorService::class);
        /** @var AutomationActionDispatcherService $dispatcher */
        $dispatcher = app(AutomationActionDispatcherService::class);

        // 3. Evaluate Conditions
        $conditionsPass = $evaluator->evaluateAll($rule->conditions ?? [], $this->payload);

        if (!$conditionsPass) {
            $durationMs = (int) round((hrtime(true) - $startTime) / 1e6);
            AutomationRun::create([
                'organization_id' => $this->organizationId,
                'rule_id' => $rule->id,
                'trigger_event_id' => $this->triggerEventId,
                'status' => 'skipped',
                'depth' => $this->depth,
                'output' => ['reason' => 'Conditions evaluated to false'],
                'duration_ms' => $durationMs,
                'executed_at' => now(),
            ]);
            return;
        }

        // 4. Dispatch Actions
        try {
            $results = $dispatcher->dispatchActions($this->organizationId, $rule->actions ?? [], $this->payload);
            $durationMs = (int) round((hrtime(true) - $startTime) / 1e6);

            $hasFailures = collect($results)->contains(fn($r) => ($r['status'] ?? '') === 'failed');

            AutomationRun::create([
                'organization_id' => $this->organizationId,
                'rule_id' => $rule->id,
                'trigger_event_id' => $this->triggerEventId,
                'status' => $hasFailures ? 'failed' : 'success',
                'depth' => $this->depth,
                'output' => ['actions' => $results],
                'error_message' => $hasFailures ? 'One or more actions encountered errors' : null,
                'duration_ms' => $durationMs,
                'executed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $durationMs = (int) round((hrtime(true) - $startTime) / 1e6);
            AutomationRun::create([
                'organization_id' => $this->organizationId,
                'rule_id' => $rule->id,
                'trigger_event_id' => $this->triggerEventId,
                'status' => 'failed',
                'depth' => $this->depth,
                'error_message' => $e->getMessage(),
                'duration_ms' => $durationMs,
                'executed_at' => now(),
            ]);
        }
    }
}

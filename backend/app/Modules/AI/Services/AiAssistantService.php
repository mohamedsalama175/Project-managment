<?php

namespace App\Modules\AI\Services;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Models\User;
use App\Modules\AI\Models\AiActionLog;
use App\Modules\Financials\Services\EvmCalculationService;
use App\Modules\Resources\Services\CapacityForecastService;
use Carbon\Carbon;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AiAssistantService
{
    public function __construct(
        protected AiManagerService $aiManager,
        protected PiiScrubberService $piiScrubber,
        protected EvmCalculationService $evmService,
        protected CapacityForecastService $capacityService
    ) {}

    public function getRegisteredTools(): array
    {
        return [
            [
                'name' => 'list_tasks',
                'description' => 'List tasks in the current project filtered optionally by status',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'string'],
                        'status' => ['type' => 'string'],
                    ],
                    'required' => ['project_id'],
                ],
            ],
            [
                'name' => 'get_project',
                'description' => 'Get project details, baseline status, and budget metadata',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'string'],
                    ],
                    'required' => ['project_id'],
                ],
            ],
            [
                'name' => 'create_task',
                'description' => 'Create a new project task (reversible action)',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'string'],
                        'name' => ['type' => 'string'],
                        'category' => ['type' => 'string'],
                        'start_date' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                        'end_date' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                        'priority' => ['type' => 'string', 'enum' => ['Low', 'Medium', 'High', 'Urgent']],
                    ],
                    'required' => ['project_id', 'name'],
                ],
            ],
            [
                'name' => 'update_task',
                'description' => 'Update an existing task status, dates, or priority (reversible action)',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'task_id' => ['type' => 'string'],
                        'status' => ['type' => 'string'],
                        'pct' => ['type' => 'integer'],
                        'priority' => ['type' => 'string'],
                    ],
                    'required' => ['task_id'],
                ],
            ],
            [
                'name' => 'get_risks',
                'description' => 'Get project risk registers and severity levels',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'string'],
                    ],
                    'required' => ['project_id'],
                ],
            ],
            [
                'name' => 'get_evm',
                'description' => 'Get Earned Value Management metrics (PV, EV, AC, CPI, SPI)',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'string'],
                    ],
                    'required' => ['project_id'],
                ],
            ],
        ];
    }

    public function chat(string $tenantId, User $user, array $messages, ?string $projectId = null): array
    {
        // 1. Authorize budget & rate limits
        $this->aiManager->checkBudgetAndAuthorize($tenantId, $user, 'chat');

        // 2. Resolve Provider
        $provider = $this->aiManager->resolveProvider($tenantId);
        $tools = $this->getRegisteredTools();

        // 3. Dispatch chat with tools
        $result = $provider->chat($messages, $tools, ['temperature' => 0.2]);

        $actionsTaken = [];
        $toolExecutionOutput = [];

        // 4. Execute tool calls safely
        if (!empty($result['tool_calls'])) {
            foreach ($result['tool_calls'] as $toolCall) {
                $toolName = $toolCall['name'];
                $args = $toolCall['arguments'];

                if ($projectId && empty($args['project_id'])) {
                    $args['project_id'] = $projectId;
                }

                $toolOutput = $this->executeTool($tenantId, $user, $toolName, $args, $actionsTaken);
                $toolExecutionOutput[] = [
                    'tool' => $toolName,
                    'output' => $toolOutput,
                ];
            }
        }

        // 5. Record Usage
        $cost = $provider->calculateCost($result['tokens_in'], $result['tokens_out'], $result['model']);
        $this->aiManager->recordUsage(
            $tenantId,
            $user,
            'chat',
            config('deliverops.ai.default_provider', 'openai'),
            $result['model'],
            $result['tokens_in'],
            $result['tokens_out'],
            $cost,
            ['messages_count' => count($messages)]
        );

        return [
            'reply' => $result['reply'],
            'actions_taken' => $actionsTaken,
            'tool_executions' => $toolExecutionOutput,
        ];
    }

    protected function executeTool(string $tenantId, User $user, string $toolName, array $args, array &$actionsTaken): mixed
    {
        switch ($toolName) {
            case 'list_tasks':
                $q = Task::where('organization_id', $tenantId);
                if (!empty($args['project_id'])) $q->where('project_id', $args['project_id']);
                if (!empty($args['status'])) $q->where('status', $args['status']);
                return $q->take(15)->get(['id', 'name', 'status', 'pct', 'priority'])->toArray();

            case 'get_project':
                return Project::where('organization_id', $tenantId)->find($args['project_id'])?->toArray();

            case 'create_task':
                $task = Task::create([
                    'organization_id' => $tenantId,
                    'project_id' => $args['project_id'],
                    'name' => $args['name'],
                    'category' => $args['category'] ?? 'General',
                    'start_date' => $args['start_date'] ?? now()->toDateString(),
                    'end_date' => $args['end_date'] ?? now()->addDays(3)->toDateString(),
                    'priority' => $args['priority'] ?? 'Medium',
                    'status' => 'Not Started',
                    'pct' => 0,
                ]);

                $log = AiActionLog::create([
                    'organization_id' => $tenantId,
                    'user_id' => $user->id,
                    'user_name_snapshot' => $user->name,
                    'action_type' => 'create_task',
                    'target_type' => Task::class,
                    'target_id' => $task->id,
                    'previous_state' => null,
                    'new_state' => $task->toArray(),
                ]);

                $actionsTaken[] = [
                    'action_log_id' => $log->id,
                    'action_type' => 'create_task',
                    'target_id' => $task->id,
                    'description' => "Created task '{$task->name}'",
                ];
                return ['task_id' => $task->id, 'created' => true];

            case 'update_task':
                $task = Task::where('organization_id', $tenantId)->findOrFail($args['task_id']);
                $prev = $task->toArray();

                $updateData = [];
                if (isset($args['status'])) $updateData['status'] = $args['status'];
                if (isset($args['pct'])) $updateData['pct'] = $args['pct'];
                if (isset($args['priority'])) $updateData['priority'] = $args['priority'];

                $task->update($updateData);

                $log = AiActionLog::create([
                    'organization_id' => $tenantId,
                    'user_id' => $user->id,
                    'user_name_snapshot' => $user->name,
                    'action_type' => 'update_task',
                    'target_type' => Task::class,
                    'target_id' => $task->id,
                    'previous_state' => $prev,
                    'new_state' => $task->fresh()->toArray(),
                ]);

                $actionsTaken[] = [
                    'action_log_id' => $log->id,
                    'action_type' => 'update_task',
                    'target_id' => $task->id,
                    'description' => "Updated task '{$task->name}'",
                ];
                return ['task_id' => $task->id, 'updated' => true];

            case 'get_risks':
                return ProjectRisk::where('organization_id', $tenantId)
                    ->where('project_id', $args['project_id'])
                    ->get(['id', 'title', 'severity', 'likelihood', 'status'])
                    ->toArray();

            case 'get_evm':
                return $this->evmService->calculateEvmMetrics($args['project_id']);

            default:
                return ['error' => 'Unknown tool'];
        }
    }

    public function rollbackAction(string $tenantId, User $revertingUser, string $actionLogId): array
    {
        $log = AiActionLog::where('organization_id', $tenantId)->findOrFail($actionLogId);

        if ($log->is_reverted) {
            throw new HttpException(400, 'This action has already been reverted.');
        }

        if ($log->action_type === 'create_task') {
            $task = Task::where('organization_id', $tenantId)->find($log->target_id);
            if ($task) {
                $task->delete();
            }
        } elseif ($log->action_type === 'update_task') {
            $task = Task::where('organization_id', $tenantId)->find($log->target_id);
            if ($task && !empty($log->previous_state)) {
                $task->update([
                    'status' => $log->previous_state['status'] ?? $task->status,
                    'pct' => $log->previous_state['pct'] ?? $task->pct,
                    'priority' => $log->previous_state['priority'] ?? $task->priority,
                ]);
            }
        }

        $log->update([
            'is_reverted' => true,
            'reverted_at' => now(),
            'reverted_by_id' => $revertingUser->id,
        ]);

        return [
            'action_log_id' => $log->id,
            'reverted' => true,
            'reverted_at' => $log->reverted_at->toIso8601String(),
        ];
    }
}

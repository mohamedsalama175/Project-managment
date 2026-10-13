<?php

namespace App\Modules\Automation\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Integrations\Services\WebhookDispatcherService;
use App\Modules\Notifications\Services\NotificationDeliveryService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AutomationActionDispatcherService
{
    public function __construct(
        protected TemplateResolver $templateResolver,
        protected NotificationDeliveryService $notificationService,
        protected WebhookDispatcherService $webhookDispatcher
    ) {}

    /**
     * Dispatches a list of configured automation actions for a tenant within a given context.
     */
    public function dispatchActions(string $tenantId, array $actions, array $context): array
    {
        $results = [];

        foreach ($actions as $index => $action) {
            $type = $action['type'] ?? 'unknown';
            $rawParams = $action['params'] ?? [];

            // Resolve {{path}} tokens in parameters using TemplateResolver
            $resolvedParams = $this->templateResolver->resolve($rawParams, $context);

            try {
                $output = $this->executeAction($tenantId, $type, $resolvedParams, $context);
                $results[] = [
                    'index' => $index,
                    'type' => $type,
                    'status' => 'success',
                    'output' => $output,
                ];
            } catch (\Throwable $e) {
                Log::warning("Automation action failed: {$type}", [
                    'tenant_id' => $tenantId,
                    'error' => $e->getMessage(),
                ]);
                $results[] = [
                    'index' => $index,
                    'type' => $type,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    /**
     * Executes an individual automation action.
     */
    protected function executeAction(string $tenantId, string $type, array $params, array $context): mixed
    {
        return match ($type) {
            'send_notification' => $this->handleSendNotification($tenantId, $params, $context),
            'update_task' => $this->handleUpdateTask($tenantId, $params, $context),
            'create_task' => $this->handleCreateTask($tenantId, $params, $context),
            'webhook' => $this->handleWebhook($tenantId, $params, $context),
            'call_webhook' => $this->handleCallWebhook($params),
            'log' => $this->handleLog($params),
            default => ['skipped' => true, 'reason' => "Unsupported action type: {$type}"],
        };
    }

    protected function handleSendNotification(string $tenantId, array $params, array $context): array
    {
        $userId = $params['user_id'] ?? data_get($context, 'task.assignee_id') ?? data_get($context, 'user.id');
        $recipient = $userId ? User::find($userId) : null;

        if (!$recipient) {
            return ['status' => 'skipped', 'reason' => 'No valid recipient found'];
        }

        $title = $params['title'] ?? 'Automated Notification';
        $message = $params['message'] ?? 'DeliverOps automation rule triggered.';
        $actionUrl = $params['action_url'] ?? null;
        $taskId = $params['task_id'] ?? data_get($context, 'task.id');
        $projectId = $params['project_id'] ?? data_get($context, 'project.id');

        $this->notificationService->dispatch(
            recipient: $recipient,
            eventType: 'automation.action',
            title: $title,
            body: $message,
            actionUrl: $actionUrl,
            taskId: $taskId,
            projectId: $projectId
        );

        return [
            'status' => 'delivered',
            'recipient_id' => $recipient->id,
            'title' => $title,
        ];
    }

    protected function handleUpdateTask(string $tenantId, array $params, array $context): array
    {
        $taskId = $params['task_id'] ?? data_get($context, 'task.id');
        if (!$taskId) {
            return ['status' => 'skipped', 'reason' => 'Missing task ID'];
        }

        $task = Task::where('organization_id', $tenantId)->findOrFail($taskId);

        $updates = [];
        if (isset($params['status'])) $updates['status'] = $params['status'];
        if (isset($params['pct'])) $updates['pct'] = (int) $params['pct'];
        if (isset($params['priority'])) $updates['priority'] = $params['priority'];
        if (isset($params['category'])) $updates['category'] = $params['category'];
        if (isset($params['assignee_id'])) $updates['assignee_id'] = $params['assignee_id'];

        if (!empty($updates)) {
            $task->update($updates);
        }

        return [
            'status' => 'updated',
            'task_id' => $task->id,
            'changes' => $updates,
        ];
    }

    protected function handleCreateTask(string $tenantId, array $params, array $context): array
    {
        $projectId = $params['project_id'] ?? data_get($context, 'project.id');
        if (!$projectId) {
            return ['status' => 'skipped', 'reason' => 'Missing project ID'];
        }

        $task = Task::create([
            'organization_id' => $tenantId,
            'project_id' => $projectId,
            'name' => $params['name'] ?? 'Automated Task',
            'category' => $params['category'] ?? 'General',
            'priority' => $params['priority'] ?? 'Medium',
            'status' => $params['status'] ?? 'Not Started',
            'pct' => 0,
            'start_date' => $params['start_date'] ?? now()->toDateString(),
            'end_date' => $params['end_date'] ?? now()->addDays(5)->toDateString(),
            'assignee_id' => $params['assignee_id'] ?? null,
        ]);

        return [
            'status' => 'created',
            'task_id' => $task->id,
            'name' => $task->name,
        ];
    }

    protected function handleWebhook(string $tenantId, array $params, array $context): array
    {
        $eventName = $params['event_name'] ?? 'automation.triggered';
        $payload = array_merge($context, $params['payload'] ?? []);

        $deliveries = $this->webhookDispatcher->dispatch($eventName, $payload, $tenantId);

        return [
            'status' => 'dispatched',
            'delivery_count' => count($deliveries),
        ];
    }

    protected function handleCallWebhook(array $params): array
    {
        $url = $params['url'] ?? null;
        if (!$url) {
            return ['status' => 'skipped', 'reason' => 'Missing webhook URL'];
        }

        $response = Http::timeout(10)->post($url, $params['body'] ?? []);

        return [
            'status' => $response->successful() ? 'delivered' : 'failed',
            'http_code' => $response->status(),
        ];
    }

    protected function handleLog(array $params): array
    {
        $message = $params['message'] ?? 'Automation log';
        Log::info("[Automation Engine Log] {$message}", $params);

        return [
            'status' => 'logged',
            'message' => $message,
        ];
    }
}

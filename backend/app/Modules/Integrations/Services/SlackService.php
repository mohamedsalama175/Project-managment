<?php

namespace App\Modules\Integrations\Services;

use App\Modules\Integrations\Models\IntegrationConnection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SlackService
{
    /**
     * Post a notification to Slack via incoming webhook or stored connection.
     */
    public function sendNotification(string $organizationId, string $message, ?array $blocks = null): bool
    {
        $connection = IntegrationConnection::where('organization_id', $organizationId)
            ->where('provider', 'slack')
            ->where('status', 'connected')
            ->first();

        if (!$connection) {
            return false;
        }

        $webhookUrl = $connection->settings['webhook_url'] ?? null;
        if (!$webhookUrl) {
            return false;
        }

        $payload = [
            'text' => $message,
        ];

        if ($blocks) {
            $payload['blocks'] = $blocks;
        }

        try {
            $response = Http::timeout(5)->post($webhookUrl, $payload);
            return $response->successful();
        } catch (\Exception $e) {
            Log::warning('Slack notification delivery failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Format a project/task event into rich Slack blocks.
     */
    public function formatTaskNotification(string $taskTitle, string $projectName, string $action, ?string $actorName = null): array
    {
        return [
            [
                'type' => 'section',
                'text' => [
                    'type' => 'mrkdwn',
                    'text' => "*DeliverOps Update:* Task `{$taskTitle}` in *{$projectName}* was {$action}." . ($actorName ? " by {$actorName}." : ''),
                ],
            ],
        ];
    }
}

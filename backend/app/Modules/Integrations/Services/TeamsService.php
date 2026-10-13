<?php

namespace App\Modules\Integrations\Services;

use App\Modules\Integrations\Models\IntegrationConnection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TeamsService
{
    /**
     * Send Adaptive Card or message to Microsoft Teams incoming webhook.
     */
    public function sendNotification(string $organizationId, string $title, string $message, ?array $facts = null): bool
    {
        $connection = IntegrationConnection::where('organization_id', $organizationId)
            ->where('provider', 'teams')
            ->where('status', 'connected')
            ->first();

        if (!$connection) {
            return false;
        }

        $webhookUrl = $connection->settings['webhook_url'] ?? null;
        if (!$webhookUrl) {
            return false;
        }

        $cardFacts = [];
        if ($facts) {
            foreach ($facts as $name => $value) {
                $cardFacts[] = ['name' => $name, 'value' => (string) $value];
            }
        }

        $payload = [
            '@type' => 'MessageCard',
            '@context' => 'http://schema.org/extensions',
            'themeColor' => '6366F1',
            'summary' => $title,
            'sections' => [
                [
                    'activityTitle' => $title,
                    'activitySubtitle' => 'DeliverOps Notification',
                    'text' => $message,
                    'facts' => $cardFacts,
                    'markdown' => true,
                ],
            ],
        ];

        try {
            $response = Http::timeout(5)->post($webhookUrl, $payload);
            return $response->successful();
        } catch (\Exception $e) {
            Log::warning('Microsoft Teams notification failed', ['error' => $e->getMessage()]);
            return false;
        }
    }
}

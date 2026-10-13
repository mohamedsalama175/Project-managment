<?php

namespace App\Modules\Integrations\Services;

use App\Modules\Integrations\Jobs\DeliverWebhookJob;
use App\Modules\Integrations\Models\WebhookDelivery;
use App\Modules\Integrations\Models\WebhookEndpoint;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WebhookDispatcherService
{
    public const RETRY_DELAYS = [
        1 => 60,       // 1 minute
        2 => 300,      // 5 minutes
        3 => 1800,     // 30 minutes
        4 => 7200,     // 2 hours
        5 => 43200,    // 12 hours
    ];

    /**
     * Dispatch an event to all subscribed active webhooks for an organization.
     */
    public function dispatch(string $eventName, array $payload, string $organizationId): array
    {
        $endpoints = WebhookEndpoint::where('organization_id', $organizationId)
            ->where('active', true)
            ->get();

        $deliveries = [];

        foreach ($endpoints as $endpoint) {
            if (!$endpoint->subscribesTo($eventName)) {
                continue;
            }

            $delivery = WebhookDelivery::create([
                'id' => (string) Str::ulid(),
                'webhook_endpoint_id' => $endpoint->id,
                'event_name' => $eventName,
                'payload' => $payload,
                'status' => 'pending',
                'attempt_count' => 0,
                'created_at' => now(),
            ]);

            DeliverWebhookJob::dispatch($delivery->id);
            $deliveries[] = $delivery;
        }

        return $deliveries;
    }

    /**
     * Generate signature header: t=<timestamp>,v1=<signature>.
     */
    public function computeSignature(string $payloadJson, string $secret, int $timestamp): string
    {
        $signedPayload = "{$timestamp}.{$payloadJson}";
        $signature = hash_hmac('sha256', $signedPayload, $secret);

        return "t={$timestamp},v1={$signature}";
    }

    /**
     * Send test ping to verify an endpoint.
     */
    public function testPing(WebhookEndpoint $endpoint): WebhookDelivery
    {
        $testPayload = [
            'event' => 'ping',
            'timestamp' => now()->toISOString(),
            'message' => 'DeliverOps test webhook event',
            'organization_id' => $endpoint->organization_id,
            'endpoint_id' => $endpoint->id,
        ];

        $delivery = WebhookDelivery::create([
            'id' => (string) Str::ulid(),
            'webhook_endpoint_id' => $endpoint->id,
            'event_name' => 'ping',
            'payload' => $testPayload,
            'status' => 'pending',
            'attempt_count' => 0,
            'created_at' => now(),
        ]);

        DeliverWebhookJob::dispatchSync($delivery->id);

        return $delivery->fresh();
    }

    /**
     * Rotate the signing secret for an endpoint.
     */
    public function rotateSecret(WebhookEndpoint $endpoint): string
    {
        $newSecret = 'whsec_' . bin2hex(random_bytes(24));
        $endpoint->update(['secret' => $newSecret]);

        return $newSecret;
    }
}

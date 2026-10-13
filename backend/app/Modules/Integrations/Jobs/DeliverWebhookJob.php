<?php

namespace App\Modules\Integrations\Jobs;

use App\Modules\Integrations\Models\WebhookDelivery;
use App\Modules\Integrations\Services\WebhookDispatcherService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeliverWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $deliveryId
    ) {}

    public function handle(WebhookDispatcherService $dispatcher): void
    {
        $delivery = WebhookDelivery::with('endpoint')->find($this->deliveryId);
        if (!$delivery || !$delivery->endpoint) {
            return;
        }

        $endpoint = $delivery->endpoint;
        if (!$endpoint->is_active) {
            return;
        }

        $attempt = $delivery->attempt_count + 1;
        $delivery->attempt_count = $attempt;

        $payloadJson = json_encode($delivery->payload);
        $timestamp = time();
        $signature = $dispatcher->computeSignature($payloadJson, $endpoint->secret, $timestamp);

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'DeliverOps-Webhooks/2.0',
                    'X-DeliverOps-Delivery-Id' => $delivery->id,
                    'X-DeliverOps-Event' => $delivery->event_name,
                    'X-DeliverOps-Signature' => $signature,
                ])
                ->withBody($payloadJson, 'application/json')
                ->post($endpoint->url);

            $responseBody = substr($response->body(), 0, 65535);
            $statusCode = $response->status();

            if ($response->successful()) {
                $delivery->update([
                    'status' => 'delivered',
                    'attempt' => $attempt,
                    'response_code' => $statusCode,
                    'response_body' => $responseBody,
                    'delivered_at' => now(),
                    'error_message' => null,
                ]);

                $endpoint->update([
                    'consecutive_failed_attempts' => 0,
                    'last_success_at' => now(),
                ]);
            } else {
                $this->handleFailure($delivery, $endpoint, $attempt, $statusCode, $responseBody, "HTTP status {$statusCode}");
            }
        } catch (Exception $e) {
            $this->handleFailure($delivery, $endpoint, $attempt, null, null, $e->getMessage());
        }
    }

    protected function handleFailure(
        WebhookDelivery $delivery,
        $endpoint,
        int $attempt,
        ?int $statusCode,
        ?string $responseBody,
        string $errorMessage
    ): void {
        $consecutiveFailures = $endpoint->consecutive_failed_attempts + 1;
        $shouldDisable = $consecutiveFailures >= 10;

        $endpointUpdates = [
            'consecutive_failed_attempts' => $consecutiveFailures,
        ];

        if ($shouldDisable) {
            $endpointUpdates['active'] = false;
            $endpointUpdates['disabled_at'] = now();
        }

        $endpoint->update($endpointUpdates);

        $delays = WebhookDispatcherService::RETRY_DELAYS;
        $canRetry = isset($delays[$attempt]) && !$shouldDisable;

        if ($canRetry) {
            $delaySeconds = $delays[$attempt];
            $nextRetry = now()->addSeconds($delaySeconds);

            $delivery->update([
                'status' => 'retrying',
                'attempt' => $attempt,
                'response_code' => $statusCode,
                'response_body' => $responseBody,
                'error_message' => substr($errorMessage, 0, 500),
                'failed_at' => now(),
            ]);

            self::dispatch($delivery->id)->delay($nextRetry);
        } else {
            $delivery->update([
                'status' => 'failed',
                'attempt' => $attempt,
                'response_code' => $statusCode,
                'response_body' => $responseBody,
                'error_message' => substr($errorMessage, 0, 500),
                'failed_at' => now(),
            ]);
        }
    }
}

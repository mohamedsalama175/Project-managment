<?php

namespace App\Modules\Integrations\Jobs;

use App\Modules\Integrations\Services\SlackService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DispatchSlackNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $organizationId,
        public string $message,
        public ?array $blocks = null
    ) {}

    public function handle(SlackService $slackService): void
    {
        $slackService->sendNotification($this->organizationId, $this->message, $this->blocks);
    }
}

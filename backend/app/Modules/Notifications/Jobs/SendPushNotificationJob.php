<?php

namespace App\Modules\Notifications\Jobs;

use App\Jobs\TenantAwareJob;
use App\Modules\Notifications\Services\PushNotificationDispatcherService;

class SendPushNotificationJob extends TenantAwareJob
{
    public function __construct(
        string $organizationId,
        public string $userId,
        public string $title,
        public string $body,
        public array $data = []
    ) {
        parent::__construct($organizationId);
    }

    protected function executeInTenantContext(): void
    {
        $dispatcher = app(PushNotificationDispatcherService::class);
        $dispatcher->dispatchToUser($this->organizationId, $this->userId, $this->title, $this->body, $this->data);
    }
}

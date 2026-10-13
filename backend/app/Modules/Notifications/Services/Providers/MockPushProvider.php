<?php

namespace App\Modules\Notifications\Services\Providers;

use App\Modules\Notifications\Models\PushToken;
use App\Modules\Notifications\Services\PushProviderInterface;

class MockPushProvider implements PushProviderInterface
{
    public array $sentNotifications = [];

    public function send(PushToken $token, string $title, string $body, array $data = []): bool
    {
        $this->sentNotifications[] = [
            'token_id' => $token->id,
            'user_id' => $token->user_id,
            'platform' => $token->platform,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'sent_at' => now(),
        ];

        return true;
    }

    public function count(): int
    {
        return count($this->sentNotifications);
    }

    public function getDeliveredMessages(): array
    {
        return $this->sentNotifications;
    }

    public function reset(): void
    {
        $this->sentNotifications = [];
    }
}

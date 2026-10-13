<?php

namespace App\Modules\Notifications\Services\Providers;

use App\Modules\Notifications\Models\PushToken;
use App\Modules\Notifications\Services\PushProviderInterface;
use Illuminate\Support\Facades\Log;

class FcmProvider implements PushProviderInterface
{
    public function send(PushToken $token, string $title, string $body, array $data = []): bool
    {
        Log::info("FCM dispatch to {$token->token}: {$title} - {$body}");
        return true;
    }
}

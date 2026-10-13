<?php

namespace App\Modules\Notifications\Services\Providers;

use App\Modules\Notifications\Models\PushToken;
use App\Modules\Notifications\Services\PushProviderInterface;
use Illuminate\Support\Facades\Log;

class WebPushProvider implements PushProviderInterface
{
    public function send(PushToken $token, string $title, string $body, array $data = []): bool
    {
        Log::info("WebPush dispatch to {$token->token}: {$title} - {$body}");
        return true;
    }
}

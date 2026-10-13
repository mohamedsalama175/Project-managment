<?php

namespace App\Modules\Notifications\Services;

use App\Modules\Notifications\Models\PushToken;

interface PushProviderInterface
{
    public function send(PushToken $token, string $title, string $body, array $data = []): bool;
}

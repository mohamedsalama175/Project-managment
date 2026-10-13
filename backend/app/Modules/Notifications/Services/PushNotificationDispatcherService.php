<?php

namespace App\Modules\Notifications\Services;

use App\Modules\Notifications\Models\PushToken;
use App\Modules\Notifications\Services\Providers\ApnsProvider;
use App\Modules\Notifications\Services\Providers\FcmProvider;
use App\Modules\Notifications\Services\Providers\MockPushProvider;
use App\Modules\Notifications\Services\Providers\WebPushProvider;

class PushNotificationDispatcherService
{
    public function __construct(
        protected MockPushProvider $mockProvider,
        protected ApnsProvider $apnsProvider,
        protected FcmProvider $fcmProvider,
        protected WebPushProvider $webPushProvider
    ) {}

    public function registerToken(
        string $organizationId,
        string $userId,
        string $platform,
        string $token,
        ?string $deviceName = null
    ): PushToken {
        $tokenHash = hash('sha256', $token);

        return PushToken::updateOrCreate(
            [
                'organization_id' => $organizationId,
                'user_id' => $userId,
                'token_hash' => $tokenHash,
            ],
            [
                'platform' => $platform,
                'token' => $token,
                'device_name' => $deviceName,
                'is_active' => true,
                'last_used_at' => now(),
            ]
        );
    }

    public function dispatchToUser(
        string $organizationId,
        string $userId,
        string $title,
        string $body,
        array $data = []
    ): int {
        $tokens = PushToken::where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->get();

        $sentCount = 0;
        foreach ($tokens as $token) {
            $provider = $this->resolveProvider($token->platform);
            if ($provider->send($token, $title, $body, $data)) {
                $token->update(['last_used_at' => now()]);
                $sentCount++;
            }
        }

        return $sentCount;
    }

    public function resolveProvider(string $platform): PushProviderInterface
    {
        if (app()->environment('testing')) {
            return $this->mockProvider;
        }

        return match ($platform) {
            'ios' => $this->apnsProvider,
            'android' => $this->fcmProvider,
            'web' => $this->webPushProvider,
            default => $this->mockProvider,
        };
    }
}

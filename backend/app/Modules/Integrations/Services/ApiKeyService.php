<?php

namespace App\Modules\Integrations\Services;

use App\Models\User;
use App\Modules\Integrations\Models\ApiKey;
use Carbon\Carbon;
use Illuminate\Support\Str;

class ApiKeyService
{
    /**
     * Create a new API key and return both the model and the raw secret key (one-time reveal).
     */
    public function createApiKey(
        User $user,
        string $organizationId,
        string $name,
        array $scopes = ['*'],
        int $rateLimitPerMinute = 60,
        ?Carbon $expiresAt = null
    ): array {
        // Generate raw key: dops_live_ + 32 random characters (total ~42 chars)
        $randomPart = Str::random(32);
        $rawKey = 'dops_live_' . $randomPart;
        $keyPrefix = substr($rawKey, 0, 16); // Fits comfortably in VARCHAR(20)
        $keyHash = hash('sha256', $rawKey);

        $apiKey = ApiKey::create([
            'organization_id' => $organizationId,
            'user_id' => $user->id,
            'name' => $name,
            'key_prefix' => $keyPrefix,
            'key_hash' => $keyHash,
            'scopes' => $scopes,
            'rate_limit_per_minute' => $rateLimitPerMinute,
            'expires_at' => $expiresAt,
        ]);

        return [
            'api_key' => $apiKey,
            'raw_key' => $rawKey,
        ];
    }

    /**
     * Revoke an existing API key.
     */
    public function revokeApiKey(ApiKey $apiKey): void
    {
        $apiKey->update([
            'revoked_at' => now(),
        ]);
    }
}

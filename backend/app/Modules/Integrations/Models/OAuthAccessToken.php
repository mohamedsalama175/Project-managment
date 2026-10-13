<?php

namespace App\Modules\Integrations\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OAuthAccessToken extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'oauth_access_tokens';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'is_revoked' => 'boolean',
            'expires_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(OAuthClient::class, 'oauth_client_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function refreshTokens(): HasMany
    {
        return $this->hasMany(OAuthRefreshToken::class, 'access_token_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function hasScope(string $scope): bool
    {
        $scopes = $this->scopes ?? [];
        if (in_array('*', $scopes, true)) {
            return true;
        }

        return in_array($scope, $scopes, true);
    }
}

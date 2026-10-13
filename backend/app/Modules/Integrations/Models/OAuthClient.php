<?php

namespace App\Modules\Integrations\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OAuthClient extends Model
{
    use HasFactory, HasUlids, SoftDeletes;

    protected $table = 'oauth_clients';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'redirect_uris' => 'array',
            'scopes' => 'array',
            'is_confidential' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function authCodes(): HasMany
    {
        return $this->hasMany(OAuthAuthCode::class, 'oauth_client_id');
    }

    public function accessTokens(): HasMany
    {
        return $this->hasMany(OAuthAccessToken::class, 'oauth_client_id');
    }
}

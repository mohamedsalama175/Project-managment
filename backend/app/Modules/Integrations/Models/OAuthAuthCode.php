<?php

namespace App\Modules\Integrations\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OAuthAuthCode extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'oauth_auth_codes';

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'is_revoked' => 'boolean',
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
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

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}

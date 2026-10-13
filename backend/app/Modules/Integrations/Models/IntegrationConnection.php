<?php

namespace App\Modules\Integrations\Models;

use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationConnection extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'integration_connections';

    protected $guarded = [];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    protected function casts(): array
    {
        return [
            'token_expires_at' => 'datetime',
            'settings' => 'array',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function isConnected(): bool
    {
        return $this->status === 'connected';
    }
}

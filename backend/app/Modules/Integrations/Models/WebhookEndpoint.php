<?php

namespace App\Modules\Integrations\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WebhookEndpoint extends Model
{
    use HasFactory, HasUlids, SoftDeletes, TenantScoped;

    protected $table = 'webhook_endpoints';

    protected $guarded = [];

    protected $hidden = [
        'secret',
    ];

    protected static function booted(): void
    {
        static::creating(function (WebhookEndpoint $endpoint) {
            if (empty($endpoint->created_by_id)) {
                $endpoint->created_by_id = auth()->id()
                    ?? User::where('default_organization_id', $endpoint->organization_id)->first()?->id
                    ?? User::first()?->id;
            }
        });
    }

    protected function casts(): array
    {
        return [
            'events' => 'array',
            'active' => 'boolean',
            'consecutive_failed_attempts' => 'integer',
            'last_success_at' => 'datetime',
            'disabled_at' => 'datetime',
        ];
    }

    public function getIsActiveAttribute(): bool
    {
        return (bool) ($this->attributes['active'] ?? true);
    }

    public function setIsActiveAttribute($value): void
    {
        $this->attributes['active'] = (bool) $value;
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class, 'endpoint_id')->orderByDesc('created_at');
    }

    public function subscribesTo(string $event): bool
    {
        $events = $this->events ?? [];
        if (in_array('*', $events, true)) {
            return true;
        }

        return in_array($event, $events, true);
    }
}

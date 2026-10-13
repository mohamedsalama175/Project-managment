<?php

namespace App\Modules\Integrations\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class WebhookDelivery extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'webhook_deliveries';

    protected $guarded = [];

    protected static function booted(): void
    {
        static::creating(function (WebhookDelivery $delivery) {
            if (empty($delivery->event_id)) {
                $delivery->event_id = (string) Str::ulid();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'attempt' => 'integer',
            'response_code' => 'integer',
            'duration_ms' => 'integer',
            'delivered_at' => 'datetime',
            'failed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function getWebhookEndpointIdAttribute(): ?string
    {
        return $this->attributes['endpoint_id'] ?? null;
    }

    public function setWebhookEndpointIdAttribute($value): void
    {
        $this->attributes['endpoint_id'] = $value;
    }

    public function getEventNameAttribute(): ?string
    {
        return $this->attributes['event_type'] ?? null;
    }

    public function setEventNameAttribute($value): void
    {
        $this->attributes['event_type'] = $value;
    }

    public function getAttemptCountAttribute(): int
    {
        return (int) ($this->attributes['attempt'] ?? 1);
    }

    public function setAttemptCountAttribute($value): void
    {
        $this->attributes['attempt'] = (int) $value;
    }

    public function getStatusAttribute(): string
    {
        $st = $this->attributes['status'] ?? 'pending';
        return $st === 'delivered' ? 'success' : $st;
    }

    public function setStatusAttribute($value): void
    {
        $this->attributes['status'] = $value === 'success' ? 'delivered' : $value;
    }

    public function endpoint(): BelongsTo
    {
        return $this->belongsTo(WebhookEndpoint::class, 'endpoint_id');
    }
}

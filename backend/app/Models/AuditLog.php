<?php

namespace App\Models;

use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    public $timestamps = false;

    protected $fillable = [
        'id',
        'organization_id',
        'project_id',
        'task_id',
        'entity_type',
        'entity_id',
        'actor_id',
        'actor_name',
        'actor_role',
        'action',
        'field_name',
        'old_value',
        'new_value',
        'reason',
        'ip_address',
        'user_agent',
        'created_at',
        'previous_hash',
        'row_hash',
    ];

    protected function casts(): array
    {
        return [
            'old_value' => 'array',
            'new_value' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function () {
            throw new \RuntimeException("Audit logs are strictly append-only and cannot be modified.");
        });

        static::deleting(function () {
            throw new \RuntimeException("Audit logs are immutable records and cannot be deleted.");
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id')->withTrashed();
    }
}

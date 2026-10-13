<?php

namespace App\Models;

use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskEffortAllocation extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $guarded = [];

    protected static function booted(): void
    {
        static::creating(function ($allocation) {
            if (empty($allocation->organization_id)) {
                $allocation->organization_id = app(\App\Modules\Tenancy\Services\TenantManager::class)->getTenantId();
            }
            if (empty($allocation->organization_id) && !empty($allocation->task_id)) {
                $task = Task::withoutGlobalScopes()->find($allocation->task_id);
                if ($task) {
                    $allocation->organization_id = $task->organization_id;
                }
            }
            if (empty($allocation->organization_id)) {
                $allocation->organization_id = '01HZX000000000000000000000';
            }
        });
    }

    protected function casts(): array
    {
        return [
            'allocated_hours' => 'float',
            'lock_version' => 'integer',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function getMemberIdAttribute(): string
    {
        return (string) ($this->attributes['user_id'] ?? '');
    }

    public function setMemberIdAttribute($value): void
    {
        $this->attributes['user_id'] = $value;
    }

    public function member(): BelongsTo
    {
        return $this->user();
    }
}

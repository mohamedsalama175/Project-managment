<?php

namespace App\Models;

use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectRisk extends Model
{
    use HasFactory, HasUlids, SoftDeletes, TenantScoped;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'identified_date' => 'date',
            'due_date' => 'date',
            'resolved_at' => 'datetime',
            'lock_version' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id')->withTrashed();
    }

    public function blockedTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'blocking_risk_id');
    }
}

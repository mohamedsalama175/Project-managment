<?php

namespace App\Models;

use App\Modules\Collaboration\Models\ActivityEvent;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, HasUlids, SoftDeletes, TenantScoped;

    protected $guarded = [];

    public function resolveRouteBindingQuery($query, $value, $field = null)
    {
        return $query->where($field ?? $this->getRouteKeyName(), $value);
    }

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'has_locked_baseline' => 'boolean',
            'is_archived' => 'boolean',
            'is_sample' => 'boolean',
            'tree_version' => 'integer',
            'budget_amount' => 'decimal:4',
        ];
    }

    public function scopeExcludeSamples(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('is_sample', false);
    }

    public function projectManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_manager_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_users')
            ->using(ProjectUser::class)
            ->withPivot(['project_role', 'billable_rate', 'cost_rate', 'billable_currency'])
            ->withTimestamps();
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'project_id')->orderBy('order_index');
    }

    public function getProgressPctAttribute(): int
    {
        if (array_key_exists('progress_pct', $this->attributes) && $this->attributes['progress_pct'] !== null) {
            return (int) $this->attributes['progress_pct'];
        }
        $tasks = $this->tasks;
        if ($tasks->isEmpty()) {
            return 0;
        }
        return (int) round($tasks->avg('pct') ?? 0);
    }

    public function risks(): HasMany
    {
        return $this->hasMany(ProjectRisk::class, 'project_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class, 'project_id')->orderByDesc('created_at');
    }

    public function activityEvents(): HasMany
    {
        return $this->hasMany(ActivityEvent::class, 'project_id')->orderByDesc('created_at');
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(\App\Modules\Resources\Models\TimeEntry::class, 'project_id');
    }

    public function budgetRevisions(): HasMany
    {
        return $this->hasMany(\App\Modules\Financials\Models\ProjectBudgetRevision::class, 'project_id')->orderByDesc('created_at');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(\App\Modules\Financials\Models\Expense::class, 'project_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(\App\Modules\Financials\Models\Invoice::class, 'project_id');
    }

    public function costSnapshots(): HasMany
    {
        return $this->hasMany(\App\Modules\Financials\Models\ProjectCostSnapshot::class, 'project_id')->orderByDesc('snapshot_date');
    }

    protected static function booted(): void
    {
        static::creating(function (Project $project) {
            if (empty($project->config)) {
                $project->config = [
                    'weekendDays' => [5, 6],
                    'holidays' => [],
                    'autoSchedule' => true,
                    'durationMode' => 'working_days',
                ];
            }
        });

        static::deleting(function (Project $project) {
            $holdService = app(\App\Modules\Compliance\Services\LegalHoldService::class);
            if ($holdService->isEntityHeld($project->organization_id, 'Project', $project->id)) {
                throw new \DomainException("Cannot delete Project: Entity is protected under an active legal hold.");
            }
        });
    }
}

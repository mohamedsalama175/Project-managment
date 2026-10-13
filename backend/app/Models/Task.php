<?php

namespace App\Models;

use App\Modules\Collaboration\Models\ActivityEvent;
use App\Modules\Collaboration\Models\Attachment;
use App\Modules\Collaboration\Models\TaskComment;
use App\Modules\Collaboration\Models\TaskWatcher;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_milestone' => 'boolean',
            'pct' => 'integer',
            'order_index' => 'integer',
            'estimated_hours' => 'float',
            'logged_hours' => 'float',
            'primary_owner_hours' => 'float',
            'lock_version' => 'integer',
        ];
    }

    public function getProgressPctAttribute(): int
    {
        return (int) ($this->attributes['pct'] ?? 0);
    }

    public function setProgressPctAttribute($value): void
    {
        $this->attributes['pct'] = (int) $value;
    }

    public function getTitleAttribute(): string
    {
        return $this->attributes['name'] ?? '';
    }

    public function setTitleAttribute($value): void
    {
        $this->attributes['name'] = $value;
    }

    public function getDueDateAttribute(): ?string
    {
        return $this->attributes['end_date'] ?? null;
    }

    public function setDueDateAttribute($value): void
    {
        $this->attributes['end_date'] = $value;
    }

    protected static function booted(): void
    {
        static::creating(function (Task $task) {
            if (empty($task->name) && !empty($task->title)) {
                $task->name = $task->title;
            }
            if (empty($task->category)) {
                $task->category = 'General';
            }
            if (empty($task->start_date)) {
                $task->start_date = now()->toDateString();
            }
            if (empty($task->end_date)) {
                $task->end_date = !empty($task->due_date) ? $task->due_date : now()->addDays(7)->toDateString();
            }
        });

        static::deleting(function (Task $task) {
            $holdService = app(\App\Modules\Compliance\Services\LegalHoldService::class);
            if ($holdService->isEntityHeld($task->organization_id, 'Task', $task->id)) {
                throw new \DomainException("Cannot delete Task: Entity is protected under an active legal hold.");
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_id')->orderBy('order_index');
    }

    public function primaryOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'primary_owner_id')->withTrashed();
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id')->withTrashed();
    }

    public function blockingRisk(): BelongsTo
    {
        return $this->belongsTo(ProjectRisk::class, 'blocking_risk_id');
    }

    public function effortAllocations(): HasMany
    {
        return $this->hasMany(TaskEffortAllocation::class, 'task_id');
    }

    public function predecessors(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'task_id', 'predecessor_id')
            ->using(TaskDependency::class)
            ->withPivot('dependency_type');
    }

    public function successors(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'predecessor_id', 'task_id')
            ->using(TaskDependency::class)
            ->withPivot('dependency_type');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class, 'task_id')->orderBy('created_at');
    }

    public function watchers(): HasMany
    {
        return $this->hasMany(TaskWatcher::class, 'task_id');
    }

    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function activityEvents(): HasMany
    {
        return $this->hasMany(ActivityEvent::class, 'task_id')->orderBy('created_at', 'desc');
    }

    public function getTotalPlannedHoursAttribute(): float
    {
        if ($this->estimated_hours !== null) {
            return (float) $this->estimated_hours;
        }

        $contributorTotal = (float) $this->effortAllocations()->sum('allocated_hours');
        return $contributorTotal + (float) ($this->primary_owner_hours ?? 0);
    }

    public function getDurationDaysAttribute(): int
    {
        if (!$this->start_date || !$this->end_date) {
            return 1;
        }
        $start = \Carbon\Carbon::parse($this->start_date);
        $end = \Carbon\Carbon::parse($this->end_date);
        return max(1, (int) $start->diffInDays($end) + 1);
    }

    public function getBaselineDurationDaysAttribute(): ?int
    {
        if (!$this->baseline_start || !$this->baseline_end) {
            return null;
        }
        $start = \Carbon\Carbon::parse($this->baseline_start);
        $end = \Carbon\Carbon::parse($this->baseline_end);
        return max(1, (int) $start->diffInDays($end) + 1);
    }

    public function taskSkills(): HasMany
    {
        return $this->hasMany(\App\Modules\Resources\Models\TaskSkill::class, 'task_id');
    }

    public function skills(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            \App\Modules\Resources\Models\Skill::class,
            'task_skills',
            'task_id',
            'skill_id'
        )->withPivot('min_proficiency')->withTimestamps();
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(\App\Modules\Resources\Models\TimeEntry::class, 'task_id');
    }
}

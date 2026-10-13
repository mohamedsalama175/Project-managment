<?php

namespace App\Modules\Resources\Models;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'time_entries';

    protected $guarded = [];

    protected $appends = ['status'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'hours' => 'decimal:2',
            'billable' => 'boolean',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function getStatusAttribute(): string
    {
        if ($this->approved_at !== null) {
            return 'approved';
        }
        if ($this->rejected_at !== null) {
            return 'rejected';
        }
        if ($this->submitted_at !== null) {
            return 'submitted';
        }
        return 'draft';
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }
}

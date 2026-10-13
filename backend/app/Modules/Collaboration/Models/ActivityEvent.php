<?php

namespace App\Modules\Collaboration\Models;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class ActivityEvent extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'activity_events';

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public static function boot(): void
    {
        parent::boot();

        static::updating(function () {
            throw new LogicException('ACTIVITY_EVENT_IMMUTABLE: Activity events cannot be updated.');
        });

        static::deleting(function () {
            throw new LogicException('ACTIVITY_EVENT_IMMUTABLE: Activity events cannot be deleted.');
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

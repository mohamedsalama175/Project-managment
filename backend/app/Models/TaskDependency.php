<?php

namespace App\Models;

use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Relations\Pivot;

class TaskDependency extends Pivot
{
    use HasUlids, TenantScoped;

    protected $table = 'task_dependencies';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected static function booted(): void
    {
        static::saving(function (TaskDependency $dependency) {
            if (!empty($dependency->task_id) && $dependency->task_id === $dependency->predecessor_id) {
                throw new \InvalidArgumentException('Self-dependency invariant violation: A task cannot depend on itself.');
            }
        });

        static::creating(function (TaskDependency $dependency) {
            $task = null;
            if (!empty($dependency->task_id)) {
                $task = Task::withoutGlobalScopes()->find($dependency->task_id);
            }
            if ($task) {
                if (empty($dependency->project_id)) {
                    $dependency->project_id = $task->project_id;
                }
                if (empty($dependency->organization_id)) {
                    $dependency->organization_id = $task->organization_id;
                }
            }
            if (empty($dependency->organization_id)) {
                $dependency->organization_id = app(\App\Modules\Tenancy\Services\TenantManager::class)->getTenantId()
                    ?? '01HZX000000000000000000000';
            }
        });
    }

    public function task()
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function predecessor()
    {
        return $this->belongsTo(Task::class, 'predecessor_id');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
}

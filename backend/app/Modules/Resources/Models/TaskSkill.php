<?php

namespace App\Modules\Resources\Models;

use App\Models\Task;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskSkill extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'task_skills';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'min_proficiency' => 'integer',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class, 'skill_id');
    }
}

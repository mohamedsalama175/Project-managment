<?php

namespace App\Modules\Automation\Models;

use App\Models\Project;
use App\Models\User;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AutomationRule extends Model
{
    use HasUlids, TenantScoped, SoftDeletes;

    protected $table = 'automation_rules';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'trigger' => 'array',
            'conditions' => 'array',
            'actions' => 'array',
            'enabled' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function runs(): HasMany
    {
        return $this->hasMany(AutomationRun::class, 'rule_id');
    }
}

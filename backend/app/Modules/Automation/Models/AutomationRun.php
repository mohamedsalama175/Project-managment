<?php

namespace App\Modules\Automation\Models;

use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AutomationRun extends Model
{
    use HasUlids, TenantScoped;

    public $timestamps = false;
    protected $table = 'automation_runs';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'output' => 'array',
            'depth' => 'integer',
            'duration_ms' => 'integer',
            'executed_at' => 'datetime',
        ];
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(AutomationRule::class, 'rule_id')->withTrashed();
    }
}

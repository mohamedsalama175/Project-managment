<?php

namespace App\Modules\AI\Models;

use App\Models\Project;
use App\Models\User;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAnomaly extends Model
{
    use HasUlids, TenantScoped;

    public $timestamps = false;
    protected $table = 'project_anomalies';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'current_value' => 'float',
            'baseline_mean' => 'float',
            'baseline_stddev' => 'float',
            'z_score' => 'float',
            'acknowledged_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by_id');
    }
}

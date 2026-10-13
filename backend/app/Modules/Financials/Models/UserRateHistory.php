<?php

namespace App\Modules\Financials\Models;

use App\Models\Project;
use App\Models\User;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserRateHistory extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'user_rate_history';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'cost_rate' => 'decimal:4',
            'billable_rate' => 'decimal:4',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
}

<?php

namespace App\Modules\Financials\Models;

use App\Models\Project;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectCostSnapshot extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'project_cost_snapshots';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'snapshot_date' => 'date',
            'labor_cost' => 'decimal:4',
            'expense_cost' => 'decimal:4',
            'total_cost' => 'decimal:4',
            'billable_amount' => 'decimal:4',
            'hours_logged' => 'decimal:2',
            'details' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
}

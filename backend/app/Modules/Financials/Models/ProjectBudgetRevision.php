<?php

namespace App\Modules\Financials\Models;

use App\Models\Project;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectBudgetRevision extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'project_budget_revisions';
    public $timestamps = false;
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'previous_budget' => 'decimal:4',
            'new_budget' => 'decimal:4',
            'created_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}

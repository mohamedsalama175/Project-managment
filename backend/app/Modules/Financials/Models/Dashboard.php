<?php

namespace App\Modules\Financials\Models;

use App\Models\Project;
use App\Models\User;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Dashboard extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'dashboards';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'layout' => 'array',
            'is_default' => 'boolean',
            'is_shared' => 'boolean',
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

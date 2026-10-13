<?php

namespace App\Models;

use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProjectUser extends Pivot
{
    use HasUlids, TenantScoped;

    protected $table = 'project_users';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected static function booted(): void
    {
        static::creating(function ($pivot) {
            if (empty($pivot->organization_id)) {
                $pivot->organization_id = app(\App\Modules\Tenancy\Services\TenantManager::class)->getTenantId();
            }
            if (empty($pivot->organization_id) && !empty($pivot->project_id)) {
                $project = Project::withoutGlobalScopes()->find($pivot->project_id);
                if ($project) {
                    $pivot->organization_id = $project->organization_id;
                }
            }
            if (empty($pivot->organization_id)) {
                $pivot->organization_id = '01HZX000000000000000000000';
            }
        });
    }
}

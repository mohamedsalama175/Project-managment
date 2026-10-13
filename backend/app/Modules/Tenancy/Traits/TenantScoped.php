<?php

namespace App\Modules\Tenancy\Traits;

use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Scopes\TenantScope;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait TenantScoped
{
    public static function bootTenantScoped(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function ($model) {
            $tenantId = app(TenantManager::class)->getTenantId();
            if ($tenantId && empty($model->organization_id)) {
                $model->organization_id = $tenantId;
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}

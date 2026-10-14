<?php

namespace Tests\Traits;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Laravel\Sanctum\Sanctum;

trait ActsAsTenant
{
    /**
     * Set active tenant and authenticate user
     */
    protected function actingAsTenantUser(User $user, Organization $organization): static
    {
        app(TenantManager::class)->setTenant($organization);
        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($organization->id);
        }
        Sanctum::actingAs($user, ['*']);

        return $this;
    }

    /**
     * Execute an HTTP call with the proper tenant header
     */
    protected function withTenantHeader(Organization $organization): static
    {
        return $this->withHeaders([
            'X-Organization-Id' => $organization->id,
        ]);
    }
}

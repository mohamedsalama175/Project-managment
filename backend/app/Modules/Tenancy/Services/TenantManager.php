<?php

namespace App\Modules\Tenancy\Services;

use App\Modules\Tenancy\Models\Organization;
use Spatie\Permission\PermissionRegistrar;

class TenantManager
{
    protected ?Organization $currentTenant = null;
    protected bool $bypass = false;

    public function setTenant(?Organization $tenant): void
    {
        $this->currentTenant = $tenant;
    }

    public function getTenant(): ?Organization
    {
        return $this->currentTenant;
    }

    public function getTenantId(): ?string
    {
        return $this->currentTenant?->id;
    }

    public function isBypassed(): bool
    {
        return $this->bypass;
    }

    public function executeWithoutTenantScope(callable $callback): mixed
    {
        $previous = $this->bypass;
        $this->bypass = true;
        try {
            return $callback();
        } finally {
            $this->bypass = $previous;
        }
    }

    public function runForTenant(string $orgId, callable $callback): mixed
    {
        $tenant = Organization::findOrFail($orgId);
        $previousTenant = $this->currentTenant;
        $previousTeamId = getPermissionsTeamId();

        $this->setTenant($tenant);

        $teamChanged = ($previousTeamId !== $orgId);
        if ($teamChanged) {
            setPermissionsTeamId($orgId);
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }

        try {
            return $callback($tenant);
        } finally {
            $this->setTenant($previousTenant);
            if ($teamChanged) {
                setPermissionsTeamId($previousTeamId);
                app(PermissionRegistrar::class)->forgetCachedPermissions();
            }
        }
    }
}

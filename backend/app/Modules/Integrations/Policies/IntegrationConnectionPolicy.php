<?php

namespace App\Modules\Integrations\Policies;

use App\Models\User;
use App\Modules\Integrations\Models\IntegrationConnection;
use App\Modules\Tenancy\Services\TenantManager;

class IntegrationConnectionPolicy
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function viewAny(User $user): bool
    {
        return $user->can('integrations.install');
    }

    public function view(User $user, IntegrationConnection $connection): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($connection->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('integrations.install');
    }

    public function create(User $user): bool
    {
        return $user->can('integrations.install');
    }

    public function update(User $user, IntegrationConnection $connection): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($connection->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('integrations.install');
    }

    public function delete(User $user, IntegrationConnection $connection): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($connection->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('integrations.install');
    }
}

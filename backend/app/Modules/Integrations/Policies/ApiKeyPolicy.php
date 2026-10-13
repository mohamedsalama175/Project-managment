<?php

namespace App\Modules\Integrations\Policies;

use App\Models\User;
use App\Modules\Integrations\Models\ApiKey;
use App\Modules\Tenancy\Services\TenantManager;

class ApiKeyPolicy
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function viewAny(User $user): bool
    {
        return $user->can('api_keys.manage');
    }

    public function view(User $user, ApiKey $apiKey): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($apiKey->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('api_keys.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('api_keys.manage');
    }

    public function delete(User $user, ApiKey $apiKey): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($apiKey->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('api_keys.manage');
    }
}

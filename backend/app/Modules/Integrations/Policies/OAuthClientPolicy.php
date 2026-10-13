<?php

namespace App\Modules\Integrations\Policies;

use App\Models\User;
use App\Modules\Integrations\Models\OAuthClient;
use App\Modules\Tenancy\Services\TenantManager;

class OAuthClientPolicy
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function viewAny(User $user): bool
    {
        return $user->can('oauth_apps.manage');
    }

    public function view(User $user, OAuthClient $client): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($client->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('oauth_apps.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('oauth_apps.manage');
    }

    public function update(User $user, OAuthClient $client): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($client->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('oauth_apps.manage');
    }

    public function delete(User $user, OAuthClient $client): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($client->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('oauth_apps.manage');
    }
}

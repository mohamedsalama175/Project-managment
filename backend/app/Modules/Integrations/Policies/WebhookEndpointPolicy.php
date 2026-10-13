<?php

namespace App\Modules\Integrations\Policies;

use App\Models\User;
use App\Modules\Integrations\Models\WebhookEndpoint;
use App\Modules\Tenancy\Services\TenantManager;

class WebhookEndpointPolicy
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function viewAny(User $user): bool
    {
        return $user->can('webhooks.manage');
    }

    public function view(User $user, WebhookEndpoint $endpoint): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($endpoint->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('webhooks.manage');
    }

    public function create(User $user): bool
    {
        return $user->can('webhooks.manage');
    }

    public function update(User $user, WebhookEndpoint $endpoint): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($endpoint->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('webhooks.manage');
    }

    public function delete(User $user, WebhookEndpoint $endpoint): bool
    {
        $tenantId = $this->tenantManager->getTenantId();
        if ($endpoint->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('webhooks.manage');
    }
}

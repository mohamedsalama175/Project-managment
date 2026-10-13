<?php

namespace App\Modules\Financials\Policies;

use App\Models\User;
use App\Modules\Financials\Models\Dashboard;
use App\Modules\Tenancy\Services\TenantManager;

class DashboardPolicy
{
    public function view(User $user, Dashboard $dashboard): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($dashboard->organization_id !== $tenantId) {
            return false;
        }

        return $dashboard->user_id === $user->id || $dashboard->is_shared || $user->hasRole('admin');
    }

    public function update(User $user, Dashboard $dashboard): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($dashboard->organization_id !== $tenantId) {
            return false;
        }

        return $dashboard->user_id === $user->id || $user->hasRole('admin');
    }

    public function delete(User $user, Dashboard $dashboard): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($dashboard->organization_id !== $tenantId) {
            return false;
        }

        return $dashboard->user_id === $user->id || $user->hasRole('admin');
    }
}

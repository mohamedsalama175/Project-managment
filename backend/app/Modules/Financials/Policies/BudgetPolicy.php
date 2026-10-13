<?php

namespace App\Modules\Financials\Policies;

use App\Models\Project;
use App\Models\User;
use App\Modules\Tenancy\Services\TenantManager;

class BudgetPolicy
{
    public function view(User $user, Project $project): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($project->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('budget.view');
    }

    public function update(User $user, Project $project): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($project->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('budget.manage');
    }
}

<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Templates\Models\ProjectTemplate;
use App\Modules\Tenancy\Services\TenantManager;

class ProjectTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('projects.view');
    }

    public function view(User $user, ProjectTemplate $template): bool
    {
        if (!$user->can('projects.view')) {
            return false;
        }

        if ($template->is_system) {
            return true;
        }

        $tenantId = app(TenantManager::class)->getTenantId();
        return $template->organization_id === $tenantId;
    }

    public function create(User $user): bool
    {
        return $user->can('projects.create');
    }

    public function update(User $user, ProjectTemplate $template): bool
    {
        if ($template->is_system) {
            return false;
        }

        if (!$user->can('projects.edit')) {
            return false;
        }

        $tenantId = app(TenantManager::class)->getTenantId();
        return $template->organization_id === $tenantId;
    }

    public function delete(User $user, ProjectTemplate $template): bool
    {
        if ($template->is_system) {
            return false;
        }

        if (!$user->can('projects.archive')) {
            return false;
        }

        $tenantId = app(TenantManager::class)->getTenantId();
        return $template->organization_id === $tenantId;
    }
}

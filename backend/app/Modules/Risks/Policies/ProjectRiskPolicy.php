<?php

namespace App\Modules\Risks\Policies;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\User;

class ProjectRiskPolicy
{
    public function viewAny(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('projects.view');
    }

    public function view(User $user, ProjectRisk $risk): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('projects.view');
    }

    public function create(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('risks.manage');
    }

    public function update(User $user, ProjectRisk $risk): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('risks.manage');
    }

    public function delete(User $user, ProjectRisk $risk): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('risks.manage');
    }
}

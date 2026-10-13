<?php

namespace App\Modules\Projects\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('projects.view');
    }

    public function view(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if (!$user->can('projects.view')) {
            return false;
        }

        // Accessible if PM or assigned member
        return $project->project_manager_id === $user->id ||
            $project->members()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->can('projects.create');
    }

    public function update(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('projects.edit') && $project->project_manager_id === $user->id;
    }

    public function delete(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('projects.archive') && $project->project_manager_id === $user->id;
    }

    public function lockBaseline(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('baselines.lock') && $project->project_manager_id === $user->id;
    }
}

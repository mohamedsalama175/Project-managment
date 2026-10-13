<?php

namespace App\Modules\Tasks\Policies;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function viewAny(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('projects.view');
    }

    public function view(User $user, Task $task): bool
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

        return $user->can('tasks.create') && ($project->project_manager_id === $user->id || $user->hasRole('project_manager'));
    }

    public function update(User $user, Task $task): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->can('tasks.edit_details')) {
            return true;
        }

        // Contributors can update progress % if assigned as primary owner or effort contributor
        if ($user->can('tasks.update_progress')) {
            return $task->primary_owner_id === $user->id ||
                $task->effortAllocations()->where('member_id', $user->id)->exists();
        }

        return false;
    }

    public function delete(User $user, Task $task): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('tasks.delete') && $task->project->project_manager_id === $user->id;
    }

    public function requestReview(User $user, Task $task): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->can('tasks.request_review') &&
            ($task->primary_owner_id === $user->id || $task->effortAllocations()->where('member_id', $user->id)->exists() || $user->hasRole('project_manager'));
    }

    public function approveReview(User $user, Task $task): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        // Anti-self-approval rule is also strictly enforced in the service layer
        return $user->can('tasks.approve_review') &&
            ($task->reviewer_id === $user->id || $task->project->project_manager_id === $user->id);
    }
}

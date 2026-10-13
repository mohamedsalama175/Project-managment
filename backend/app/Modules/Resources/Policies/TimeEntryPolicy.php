<?php

namespace App\Modules\Resources\Policies;

use App\Models\User;
use App\Modules\Resources\Models\TimeEntry;

class TimeEntryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, TimeEntry $entry): bool
    {
        return $user->id === $entry->user_id || $user->hasRole('admin') || $user->hasRole('project_manager');
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, TimeEntry $entry): bool
    {
        return $user->id === $entry->user_id || $user->hasRole('admin');
    }

    public function delete(User $user, TimeEntry $entry): bool
    {
        return $user->id === $entry->user_id || $user->hasRole('admin');
    }

    public function approve(User $user, TimeEntry $entry): bool
    {
        if ($entry->user_id === $user->id && !$user->hasRole('admin')) {
            return false;
        }

        return $user->hasRole('admin') || $user->hasRole('project_manager');
    }
}

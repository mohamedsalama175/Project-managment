<?php

namespace App\Modules\Resources\Policies;

use App\Models\User;
use App\Modules\Resources\Models\Skill;

class SkillPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Skill $skill): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin') || $user->hasRole('project_manager');
    }

    public function update(User $user, Skill $skill): bool
    {
        return $user->hasRole('admin') || $user->hasRole('project_manager');
    }

    public function delete(User $user, Skill $skill): bool
    {
        return $user->hasRole('admin') || $user->hasRole('project_manager');
    }
}

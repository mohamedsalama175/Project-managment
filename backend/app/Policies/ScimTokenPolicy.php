<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Identity\Models\ScimToken;

class ScimTokenPolicy
{
    public function view(User $user, ScimToken $token): bool
    {
        return $user->hasRole('admin') || $user->can('sso.manage');
    }

    public function manage(User $user, ScimToken $token): bool
    {
        return $user->hasRole('admin') || $user->can('sso.manage');
    }
}

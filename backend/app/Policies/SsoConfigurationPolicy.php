<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Identity\Models\SsoConfiguration;

class SsoConfigurationPolicy
{
    public function view(User $user, SsoConfiguration $config): bool
    {
        return $user->hasRole('admin') || $user->can('sso.manage');
    }

    public function manage(User $user, SsoConfiguration $config): bool
    {
        return $user->hasRole('admin') || $user->can('sso.manage');
    }
}

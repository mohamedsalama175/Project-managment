<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Compliance\Models\LegalHold;

class LegalHoldPolicy
{
    public function view(User $user, LegalHold $hold): bool
    {
        return $user->hasRole('admin') || $user->can('legal_holds.manage');
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin') || $user->can('legal_holds.manage');
    }

    public function release(User $user, LegalHold $hold): bool
    {
        return $user->hasRole('admin') || $user->can('legal_holds.manage');
    }
}

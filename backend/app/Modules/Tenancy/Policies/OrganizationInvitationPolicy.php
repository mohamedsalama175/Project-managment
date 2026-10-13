<?php

namespace App\Modules\Tenancy\Policies;

use App\Models\User;
use App\Modules\Tenancy\Models\OrganizationInvitation;

class OrganizationInvitationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('users.view');
    }

    public function create(User $user): bool
    {
        return $user->can('users.create');
    }

    public function delete(User $user, OrganizationInvitation $invitation): bool
    {
        return $user->can('users.delete') || $invitation->invited_by === $user->id;
    }
}

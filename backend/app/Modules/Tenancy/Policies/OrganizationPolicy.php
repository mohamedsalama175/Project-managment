<?php

namespace App\Modules\Tenancy\Policies;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;

class OrganizationPolicy
{
    public function view(User $user, Organization $organization): bool
    {
        return $organization->users()->where('users.id', $user->id)->exists();
    }

    public function update(User $user, Organization $organization): bool
    {
        return $user->isOwnerOf($organization) || $user->hasRole('admin');
    }

    public function delete(User $user, Organization $organization): bool
    {
        return $user->isOwnerOf($organization);
    }
}

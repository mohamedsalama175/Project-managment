<?php

namespace App\Modules\Resources\Policies;

use App\Models\User;
use App\Modules\Resources\Models\TimeOffRequest;
use App\Modules\Tenancy\Helpers\TenantAuthHelper;

class TimeOffPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, TimeOffRequest $request): bool
    {
        if ($user->id === $request->user_id) {
            return true;
        }

        return $user->hasRole('admin') || TenantAuthHelper::isOrgOwner($user, $request->organization_id);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function approve(User $user, TimeOffRequest $request): bool
    {
        // Anti-self-approval guard: users/managers cannot approve their own requests
        if ($user->id === $request->user_id) {
            return false;
        }

        return $user->hasRole('admin') 
            || $user->hasRole('project_manager') 
            || TenantAuthHelper::isOrgOwner($user, $request->organization_id);
    }

    public function reject(User $user, TimeOffRequest $request): bool
    {
        if ($user->id === $request->user_id) {
            return false;
        }

        return $user->hasRole('admin') 
            || $user->hasRole('project_manager') 
            || TenantAuthHelper::isOrgOwner($user, $request->organization_id);
    }

    public function delete(User $user, TimeOffRequest $request): bool
    {
        if ($request->status !== 'pending') {
            return false;
        }

        return $user->id === $request->user_id || $user->hasRole('admin');
    }
}

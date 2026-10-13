<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Notifications\Models\PushToken;

class PushTokenPolicy
{
    public function view(User $user, PushToken $token): bool
    {
        return $token->user_id === $user->id || $user->hasRole('admin');
    }

    public function delete(User $user, PushToken $token): bool
    {
        return $token->user_id === $user->id || $user->hasRole('admin');
    }
}

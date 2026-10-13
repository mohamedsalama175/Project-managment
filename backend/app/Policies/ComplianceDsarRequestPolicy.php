<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Compliance\Models\ComplianceDsarRequest;

class ComplianceDsarRequestPolicy
{
    public function view(User $user, ComplianceDsarRequest $request): bool
    {
        return $user->id === $request->user_id || $user->hasRole('admin') || $user->can('compliance.dsar');
    }

    public function manage(User $user): bool
    {
        return $user->hasRole('admin') || $user->can('compliance.dsar');
    }
}

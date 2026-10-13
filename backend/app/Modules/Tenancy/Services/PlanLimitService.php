<?php

namespace App\Modules\Tenancy\Services;

use App\Modules\Tenancy\Exceptions\PlanLimitExceededException;
use App\Modules\Tenancy\Models\Organization;

class PlanLimitService
{
    /**
     * Enforce max project creation limit per plan:
     * free: max 3 projects
     * pro / enterprise: unlimited
     */
    public function checkProjectCreationLimit(Organization $org): void
    {
        $plan = strtolower($org->plan ?? 'free');
        if ($plan === 'free') {
            $count = $org->projects()->count();
            if ($count >= 3) {
                throw new PlanLimitExceededException(
                    message: 'Project creation limit reached. Free plan organizations are capped at 3 projects. Upgrade to Pro for unlimited project delivery.',
                    limit: 3,
                    current: $count
                );
            }
        }
    }

    /**
     * Enforce max member / user limit per plan:
     * free: max 5 users
     * pro / enterprise: unlimited
     */
    public function checkUserInvitationLimit(Organization $org): void
    {
        $plan = strtolower($org->plan ?? 'free');
        if ($plan === 'free') {
            $userCount = $org->users()->count();
            if ($userCount >= 5) {
                throw new PlanLimitExceededException(
                    message: 'Member invitation limit reached. Free plan organizations are capped at 5 users. Upgrade to Pro for unlimited collaboration.',
                    limit: 5,
                    current: $userCount
                );
            }
        }
    }
}

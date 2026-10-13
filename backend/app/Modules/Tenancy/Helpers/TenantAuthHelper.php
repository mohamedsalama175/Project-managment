<?php

namespace App\Modules\Tenancy\Helpers;

use App\Modules\Collaboration\Models\TaskComment;
use App\Models\User;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;

class TenantAuthHelper
{
    public static function isOrgOwner(User $user, ?string $orgId = null): bool
    {
        $tenantId = $orgId
            ?? app(TenantManager::class)->getTenantId()
            ?? $user->default_organization_id;

        if (!$tenantId) {
            return false;
        }

        // If already in the correct tenant context, query directly
        if (app(TenantManager::class)->getTenantId() === $tenantId) {
            return OrganizationUser::where('organization_id', $tenantId)
                ->where('user_id', $user->id)
                ->where('is_owner', 1)
                ->exists();
        }

        // Otherwise, wrap in tenant context to prevent scope leaks
        return app(TenantManager::class)->runForTenant($tenantId, function () use ($user, $tenantId) {
            return OrganizationUser::where('organization_id', $tenantId)
                ->where('user_id', $user->id)
                ->where('is_owner', 1)
                ->exists();
        });
    }

    public static function canManageComments(User $user, TaskComment $comment): bool
    {
        if ($comment->user_id === $user->id) {
            return true;
        }

        if (self::isOrgOwner($user, $comment->organization_id)) {
            return true;
        }

        return $user->hasRole('admin');
    }
}

<?php

namespace App\Modules\Tenancy\Services;

use App\Models\User;
use App\Modules\Audit\Services\AuditLoggerService;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

class TransferOwnershipService
{
    public function __construct(protected AuditLoggerService $auditLogger) {}

    public function transfer(Organization $org, User $currentOwner, User $newOwner): void
    {
        DB::transaction(function () use ($org, $currentOwner, $newOwner) {
            $currentMembership = OrganizationUser::where('organization_id', $org->id)
                ->where('user_id', $currentOwner->id)
                ->lockForUpdate()
                ->first();

            $newMembership = OrganizationUser::where('organization_id', $org->id)
                ->where('user_id', $newOwner->id)
                ->lockForUpdate()
                ->first();

            if (!$currentMembership || !$currentMembership->is_owner) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Actor is not the designated organization owner.',
                    'code' => 'ORG_OWNERSHIP_TRANSFER_FORBIDDEN',
                ], 403));
            }

            if (!$newMembership) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Target user is not a member of this organization.',
                    'code' => 'ORG_TRANSFER_TARGET_INVALID',
                ], 422));
            }

            // Atomic two-statement owner swap
            $currentMembership->update(['is_owner' => 0]);
            $newMembership->update(['is_owner' => 1]);

            $this->auditLogger->log(
                action: 'org.ownership.transferred',
                auditableType: Organization::class,
                auditableId: $org->id,
                projectId: null,
                organizationId: $org->id,
                oldValues: ['owner_id' => $currentOwner->id],
                newValues: ['owner_id' => $newOwner->id]
            );
        });
    }
}

<?php

namespace App\Modules\Tenancy\Services;

use App\Models\Role;
use App\Models\User;
use App\Modules\Audit\Services\AuditLoggerService;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationInvitation;
use App\Modules\Tenancy\Models\OrganizationUser;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrganizationInvitationService
{
    public function __construct(protected AuditLoggerService $auditLogger) {}

    public function invite(Organization $org, User $inviter, string $email, string $role): array
    {
        // Enforce Plan Limits
        app(PlanLimitService::class)->checkUserInvitationLimit($org);

        $normalizedEmail = strtolower(trim($email));

        // Check if user is already an active member of this organization
        $alreadyMember = $org->users()->where('email', $normalizedEmail)->exists();

        if ($alreadyMember) {
            throw new HttpResponseException(response()->json([
                'message' => 'The user with this email is already a member of the organization.',
                'code' => 'INVITE_ALREADY_MEMBER',
            ], 422));
        }

        // Cancel previous pending invites for this email
        OrganizationInvitation::where('organization_id', $org->id)
            ->where('email', $normalizedEmail)
            ->whereNull('accepted_at')
            ->delete();

        $plainToken = Str::random(64);
        $tokenHash = hash('sha256', $plainToken);

        $invitation = OrganizationInvitation::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $org->id,
            'email' => $normalizedEmail,
            'role' => $role,
            'token_hash' => $tokenHash,
            'invited_by_id' => $inviter->id,
            'invited_by_name' => $inviter->name,
            'invited_by_email' => $inviter->email,
            'expires_at' => now()->addDays(7),
        ]);

        $this->auditLogger->log(
            action: 'org.invitation.dispatched',
            auditableType: OrganizationInvitation::class,
            auditableId: $invitation->id,
            projectId: null,
            organizationId: $org->id,
            oldValues: null,
            newValues: ['email' => $normalizedEmail, 'role' => $role]
        );

        return [
            'invitation' => $invitation,
            'plainToken' => $plainToken,
        ];
    }

    public function accept(string $tokenHash, User $user): Organization
    {
        return DB::transaction(function () use ($tokenHash, $user) {
            $invite = OrganizationInvitation::where('token_hash', $tokenHash)
                ->lockForUpdate()
                ->first();

            if (!$invite) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Invitation not found.',
                    'code' => 'INVITE_NOT_FOUND',
                ], 404));
            }

            if ($invite->accepted_at !== null) {
                $isSameUser = OrganizationUser::where('organization_id', $invite->organization_id)
                    ->where('user_id', $user->id)
                    ->exists();

                if ($isSameUser) {
                    return $invite->organization;
                }

                throw new HttpResponseException(response()->json([
                    'message' => 'This invitation has already been accepted.',
                    'code' => 'INVITE_ALREADY_ACCEPTED',
                ], 409));
            }

            if (now()->greaterThan($invite->expires_at)) {
                throw new HttpResponseException(response()->json([
                    'message' => 'This invitation has expired.',
                    'code' => 'INVITE_EXPIRED',
                ], 410));
            }

            // Membership association in organization_users (Owner is a flag, not a role)
            OrganizationUser::updateOrCreate(
                [
                    'organization_id' => $invite->organization_id,
                    'user_id' => $user->id,
                ],
                [
                    'is_owner' => false,
                    'joined_at' => now(),
                    'invited_by_id' => $invite->invited_by_id,
                ]
            );

            // Assign Spatie Role Scoped to Organization Team
            setPermissionsTeamId($invite->organization_id);
            $spatieRole = Role::where('name', $invite->role)->where('guard_name', 'web')->exists()
                ? $invite->role
                : 'contributor';
            $user->assignRole($spatieRole);

            // Mark invitation accepted
            $invite->update(['accepted_at' => now()]);

            // Set user default organization if empty
            if (empty($user->default_organization_id)) {
                $user->update([
                    'default_organization_id' => $invite->organization_id,
                ]);
            }

            $this->auditLogger->log(
                action: 'org.invitation.accepted',
                auditableType: OrganizationInvitation::class,
                auditableId: $invite->id,
                projectId: null,
                organizationId: $invite->organization_id,
                oldValues: ['status' => 'pending'],
                newValues: ['status' => 'accepted', 'user_id' => $user->id]
            );

            return $invite->organization;
        });
    }

    public function revoke(OrganizationInvitation $invite, User $actor): void
    {
        $orgId = $invite->organization_id;
        $inviteId = $invite->id;
        $email = $invite->email;

        $invite->delete();

        $this->auditLogger->log(
            action: 'org.invitation.revoked',
            auditableType: OrganizationInvitation::class,
            auditableId: $inviteId,
            projectId: null,
            organizationId: $orgId,
            oldValues: ['email' => $email],
            newValues: ['status' => 'revoked', 'revoked_by' => $actor->id]
        );
    }
}

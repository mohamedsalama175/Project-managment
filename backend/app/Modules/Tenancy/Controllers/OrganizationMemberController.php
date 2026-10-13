<?php

namespace App\Modules\Tenancy\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Audit\Services\AuditLoggerService;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Resources\OrganizationMemberResource;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrganizationMemberController extends Controller
{
    public function __construct(
        protected TenantManager $tenantManager,
        protected AuditLoggerService $auditLogger
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantManager->getTenant();
        if (!$tenant) {
            return response()->json(['message' => 'No active organization.', 'code' => 'TENANT_CONTEXT_MISSING'], 400);
        }

        setPermissionsTeamId($tenant->id);
        $members = $tenant->users()->with(['roles'])->get();

        return response()->json([
            'members' => OrganizationMemberResource::collection($members),
        ]);
    }

    public function show(User $user): JsonResponse
    {
        $tenant = $this->tenantManager->getTenant();
        if (!$tenant) {
            return response()->json(['message' => 'No active organization.', 'code' => 'TENANT_CONTEXT_MISSING'], 400);
        }

        setPermissionsTeamId($tenant->id);
        $member = $tenant->users()->where('users.id', $user->id)->firstOrFail();

        return response()->json([
            'member' => new OrganizationMemberResource($member),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $tenant = $this->tenantManager->getTenant();
        if (!$tenant) {
            return response()->json(['message' => 'No active organization.', 'code' => 'TENANT_CONTEXT_MISSING'], 400);
        }

        $validated = $request->validate([
            'role' => [
                'required',
                'string',
                Rule::exists('roles', 'name')->where('guard_name', 'web'),
            ],
        ]);

        $roleInput = strtolower(trim($validated['role']));

        $actor = $request->user();
        if (!$actor->isOwnerOf($tenant) && !$actor->can('roles.manage')) {
            return response()->json(['message' => 'Forbidden.', 'code' => 'ROLE_FORBIDDEN'], 403);
        }

        $orgUser = OrganizationUser::where('organization_id', $tenant->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$orgUser) {
            return response()->json(['message' => 'Member not found in organization.', 'code' => 'NOT_FOUND'], 404);
        }

        // Set Spatie Team Role exclusively (Owner is a flag, not a role)
        setPermissionsTeamId($tenant->id);
        $user->syncRoles([$roleInput]);

        $this->auditLogger->log(
            action: 'org.member.role_updated',
            auditableType: User::class,
            auditableId: $user->id,
            projectId: null,
            organizationId: $tenant->id,
            oldValues: null,
            newValues: ['new_role' => $roleInput]
        );

        return response()->json([
            'message' => 'Member role updated successfully.',
            'member' => new OrganizationMemberResource($user->load('roles')),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $tenant = $this->tenantManager->getTenant();
        if (!$tenant) {
            return response()->json(['message' => 'No active organization.', 'code' => 'TENANT_CONTEXT_MISSING'], 400);
        }

        $actor = $request->user();
        if (!$actor->isOwnerOf($tenant) && !$actor->can('users.delete')) {
            return response()->json(['message' => 'Forbidden.', 'code' => 'ROLE_FORBIDDEN'], 403);
        }

        $orgUser = OrganizationUser::where('organization_id', $tenant->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$orgUser) {
            return response()->json(['message' => 'Member not found in organization.', 'code' => 'NOT_FOUND'], 404);
        }

        if ($orgUser->is_owner) {
            return response()->json([
                'message' => 'Cannot remove the primary owner of the organization. Transfer ownership first.',
                'code' => 'ORG_CANNOT_REMOVE_OWNER',
            ], 422);
        }

        $orgUser->delete();

        // Revoke Spatie roles in this team
        setPermissionsTeamId($tenant->id);
        $user->roles()->detach();

        // If user was using this as default, clear it
        if ($user->default_organization_id === $tenant->id) {
            $anotherOrg = $user->organizations()->first();
            $user->update([
                'default_organization_id' => $anotherOrg?->id,
            ]);
        }

        $this->auditLogger->log(
            action: 'org.member.removed',
            auditableType: User::class,
            auditableId: $user->id,
            projectId: null,
            organizationId: $tenant->id,
            oldValues: ['user_id' => $user->id],
            newValues: null
        );

        return response()->json([
            'message' => "Member {$user->name} has been removed from {$tenant->name}.",
        ]);
    }
}

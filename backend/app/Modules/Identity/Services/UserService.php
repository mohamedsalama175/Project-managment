<?php

namespace App\Modules\Identity\Services;

use App\Models\User;
use App\Services\DeliverOpsAuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function __construct(
        protected DeliverOpsAuditService $auditService
    ) {}

    public function createUser(array $data, ?object $avatarFile, User $actor): User
    {
        $targetOrgId = $actor->default_organization_id ?? getPermissionsTeamId() ?? config('deliverops.system_org_id', '01HZX000000000000000000000');
        if (function_exists('setPermissionsTeamId') && getPermissionsTeamId() === null && $targetOrgId) {
            setPermissionsTeamId($targetOrgId);
        }

        // Anti-escalation: Actor cannot assign roles they do not possess unless admin
        if ($actor->email !== 'admin@admin.com' && !$actor->hasRole('admin')) {
            $unauthorized = array_diff($data['roles'], $actor->roles->pluck('name')->toArray());
            if (!empty($unauthorized)) {
                throw ValidationException::withMessages([
                    'roles' => ['You cannot assign roles you do not possess: ' . implode(', ', $unauthorized)],
                ]);
            }
        }

        return DB::transaction(function () use ($data, $avatarFile, $actor, $targetOrgId) {
            $avatarPath = $data['avatar_path'] ?? null;
            if ($avatarFile) {
                $avatarPath = $avatarFile->store('avatars', 'public');
            }

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'phone' => $data['phone'] ?? null,
                'avatar_path' => $avatarPath,
                'job_title' => $data['job_title'],
                'department' => $data['department'],
                'skills' => $data['skills'] ?? [],
                'weekly_capacity_hours' => $data['weekly_capacity_hours'],
                'status' => $data['status'],
                'color' => $data['color'] ?? '#6366f1',
                'must_change_password' => $data['must_change_password'] ?? false,
                'default_organization_id' => $targetOrgId,
            ]);

            if ($targetOrgId) {
                \App\Modules\Tenancy\Models\OrganizationUser::firstOrCreate(
                    ['organization_id' => $targetOrgId, 'user_id' => $user->id],
                    ['is_owner' => false, 'joined_at' => now()]
                );
                setPermissionsTeamId($targetOrgId);
            }

            $user->syncRoles($data['roles']);

            $this->auditService->log(
                entity: $user,
                action: 'user_created',
                actor: $actor,
                newValue: ['email' => $user->email, 'roles' => $data['roles']],
                reason: 'Created via User Administration'
            );

            return $user;
        });
    }

    public function updateUser(User $target, array $data, ?object $avatarFile, User $actor): User
    {
        $targetOrgId = $actor->default_organization_id ?? getPermissionsTeamId() ?? config('deliverops.system_org_id', '01HZX000000000000000000000');
        if (function_exists('setPermissionsTeamId') && getPermissionsTeamId() === null && $targetOrgId) {
            setPermissionsTeamId($targetOrgId);
        }

        // Check role escalation if roles are provided
        if (isset($data['roles']) && $actor->email !== 'admin@admin.com' && !$actor->hasRole('admin')) {
            $unauthorized = array_diff($data['roles'], $actor->roles->pluck('name')->toArray());
            if (!empty($unauthorized)) {
                throw ValidationException::withMessages([
                    'roles' => ['You cannot assign roles you do not possess: ' . implode(', ', $unauthorized)],
                ]);
            }
        }

        // Protected last active admin guard
        if (isset($data['status']) && $data['status'] !== 'active' && $target->hasRole('admin')) {
            $this->ensureNotLastActiveAdmin($target);
        }

        if (isset($data['roles']) && !in_array('admin', $data['roles']) && $target->hasRole('admin')) {
            $this->ensureNotLastActiveAdmin($target);
        }

        return DB::transaction(function () use ($target, $data, $avatarFile, $actor) {
            $oldValues = [
                'name' => $target->name,
                'email' => $target->email,
                'job_title' => $target->job_title,
                'department' => $target->department,
                'weekly_capacity_hours' => $target->weekly_capacity_hours,
                'status' => $target->status,
                'roles' => $target->roles->pluck('name')->toArray(),
            ];

            if ($avatarFile) {
                if ($target->avatar_path && Storage::disk('public')->exists($target->avatar_path)) {
                    Storage::disk('public')->delete($target->avatar_path);
                }
                $target->avatar_path = $avatarFile->store('avatars', 'public');
            } elseif (array_key_exists('avatar_path', $data)) {
                $target->avatar_path = $data['avatar_path'];
            }

            if (!empty($data['password'])) {
                $target->password = Hash::make($data['password']);
            }

            $fillable = [
                'name', 'email', 'phone', 'job_title', 'department',
                'skills', 'weekly_capacity_hours', 'status', 'color', 'must_change_password'
            ];

            foreach ($fillable as $field) {
                if (array_key_exists($field, $data)) {
                    $target->{$field} = $data[$field];
                }
            }

            $target->save();

            if (isset($data['roles'])) {
                $target->syncRoles($data['roles']);
            }

            $newValues = [
                'name' => $target->name,
                'email' => $target->email,
                'job_title' => $target->job_title,
                'department' => $target->department,
                'weekly_capacity_hours' => $target->weekly_capacity_hours,
                'status' => $target->status,
                'roles' => $target->roles->pluck('name')->toArray(),
            ];

            $this->auditService->log(
                entity: $target,
                action: 'user_updated',
                actor: $actor,
                oldValue: $oldValues,
                newValue: $newValues,
                reason: 'Updated via User Administration'
            );

            return $target;
        });
    }

    public function deleteUser(User $target, User $actor): void
    {
        // Invariant 1: Cannot delete oneself
        if ($target->id === $actor->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot delete your own account.'],
            ]);
        }

        // Invariant 2: Cannot delete the last active administrator
        if ($target->hasRole('admin')) {
            $this->ensureNotLastActiveAdmin($target);
        }

        // Invariant 3: Check active project manager assignments
        $managedProjectsCount = app(\App\Modules\Tenancy\Services\TenantManager::class)->executeWithoutTenantScope(function () use ($target) {
            return $target->managedProjects()->where('is_archived', false)->count();
        });
        if ($managedProjectsCount > 0) {
            throw ValidationException::withMessages([
                'user' => ["Cannot delete user: They are actively managing {$managedProjectsCount} non-archived projects. Reassign projects before deletion."],
            ]);
        }

        DB::transaction(function () use ($target, $actor) {
            // Delete avatar
            if ($target->avatar_path && Storage::disk('public')->exists($target->avatar_path)) {
                Storage::disk('public')->delete($target->avatar_path);
            }

            // Revoke tokens
            $target->tokens()->delete();

            // Log before deletion
            $this->auditService->log(
                entity: $target,
                action: 'user_deleted',
                actor: $actor,
                oldValue: ['email' => $target->email, 'name' => $target->name],
                reason: 'Soft deleted via User Administration'
            );

            $target->delete();
        });
    }

    protected function ensureNotLastActiveAdmin(User $user): void
    {
        $activeAdminCount = User::role('admin')
            ->where('status', 'active')
            ->where('id', '!=', $user->id)
            ->count();

        if ($activeAdminCount === 0) {
            throw ValidationException::withMessages([
                'user' => ['Cannot modify or delete the last active administrator in the system.'],
            ]);
        }
    }
}

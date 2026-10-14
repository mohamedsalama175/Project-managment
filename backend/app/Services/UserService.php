<?php

namespace App\Services;

use App\Models\User;
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

        return DB::transaction(function () use ($data, $avatarFile, $actor) {
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
            ]);

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

    public function updateUser(User $user, array $data, ?object $avatarFile, User $actor): User
    {
        $targetOrgId = $actor->default_organization_id ?? getPermissionsTeamId() ?? config('deliverops.system_org_id', '01HZX000000000000000000000');
        if (function_exists('setPermissionsTeamId') && getPermissionsTeamId() === null && $targetOrgId) {
            setPermissionsTeamId($targetOrgId);
        }

        // Anti-escalation: Target permissions must be a subset of actor's permissions
        if ($actor->email !== 'admin@admin.com' && !$actor->hasRole('admin')) {
            $actorPermissions = $actor->getAllPermissions()->pluck('name')->toArray();
            $targetPermissions = $user->getAllPermissions()->pluck('name')->toArray();
            $unauthorized = array_diff($targetPermissions, $actorPermissions);
            if (!empty($unauthorized)) {
                throw ValidationException::withMessages([
                    'user' => ['You do not have sufficient privileges to modify this user account.'],
                ]);
            }

            // Check roles being added OR removed
            if (isset($data['roles'])) {
                $currentRoles = $user->roles->pluck('name')->toArray();
                $newRoles = $data['roles'];
                $added = array_diff($newRoles, $currentRoles);
                $removed = array_diff($currentRoles, $newRoles);

                $actorRoles = $actor->roles->pluck('name')->toArray();
                if (!empty(array_diff($added, $actorRoles)) || !empty(array_diff($removed, $actorRoles))) {
                    throw ValidationException::withMessages([
                        'roles' => ['You can only grant or revoke roles that you personally hold.'],
                    ]);
                }
            }
        }

        $oldAvatarPath = $user->avatar_path;
        $shouldDeleteOldAvatar = false;

        $updatedUser = DB::transaction(function () use ($user, $data, $avatarFile, $actor, $oldAvatarPath, &$shouldDeleteOldAvatar) {
            // Status transition to inactive requires deactivation checks
            if (isset($data['status']) && $data['status'] === 'inactive' && $user->status !== 'inactive') {
                $this->assertSafeToDeactivate($user, $actor);
            }

            // Race-safe last active admin check using pessimistic row lock
            if (isset($data['roles']) && $user->hasRole('admin') && !in_array('admin', $data['roles'])) {
                $activeAdminCount = User::role('admin')
                    ->whereNull('deleted_at')
                    ->where('status', 'active')
                    ->lockForUpdate()
                    ->get()
                    ->count();

                if ($activeAdminCount <= 1) {
                    throw ValidationException::withMessages([
                        'roles' => ['Cannot remove the Administrator role from the last active administrator.'],
                    ]);
                }
            }

            if ($avatarFile) {
                $user->avatar_path = $avatarFile->store('avatars', 'public');
                $shouldDeleteOldAvatar = !empty($oldAvatarPath);
            }

            if (!empty($data['password'])) {
                $user->password = Hash::make($data['password']);
                // Revoke all tokens on password change to prevent session hijacking
                $user->tokens()->delete();
            }

            $oldState = [
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'weekly_capacity_hours' => $user->weekly_capacity_hours,
                'roles' => $user->roles->pluck('name')->toArray(),
            ];

            $user->fill(collect($data)->except(['password', 'roles', 'avatar'])->all());
            $user->save();

            if (isset($data['roles'])) {
                $user->syncRoles($data['roles']);
            }

            if ($user->status === 'inactive') {
                $user->tokens()->delete();
            }

            $newState = [
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'weekly_capacity_hours' => $user->weekly_capacity_hours,
                'roles' => $user->roles->pluck('name')->toArray(),
            ];

            $this->auditService->log(
                entity: $user,
                action: 'user_updated',
                actor: $actor,
                oldValue: $oldState,
                newValue: $newState,
                reason: 'User profile updated'
            );

            return $user;
        });

        // Delete old avatar AFTER commit so rollbacks never leave broken files
        if ($shouldDeleteOldAvatar && Storage::disk('public')->exists($oldAvatarPath)) {
            DB::afterCommit(fn () => Storage::disk('public')->delete($oldAvatarPath));
        }

        return $updatedUser;
    }

    public function deactivateOrDeleteUser(User $user, User $actor): void
    {
        $this->assertSafeToDeactivate($user, $actor);

        DB::transaction(function () use ($user, $actor) {
            $user->tokens()->delete();
            $user->status = 'inactive';
            $user->save();
            $user->delete();

            $this->auditService->log(
                entity: $user,
                action: 'user_deactivated',
                actor: $actor,
                reason: 'User deactivated and soft-deleted'
            );
        });
    }

    protected function assertSafeToDeactivate(User $user, User $actor): void
    {
        if ($actor->id === $user->id) {
            throw ValidationException::withMessages([
                'user' => ['You cannot deactivate or delete your own account.'],
            ]);
        }

        if ($user->hasRole('admin')) {
            $activeAdminCount = User::role('admin')
                ->whereNull('deleted_at')
                ->where('status', 'active')
                ->lockForUpdate()
                ->get()
                ->count();

            if ($activeAdminCount <= 1) {
                throw ValidationException::withMessages([
                    'user' => ['Cannot deactivate or delete the last active administrator.'],
                ]);
            }
        }

        $activeTasks = $user->primaryTasks()->whereNotIn('status', ['Completed'])->count();
        if ($activeTasks > 0) {
            throw ValidationException::withMessages([
                'user' => ["Cannot deactivate user: Primary owner of {$activeTasks} incomplete tasks. Reassign them first."],
            ]);
        }

        $activeProjects = $user->managedProjects()->where('is_archived', false)->count();
        if ($activeProjects > 0) {
            throw ValidationException::withMessages([
                'user' => ["Cannot deactivate user: Assigned as Project Manager for {$activeProjects} active projects."],
            ]);
        }

        $activeReviews = $user->reviewTasks()->where('review_status', 'pending_review')->count();
        if ($activeReviews > 0) {
            throw ValidationException::withMessages([
                'user' => ["Cannot deactivate user: Sign-off reviewer on {$activeReviews} tasks pending review."],
            ]);
        }

        $activeRisks = $user->ownedRisks()->whereNotIn('status', ['resolved'])->count();
        if ($activeRisks > 0) {
            throw ValidationException::withMessages([
                'user' => ["Cannot deactivate user: Accountable owner for {$activeRisks} unresolved project risks."],
            ]);
        }
    }
}

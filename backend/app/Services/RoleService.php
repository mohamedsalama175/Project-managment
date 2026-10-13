<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

class RoleService
{
    public function __construct(
        protected DeliverOpsAuditService $auditService
    ) {}

    public function createRole(array $data, User $actor): Role
    {
        if (!$actor->hasRole('admin')) {
            $actorPermissions = $actor->getAllPermissions()->pluck('name')->toArray();
            $unauthorized = array_diff($data['permissions'], $actorPermissions);
            if (!empty($unauthorized)) {
                throw ValidationException::withMessages([
                    'permissions' => ['You cannot grant permissions you do not hold: ' . implode(', ', $unauthorized)],
                ]);
            }
        }

        return DB::transaction(function () use ($data, $actor) {
            $role = Role::create([
                'name' => $data['name'],
                'guard_name' => 'web',
                'display_name' => $data['displayName'],
                'description' => $data['description'] ?? null,
                'is_system' => false,
            ]);

            $role->syncPermissions($data['permissions']);
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            $this->auditService->log(
                entity: $role,
                action: 'role_created',
                actor: $actor,
                newValue: ['name' => $role->name, 'permissions' => $data['permissions']],
                reason: 'Custom role created'
            );

            return $role;
        });
    }

    public function updateRole(Role $role, array $data, User $actor): Role
    {
        if ($role->is_system && isset($data['name']) && $data['name'] !== $role->name) {
            throw ValidationException::withMessages([
                'name' => ['Protected system roles cannot be renamed.'],
            ]);
        }

        if (!$actor->hasRole('admin')) {
            $actorPermissions = $actor->getAllPermissions()->pluck('name')->toArray();
            $unauthorized = array_diff($data['permissions'], $actorPermissions);
            if (!empty($unauthorized)) {
                throw ValidationException::withMessages([
                    'permissions' => ['You cannot grant permissions you do not hold: ' . implode(', ', $unauthorized)],
                ]);
            }
        }

        return DB::transaction(function () use ($role, $data, $actor) {
            $oldPermissions = $role->permissions->pluck('name')->toArray();

            if (isset($data['displayName'])) $role->display_name = $data['displayName'];
            if (array_key_exists('description', $data)) $role->description = $data['description'];
            $role->save();

            if (isset($data['permissions'])) {
                $role->syncPermissions($data['permissions']);
            }
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            $this->auditService->log(
                entity: $role,
                action: 'role_updated',
                actor: $actor,
                oldValue: ['permissions' => $oldPermissions],
                newValue: ['permissions' => $data['permissions'] ?? $oldPermissions],
                reason: 'Role permissions updated'
            );

            return $role;
        });
    }

    public function deleteRole(Role $role, User $actor): void
    {
        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => ['Protected system roles cannot be deleted.'],
            ]);
        }

        if ($role->users()->count() > 0) {
            throw ValidationException::withMessages([
                'role' => ['Cannot delete role with assigned users. Reassign users first.'],
            ]);
        }

        DB::transaction(function () use ($role, $actor) {
            $roleName = $role->name;
            $role->delete();
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            $this->auditService->log(
                entity: $role,
                action: 'role_deleted',
                actor: $actor,
                reason: "Role '{$roleName}' deleted"
            );
        });
    }
}

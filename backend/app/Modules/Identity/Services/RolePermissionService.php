<?php

namespace App\Modules\Identity\Services;

use App\Models\Role;
use App\Models\User;
use App\Services\DeliverOpsAuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;

class RolePermissionService
{
    public function __construct(
        protected DeliverOpsAuditService $auditService
    ) {}

    public function createRole(array $data, User $actor): Role
    {
        return DB::transaction(function () use ($data, $actor) {
            $role = Role::create([
                'name' => $data['name'],
                'display_name' => $data['display_name'],
                'description' => $data['description'] ?? null,
                'guard_name' => 'web',
                'is_system' => false,
            ]);

            if (!empty($data['permissions'])) {
                $role->syncPermissions($data['permissions']);
            }

            $this->auditService->log(
                entity: $role,
                action: 'role_created',
                actor: $actor,
                newValue: ['name' => $role->name, 'permissions' => $data['permissions'] ?? []],
                reason: 'Custom role created'
            );

            return $role;
        });
    }

    public function updateRole(Role $role, array $data, User $actor): Role
    {
        return DB::transaction(function () use ($role, $data, $actor) {
            $oldPermissions = $role->permissions->pluck('name')->toArray();

            // Protected system roles cannot have name changed
            if ($role->is_system && isset($data['name']) && $data['name'] !== $role->name) {
                throw ValidationException::withMessages([
                    'role' => ['System role internal identifier cannot be renamed.'],
                ]);
            }

            if (!$role->is_system && isset($data['name'])) {
                $role->name = $data['name'];
            }

            if (isset($data['display_name'])) {
                $role->display_name = $data['display_name'];
            }

            if (isset($data['description'])) {
                $role->description = $data['description'];
            }

            $role->save();

            if (isset($data['permissions'])) {
                $role->syncPermissions($data['permissions']);
            }

            $this->auditService->log(
                entity: $role,
                action: 'role_updated',
                actor: $actor,
                oldValue: ['permissions' => $oldPermissions],
                newValue: ['permissions' => $data['permissions'] ?? $oldPermissions],
                reason: 'Role updated'
            );

            return $role;
        });
    }

    public function deleteRole(Role $role, User $actor): void
    {
        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => ['System roles are protected and cannot be deleted.'],
            ]);
        }

        $assignedCount = $role->users()->count();
        if ($assignedCount > 0) {
            throw ValidationException::withMessages([
                'role' => ["Cannot delete role: {$assignedCount} active users are currently assigned to this role."],
            ]);
        }

        DB::transaction(function () use ($role, $actor) {
            $this->auditService->log(
                entity: $role,
                action: 'role_deleted',
                actor: $actor,
                oldValue: ['name' => $role->name],
                reason: 'Custom role deleted'
            );

            $role->delete();
        });
    }
}

<?php

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Modules\Identity\Resources\RoleResource;
use App\Modules\Identity\Services\RolePermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RolePermissionController extends Controller
{
    public function __construct(
        protected RolePermissionService $roleService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Role::class);

        $roles = Role::with(['permissions', 'users'])
            ->withCount('users')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => RoleResource::collection($roles),
        ]);
    }

    public function permissionsList(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Role::class);

        $permissions = Permission::all()
            ->groupBy('group_name')
            ->map(function ($group) {
                return $group->map(function ($p) {
                    return [
                        'id' => $p->id,
                        'name' => $p->name,
                        'description' => $p->description,
                        'group' => $p->group_name,
                    ];
                });
            });

        return response()->json([
            'data' => $permissions,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Role::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:roles,name'],
            'display_name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);

        $role = $this->roleService->createRole($validated, $request->user());

        return (new RoleResource($role->load(['permissions', 'users'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, Role $role): RoleResource
    {
        $this->authorize('update', $role);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:50', 'alpha_dash', Rule::unique('roles', 'name')->ignore($role->id)],
            'display_name' => ['sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);

        $updated = $this->roleService->updateRole($role, $validated, $request->user());

        return new RoleResource($updated->load(['permissions', 'users']));
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        $this->authorize('delete', $role);

        $this->roleService->deleteRole($role, $request->user());

        return response()->json([
            'message' => 'Role deleted successfully.',
        ]);
    }
}

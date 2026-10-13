<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use App\Services\RoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
    public function __construct(
        protected RoleService $roleService
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Role::class);

        $roles = Role::where('guard_name', 'web')
            ->with('permissions')
            ->withCount('users')
            ->get();

        return response()->json([
            'data' => RoleResource::collection($roles),
        ]);
    }

    public function permissionsList(): JsonResponse
    {
        $this->authorize('viewAny', Role::class);

        $grouped = Permission::where('guard_name', 'web')
            ->get()
            ->groupBy('group_name');

        return response()->json([
            'data' => $grouped,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Role::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:roles,name'],
            'displayName' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = $this->roleService->createRole($validated, $request->user());

        return (new RoleResource($role->load('permissions')))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $this->authorize('update', $role);

        $validated = $request->validate([
            'displayName' => ['sometimes', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $updated = $this->roleService->updateRole($role, $validated, $request->user());

        return response()->json([
            'message' => 'Role updated successfully',
            'data' => new RoleResource($updated->load('permissions')),
        ]);
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        $this->authorize('delete', $role);

        $this->roleService->deleteRole($role, $request->user());

        return response()->json(['message' => 'Role deleted successfully.']);
    }
}

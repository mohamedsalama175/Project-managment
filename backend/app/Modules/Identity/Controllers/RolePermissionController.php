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

        $allPermissions = Permission::all();

        $permissions = $allPermissions
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

        // 3-tier hierarchy: Module -> Subject -> Permissions
        $hierarchyDefinitions = [
            'projects' => [
                'name' => 'Projects & Scheduling',
                'icon' => 'FolderKanban',
                'subjects' => [
                    'Project Management' => ['projects.view', 'projects.create', 'projects.edit', 'projects.archive', 'projects.import'],
                    'Baselines & Milestones' => ['baselines.lock'],
                ],
            ],
            'tasks' => [
                'name' => 'Tasks & WBS',
                'icon' => 'ListTodo',
                'subjects' => [
                    'WBS Hierarchy' => ['tasks.create', 'tasks.edit_details', 'tasks.delete', 'tasks.view.all'],
                    'Execution & Progress' => ['tasks.list', 'tasks.show', 'tasks.update_progress', 'tasks.edit_own_progress'],
                    'Reviews & Approvals' => ['tasks.request_review', 'tasks.approve_review'],
                    'Task Collaboration' => ['tasks.comment', 'comments.create'],
                ],
            ],
            'risks' => [
                'name' => 'Risks & Governance',
                'icon' => 'ShieldAlert',
                'subjects' => [
                    'Risk Register & Mitigation' => ['risks.manage'],
                ],
            ],
            'financials' => [
                'name' => 'Financials & Invoicing',
                'icon' => 'DollarSign',
                'subjects' => [
                    'Budgets & EVM' => ['budget.view', 'budget.manage', 'evm.view'],
                    'Labor Rates & Costing' => ['rates.view', 'rates.manage', 'costs.view'],
                    'Expense Claims' => ['expenses.create', 'expenses.view', 'expenses.approve', 'expenses.reimburse'],
                    'Invoices & Billing' => ['invoices.view', 'invoices.manage', 'currencies.manage', 'reports.generate'],
                ],
            ],
            'users' => [
                'name' => 'Team & Resource Capacity',
                'icon' => 'Users',
                'subjects' => [
                    'Users Directory' => ['users.view', 'users.create', 'users.edit', 'users.delete'],
                    'Roles & Permissions' => ['roles.view', 'roles.manage'],
                ],
            ],
            'automation' => [
                'name' => 'Automation & Rules Engine',
                'icon' => 'Zap',
                'subjects' => [
                    'Automation Rules & Triggers' => ['automation.view', 'automation.manage', 'automation.execute'],
                ],
            ],
            'compliance' => [
                'name' => 'Compliance & Security',
                'icon' => 'ShieldCheck',
                'subjects' => [
                    'Audit Trail & Verification' => ['audit.view', 'audit.verify'],
                    'GDPR & DSAR' => ['compliance.view', 'compliance.manage', 'compliance.dsar'],
                    'Legal Holds' => ['legal_holds.view', 'legal_holds.manage', 'legal_holds.export'],
                ],
            ],
            'integrations' => [
                'name' => 'Integrations & Developer APIs',
                'icon' => 'Plug',
                'subjects' => [
                    'API Keys & Webhooks' => ['api_keys.manage', 'oauth_apps.manage', 'webhooks.manage'],
                    'Connected Apps & Imports' => ['integrations.install', 'imports.execute'],
                    'Enterprise SSO' => ['sso.manage'],
                ],
            ],
            'dashboards' => [
                'name' => 'Dashboards & Analytics',
                'icon' => 'LayoutGrid',
                'subjects' => [
                    'Executive Dashboards & Reports' => ['dashboards.manage'],
                ],
            ],
        ];

        $modules = [];
        $permissionMap = $allPermissions->keyBy('name');

        foreach ($hierarchyDefinitions as $modKey => $modDef) {
            $subjects = [];
            $modPermissionsCount = 0;

            foreach ($modDef['subjects'] as $subjectName => $permNames) {
                $subjectPerms = [];
                foreach ($permNames as $pName) {
                    if (isset($permissionMap[$pName])) {
                        $p = $permissionMap[$pName];
                        $subjectPerms[] = [
                            'id' => $p->id,
                            'name' => $p->name,
                            'description' => $p->description,
                            'label' => ucwords(str_replace(['.', '_'], ' ', $p->name)),
                        ];
                        $modPermissionsCount++;
                    }
                }
                if (!empty($subjectPerms)) {
                    $subjects[] = [
                        'name' => $subjectName,
                        'permissions' => $subjectPerms,
                    ];
                }
            }

            if (!empty($subjects)) {
                $modules[] = [
                    'key' => $modKey,
                    'name' => $modDef['name'],
                    'icon' => $modDef['icon'],
                    'subjects_count' => count($subjects),
                    'permissions_count' => $modPermissionsCount,
                    'subjects' => $subjects,
                ];
            }
        }

        return response()->json([
            'data' => $permissions,
            'total_count' => $allPermissions->count(),
            'modules' => $modules,
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

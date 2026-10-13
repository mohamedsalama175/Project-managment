<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Seeds essential system permissions, standard system roles, and ensures System Organization.
     * Creates NO users.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // 1. Grouped System Permissions Matrix
        $matrix = [
            'users' => [
                'users.view' => 'View users directory and capacity metrics',
                'users.create' => 'Create new user accounts',
                'users.edit' => 'Modify user profiles and capacity',
                'users.delete' => 'Deactivate or soft-delete user accounts',
            ],
            'roles' => [
                'roles.view' => 'View roles and permission matrices',
                'roles.manage' => 'Create, edit, or delete custom roles',
            ],
            'projects' => [
                'projects.view' => 'View accessible project schedules',
                'projects.create' => 'Create new projects',
                'projects.edit' => 'Modify project metadata and calendar',
                'projects.archive' => 'Archive or restore projects',
                'projects.import' => 'Perform bootstrap data migration',
            ],
            'tasks' => [
                'tasks.create' => 'Add new tasks to project WBS',
                'tasks.edit_details' => 'Edit task description, duration, and dates',
                'tasks.update_progress' => 'Update progress percentage on assigned tasks',
                'tasks.request_review' => 'Submit completed tasks for sign-off review',
                'tasks.approve_review' => 'Approve or reject tasks pending review',
                'tasks.delete' => 'Delete tasks from project WBS',
            ],
            'baselines' => [
                'baselines.lock' => 'Lock or clear official project baselines',
            ],
            'risks' => [
                'risks.manage' => 'Create, update, and resolve project risks and blockers',
            ],
            'comments' => [
                'comments.create' => 'Post comments on project tasks',
            ],
            'audit' => [
                'audit.view' => 'Inspect project audit trails and security logs',
            ],
            'financials' => [
                'budget.view' => 'View project budgets and financial metrics',
                'budget.manage' => 'Update project budgets and parameters',
                'rates.view' => 'View user labor and billable cost rates',
                'rates.manage' => 'Manage user labor rates and rate histories',
                'costs.view' => 'Inspect project labor costs and snapshots',
                'evm.view' => 'View Earned Value Management computations and charts',
                'expenses.create' => 'Submit project expense claims and receipts',
                'expenses.view' => 'View project expense claims',
                'expenses.approve' => 'Approve or reject expense claims',
                'expenses.reimburse' => 'Mark approved expenses as reimbursed',
                'invoices.view' => 'View customer invoices',
                'invoices.manage' => 'Create, edit, send, and void invoices',
                'currencies.manage' => 'Manage exchange rates and base currencies',
                'reports.generate' => 'Generate and export financial and progress reports',
                'dashboards.manage' => 'Create and customize personal and shared dashboards',
            ],
            'integrations' => [
                'api_keys.manage' => 'Create and revoke API keys',
                'oauth_apps.manage' => 'Manage OAuth developer applications',
                'webhooks.manage' => 'Configure and test outbound webhooks',
                'integrations.install' => 'Install and manage third-party integrations',
                'imports.execute' => 'Execute competitor project data imports',
            ],
            'compliance' => [
                'compliance.view' => 'View compliance dashboard and DSAR requests',
                'compliance.manage' => 'Manage GDPR erasure and export requests',
                'compliance.dsar' => 'Submit and process DSAR exports',
                'audit.verify' => 'Verify cryptographic audit chain integrity',
            ],
            'legal_holds' => [
                'legal_holds.view' => 'View active legal holds',
                'legal_holds.manage' => 'Create and release legal holds',
                'legal_holds.export' => 'Export e-discovery archives',
            ],
            'sso' => [
                'sso.manage' => 'Configure SAML/OIDC SSO and SCIM provisioning',
            ],
        ];

        foreach ($matrix as $group => $permissions) {
            foreach ($permissions as $permName => $desc) {
                Permission::firstOrCreate(
                    ['name' => $permName, 'guard_name' => 'web'],
                    ['group_name' => $group, 'description' => $desc]
                );
            }
        }

        // 2. Define Standard Roles with is_system = true
        $admin = Role::firstOrCreate(
            ['name' => 'admin', 'guard_name' => 'web'],
            ['display_name' => 'Administrator', 'description' => 'Full administrative control', 'is_system' => true]
        );
        $admin->syncPermissions(Permission::all());

        $pm = Role::firstOrCreate(
            ['name' => 'project_manager', 'guard_name' => 'web'],
            ['display_name' => 'Project Manager', 'description' => 'Manages assigned projects, schedules, and reviews', 'is_system' => true]
        );
        $pm->syncPermissions([
            'projects.view', 'projects.create', 'projects.edit', 'projects.archive',
            'tasks.create', 'tasks.edit_details', 'tasks.update_progress', 'tasks.request_review', 'tasks.approve_review', 'tasks.delete',
            'baselines.lock', 'risks.manage', 'comments.create', 'users.view', 'audit.view',
            'budget.view', 'budget.manage', 'rates.view', 'costs.view', 'evm.view',
            'expenses.create', 'expenses.view', 'expenses.approve', 'invoices.view', 'invoices.manage',
            'reports.generate', 'dashboards.manage',
            'api_keys.manage', 'webhooks.manage', 'integrations.install', 'imports.execute',
        ]);

        $contributor = Role::firstOrCreate(
            ['name' => 'contributor', 'guard_name' => 'web'],
            ['display_name' => 'Contributor', 'description' => 'Executes tasks and submits deliverables for review', 'is_system' => true]
        );
        $contributor->syncPermissions([
            'projects.view', 'tasks.update_progress', 'tasks.request_review', 'comments.create', 'users.view',
            'expenses.create', 'expenses.view', 'dashboards.manage',
        ]);

        $viewer = Role::firstOrCreate(
            ['name' => 'viewer', 'guard_name' => 'web'],
            ['display_name' => 'Viewer', 'description' => 'Read-only observer access', 'is_system' => true]
        );
        $viewer->syncPermissions([
            'projects.view', 'users.view',
            'budget.view', 'costs.view', 'evm.view', 'invoices.view',
        ]);

        // 3. Ensure System Organization exists for multi-tenant bootstrap
        $systemOrgId = config('deliverops.system_org_id', '01HZX000000000000000000000');
        Organization::firstOrCreate(
            ['id' => $systemOrgId],
            [
                'name' => 'DeliverOps System Organization',
                'slug' => 'system-default',
                'industry' => 'Platform Administration',
                'region' => 'EMEA',
                'plan' => 'enterprise',
                'timezone' => 'UTC',
                'status' => 'active',
            ]
        );
    }
}

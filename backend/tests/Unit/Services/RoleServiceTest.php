<?php

namespace Tests\Unit\Services;

use App\Models\Role;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RoleServiceTest extends TestCase
{
    use RefreshDatabase;

    protected RoleService $roleService;
    protected Organization $org;
    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->roleService = app(RoleService::class);
        [$this->org, $this->owner] = $this->createOrganizationWithOwner();
        app(TenantManager::class)->setTenant($this->org);
    }

    public function test_admin_can_create_custom_role_with_permissions(): void
    {
        $role = $this->roleService->createRole([
            'name' => 'site_supervisor',
            'displayName' => 'Site Supervisor',
            'description' => 'Manages on-site tasks and field safety',
            'permissions' => ['tasks.show', 'tasks.create'],
        ], $this->owner);

        $this->assertDatabaseHas('roles', [
            'id' => $role->id,
            'name' => 'site_supervisor',
            'display_name' => 'Site Supervisor',
            'is_system' => false,
        ]);

        $this->assertTrue($role->hasPermissionTo('tasks.show'));
        $this->assertTrue($role->hasPermissionTo('tasks.create'));
    }

    public function test_non_admin_cannot_escalate_permissions(): void
    {
        $member = $this->addMemberToOrganization($this->org, 'field_engineer');

        $this->expectException(ValidationException::class);

        $this->roleService->createRole([
            'name' => 'rogue_admin',
            'displayName' => 'Rogue Admin',
            'permissions' => ['roles.manage', 'users.manage'],
        ], $member);
    }

    public function test_cannot_rename_protected_system_role(): void
    {
        $systemRole = Role::where('name', 'admin')->first();

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Protected system roles cannot be renamed');

        $this->roleService->updateRole($systemRole, [
            'name' => 'super_duper_admin',
            'displayName' => 'Renamed Admin',
        ], $this->owner);
    }

    public function test_can_update_custom_role_display_name_and_permissions(): void
    {
        $role = $this->roleService->createRole([
            'name' => 'lead_qa',
            'displayName' => 'Lead QA',
            'permissions' => ['tasks.show'],
        ], $this->owner);

        $updated = $this->roleService->updateRole($role, [
            'displayName' => 'Principal QA Engineer',
            'permissions' => ['tasks.show', 'tasks.create'],
        ], $this->owner);

        $this->assertEquals('Principal QA Engineer', $updated->display_name);
        $this->assertTrue($updated->hasPermissionTo('tasks.create'));
    }

    public function test_cannot_delete_protected_system_role(): void
    {
        $systemRole = Role::where('name', 'admin')->first();

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Protected system roles cannot be deleted');

        $this->roleService->deleteRole($systemRole, $this->owner);
    }

    public function test_can_delete_unused_custom_role(): void
    {
        $role = $this->roleService->createRole([
            'name' => 'temp_auditor',
            'displayName' => 'Temporary Auditor',
            'permissions' => ['tasks.show'],
        ], $this->owner);

        $roleId = $role->id;
        $this->roleService->deleteRole($role, $this->owner);

        $this->assertDatabaseMissing('roles', ['id' => $roleId]);
    }
}

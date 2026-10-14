<?php

namespace Tests\Unit\Policies;

use App\Models\Role;
use App\Models\User;
use App\Policies\RolePolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserAndRolePolicyTest extends TestCase
{
    use RefreshDatabase;

    protected UserPolicy $userPolicy;
    protected RolePolicy $rolePolicy;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->userPolicy = new UserPolicy();
        $this->rolePolicy = new RolePolicy();
    }

    public function test_admin_has_user_management_permissions(): void
    {
        [$org, $admin] = $this->createOrganizationWithOwner();
        $targetUser = User::factory()->create();

        $this->assertTrue($this->userPolicy->viewAny($admin));
        $this->assertTrue($this->userPolicy->view($admin, $targetUser));
        $this->assertTrue($this->userPolicy->create($admin));
        $this->assertTrue($this->userPolicy->update($admin, $targetUser));
        $this->assertTrue($this->userPolicy->delete($admin, $targetUser));
    }

    public function test_field_engineer_lacks_user_management_permissions(): void
    {
        [$org, $admin] = $this->createOrganizationWithOwner();
        $engineer = $this->addMemberToOrganization($org, 'field_engineer');
        $targetUser = User::factory()->create();

        $this->assertFalse($this->userPolicy->viewAny($engineer));
        $this->assertFalse($this->userPolicy->view($engineer, $targetUser));
        $this->assertFalse($this->userPolicy->create($engineer));
        $this->assertFalse($this->userPolicy->update($engineer, $targetUser));
        $this->assertFalse($this->userPolicy->delete($engineer, $targetUser));
    }

    public function test_admin_has_role_management_permissions(): void
    {
        [$org, $admin] = $this->createOrganizationWithOwner();
        $role = Role::where('name', 'project_manager')->first();

        $this->assertTrue($this->rolePolicy->viewAny($admin));
        $this->assertTrue($this->rolePolicy->view($admin, $role));
        $this->assertTrue($this->rolePolicy->create($admin));
        $this->assertTrue($this->rolePolicy->update($admin, $role));
        $this->assertTrue($this->rolePolicy->delete($admin, $role));
    }

    public function test_field_engineer_lacks_role_management_permissions(): void
    {
        [$org, $admin] = $this->createOrganizationWithOwner();
        $engineer = $this->addMemberToOrganization($org, 'field_engineer');
        $role = Role::where('name', 'project_manager')->first();

        $this->assertFalse($this->rolePolicy->viewAny($engineer));
        $this->assertFalse($this->rolePolicy->create($engineer));
        $this->assertFalse($this->rolePolicy->update($engineer, $role));
        $this->assertFalse($this->rolePolicy->delete($engineer, $role));
    }
}

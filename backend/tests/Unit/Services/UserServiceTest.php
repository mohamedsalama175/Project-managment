<?php

namespace Tests\Unit\Services;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class UserServiceTest extends TestCase
{
    use RefreshDatabase;

    protected UserService $userService;
    protected Organization $org;
    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->userService = app(UserService::class);
        [$this->org, $this->owner] = $this->createOrganizationWithOwner();
        app(TenantManager::class)->setTenant($this->org);
    }

    public function test_admin_can_create_user_with_roles(): void
    {
        $user = $this->userService->createUser([
            'name' => 'Bob Engineer',
            'email' => 'bob@deliverops.com',
            'password' => 'DeliverOps2026!Secure',
            'job_title' => 'Structural Engineer',
            'department' => 'Civil',
            'weekly_capacity_hours' => 40.0,
            'status' => 'active',
            'roles' => ['field_engineer'],
        ], null, $this->owner);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'bob@deliverops.com',
            'job_title' => 'Structural Engineer',
        ]);

        $this->assertTrue($user->hasRole('field_engineer'));
    }

    public function test_non_admin_cannot_assign_roles_they_do_not_hold(): void
    {
        $member = $this->addMemberToOrganization($this->org, 'field_engineer');

        $this->expectException(ValidationException::class);

        $this->userService->createUser([
            'name' => 'Charlie Rogue',
            'email' => 'charlie@deliverops.com',
            'password' => 'DeliverOps2026!Secure',
            'job_title' => 'Engineer',
            'department' => 'Ops',
            'weekly_capacity_hours' => 40.0,
            'status' => 'active',
            'roles' => ['admin'],
        ], null, $member);
    }

    public function test_admin_can_update_user_profile_and_capacity(): void
    {
        $user = $this->userService->createUser([
            'name' => 'Diana Planner',
            'email' => 'diana@deliverops.com',
            'password' => 'DeliverOps2026!Secure',
            'job_title' => 'Planner',
            'department' => 'PMO',
            'weekly_capacity_hours' => 35.0,
            'status' => 'active',
            'roles' => ['project_manager'],
        ], null, $this->owner);

        $updated = $this->userService->updateUser($user, [
            'job_title' => 'Senior Project Planner',
            'weekly_capacity_hours' => 42.0,
        ], null, $this->owner);

        $this->assertEquals('Senior Project Planner', $updated->job_title);
        $this->assertEquals(42.0, $updated->weekly_capacity_hours);
    }

    public function test_cannot_remove_admin_role_from_last_active_admin(): void
    {
        // Only $this->owner is active admin in seeded context
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Cannot remove the Administrator role from the last active administrator');

        $this->userService->updateUser($this->owner, [
            'roles' => ['field_engineer'],
        ], null, $this->owner);
    }

    public function test_password_update_revokes_existing_tokens(): void
    {
        $user = $this->userService->createUser([
            'name' => 'Eve Token',
            'email' => 'eve@deliverops.com',
            'password' => 'OldPassword123!',
            'job_title' => 'Tester',
            'department' => 'QA',
            'weekly_capacity_hours' => 40.0,
            'status' => 'active',
            'roles' => ['field_engineer'],
        ], null, $this->owner);

        // Issue tokens
        $user->createToken('session-1');
        $user->createToken('session-2');
        $this->assertCount(2, $user->tokens);

        // Update password through service
        $this->userService->updateUser($user, [
            'password' => 'NewPassword123!Secure',
        ], null, $this->owner);

        $user->refresh();
        $this->assertCount(0, $user->tokens);
    }
}

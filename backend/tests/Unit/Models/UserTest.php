<?php

namespace Tests\Unit\Models;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_user_can_be_created_with_factory(): void
    {
        $user = User::factory()->create([
            'name' => 'Alice Engineer',
            'email' => 'alice@deliverops.com',
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Alice Engineer',
            'email' => 'alice@deliverops.com',
        ]);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_user_password_is_hashed_and_hidden(): void
    {
        $user = User::factory()->create([
            'password' => 'PlaintextPassword123!',
        ]);

        $this->assertNotEquals('PlaintextPassword123!', $user->password);
        $this->assertArrayNotHasKey('password', $user->toArray());
    }

    public function test_user_unverified_state(): void
    {
        $user = User::factory()->unverified()->create();
        $this->assertNull($user->email_verified_at);
        $this->assertFalse($user->hasVerifiedEmail());
    }

    public function test_user_belongs_to_organizations(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner();

        $this->assertTrue($owner->organizations->contains($org));
        $this->assertTrue($owner->isOwnerOf($org));
    }

    public function test_user_default_organization_relationship(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner();

        $this->assertInstanceOf(Organization::class, $owner->defaultOrganization);
        $this->assertEquals($org->id, $owner->defaultOrganization->id);
    }

    public function test_user_soft_deletes(): void
    {
        $user = User::factory()->create();
        $userId = $user->id;

        $user->delete();

        $this->assertSoftDeleted('users', ['id' => $userId]);
        $this->assertNull(User::find($userId));
        $this->assertNotNull(User::withTrashed()->find($userId));
    }

    public function test_user_casts_attributes_properly(): void
    {
        $user = User::factory()->create([
            'mfa_enabled' => true,
            'failed_login_attempts' => 3,
            'weekly_capacity_hours' => 37.5,
        ]);

        $this->assertIsBool($user->mfa_enabled);
        $this->assertTrue($user->mfa_enabled);
        $this->assertIsInt($user->failed_login_attempts);
        $this->assertEquals(3, $user->failed_login_attempts);
        $this->assertIsFloat($user->weekly_capacity_hours);
        $this->assertEquals(37.5, $user->weekly_capacity_hours);
    }

    public function test_user_has_role_and_permissions(): void
    {
        [$org, $owner] = $this->createOrganizationWithOwner();

        $this->assertTrue($owner->hasRole('admin'));
    }
}

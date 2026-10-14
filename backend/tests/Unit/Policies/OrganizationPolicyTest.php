<?php

namespace Tests\Unit\Policies;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Policies\OrganizationPolicy;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected OrganizationPolicy $policy;
    protected Organization $orgA;
    protected User $ownerA;
    protected User $memberA;
    protected Organization $orgB;
    protected User $ownerB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->policy = new OrganizationPolicy();

        [$this->orgA, $this->ownerA] = $this->createOrganizationWithOwner(['name' => 'Org A']);
        $this->memberA = $this->addMemberToOrganization($this->orgA, 'field_engineer');

        [$this->orgB, $this->ownerB] = $this->createOrganizationWithOwner(['name' => 'Org B']);
    }

    public function test_member_and_owner_can_view_organization(): void
    {
        $this->assertTrue($this->policy->view($this->ownerA, $this->orgA));
        $this->assertTrue($this->policy->view($this->memberA, $this->orgA));
    }

    public function test_outsider_cannot_view_organization(): void
    {
        $this->assertFalse($this->policy->view($this->ownerB, $this->orgA));
    }

    public function test_owner_and_admin_can_update_organization(): void
    {
        $this->assertTrue($this->policy->update($this->ownerA, $this->orgA));
        $this->assertFalse($this->policy->update($this->memberA, $this->orgA));
        $this->assertFalse($this->policy->update($this->ownerB, $this->orgA));
    }

    public function test_only_owner_can_delete_organization(): void
    {
        $this->assertTrue($this->policy->delete($this->ownerA, $this->orgA));
        $this->assertFalse($this->policy->delete($this->memberA, $this->orgA));
        $this->assertFalse($this->policy->delete($this->ownerB, $this->orgA));
    }
}

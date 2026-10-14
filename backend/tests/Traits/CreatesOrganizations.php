<?php

namespace Tests\Traits;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

trait CreatesOrganizations
{
    /**
     * Helper to create an organization with an owner in one call.
     * Returns [$organization, $ownerUser]
     */
    protected function createOrganizationWithOwner(array $orgAttributes = [], array $userAttributes = []): array
    {
        $orgName = $orgAttributes['name'] ?? 'Test Enterprise ' . Str::random(4);
        $organization = Organization::create(array_merge([
            'id' => (string) Str::ulid(),
            'name' => $orgName,
            'slug' => Str::slug($orgName) . '-' . Str::random(4),
            'industry' => 'Technology',
            'region' => 'EMEA',
            'plan' => 'enterprise',
            'status' => 'active',
            'default_calendar' => 'standard_5d_40h',
            'timezone' => 'UTC',
            'base_currency' => 'USD',
        ], $orgAttributes));

        $owner = User::create(array_merge([
            'id' => (string) Str::ulid(),
            'name' => 'Owner ' . Str::random(4),
            'email' => 'owner.' . Str::random(6) . '@example.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'status' => 'active',
            'default_organization_id' => $organization->id,
            'email_verified_at' => now(),
        ], $userAttributes));

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'is_owner' => true,
            'joined_at' => now(),
        ]);

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($organization->id);
        }
        $owner->assignRole('admin');

        return [$organization, $owner];
    }

    /**
     * Helper to add a member to an existing organization
     */
    protected function addMemberToOrganization(Organization $organization, string $role = 'project_manager', array $userAttributes = []): User
    {
        $user = User::create(array_merge([
            'id' => (string) Str::ulid(),
            'name' => 'Member ' . Str::random(4),
            'email' => 'member.' . Str::random(6) . '@example.com',
            'password' => Hash::make('DeliverOps2026!Secure'),
            'status' => 'active',
            'default_organization_id' => $organization->id,
            'email_verified_at' => now(),
        ], $userAttributes));

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'is_owner' => false,
            'joined_at' => now(),
        ]);

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($organization->id);
        }
        $user->assignRole($role);

        return $user;
    }
}

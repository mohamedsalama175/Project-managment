<?php

namespace App\Modules\Identity\Services;

use App\Models\User;
use App\Modules\Tenancy\Models\OrganizationUser;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class ScimService
{
    public function formatScimUser(User $user, string $orgId): array
    {
        $membership = OrganizationUser::where('organization_id', $orgId)->where('user_id', $user->id)->first();
        $isActive = ($user->status === 'active') && ($membership !== null);

        return [
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:User'],
            'id' => $user->id,
            'userName' => $user->email,
            'name' => [
                'formatted' => $user->name,
                'givenName' => explode(' ', $user->name)[0] ?? '',
                'familyName' => explode(' ', $user->name, 2)[1] ?? '',
            ],
            'displayName' => $user->name,
            'emails' => [
                [
                    'value' => $user->email,
                    'type' => 'work',
                    'primary' => true,
                ],
            ],
            'active' => $isActive,
            'meta' => [
                'resourceType' => 'User',
                'created' => $user->created_at?->toIso8601String(),
                'lastModified' => $user->updated_at?->toIso8601String(),
                'location' => url("/scim/v2/Users/{$user->id}"),
            ],
        ];
    }

    public function listUsers(string $orgId, ?string $filter = null, int $startIndex = 1, int $count = 100): array
    {
        $userIds = OrganizationUser::where('organization_id', $orgId)->pluck('user_id');
        $query = User::whereIn('id', $userIds);

        if ($filter) {
            // Support simple SCIM filter: userName eq "email"
            if (preg_match('/userName\s+eq\s+"([^"]+)"/i', $filter, $matches)) {
                $query->where('email', strtolower($matches[1]));
            }
        }

        $totalResults = $query->count();
        $users = $query->skip(max(0, $startIndex - 1))->take($count)->get();

        $resources = $users->map(fn (User $u) => $this->formatScimUser($u, $orgId))->toArray();

        return [
            'schemas' => ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            'totalResults' => $totalResults,
            'startIndex' => $startIndex,
            'itemsPerPage' => count($resources),
            'Resources' => $resources,
        ];
    }

    public function createUser(string $orgId, array $data): array
    {
        $email = strtolower($data['userName'] ?? $data['emails'][0]['value'] ?? '');
        if (!$email) {
            throw new \InvalidArgumentException("SCIM User requires a valid userName / email.");
        }

        $name = $data['name']['formatted'] ?? $data['displayName'] ?? explode('@', $email)[0];
        $active = $data['active'] ?? true;

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'id' => (string) Str::ulid(),
                'name' => $name,
                'password' => Hash::make(Str::random(32)),
                'status' => $active ? 'active' : 'inactive',
                'email_verified_at' => now(),
                'default_organization_id' => $orgId,
            ]
        );

        OrganizationUser::firstOrCreate(
            ['organization_id' => $orgId, 'user_id' => $user->id],
            ['is_owner' => false, 'joined_at' => now()]
        );

        setPermissionsTeamId($orgId);
        if (!$user->roles()->exists()) {
            $user->assignRole('contributor');
        }

        return $this->formatScimUser($user, $orgId);
    }

    public function getUser(string $orgId, string $userId): array
    {
        $membership = OrganizationUser::where('organization_id', $orgId)->where('user_id', $userId)->firstOrFail();
        $user = User::findOrFail($userId);

        return $this->formatScimUser($user, $orgId);
    }

    public function patchUser(string $orgId, string $userId, array $operations): array
    {
        $membership = OrganizationUser::where('organization_id', $orgId)->where('user_id', $userId)->firstOrFail();
        $user = User::findOrFail($userId);

        foreach ($operations as $op) {
            $operation = strtolower($op['op'] ?? '');
            $path = strtolower($op['path'] ?? '');
            $value = $op['value'] ?? null;

            if ($operation === 'replace') {
                if ($path === 'active' || (is_array($value) && isset($value['active']))) {
                    $activeVal = $path === 'active' ? (bool) $value : (bool) $value['active'];
                    $user->update(['status' => $activeVal ? 'active' : 'inactive']);
                }
            }
        }

        return $this->formatScimUser($user, $orgId);
    }

    public function deleteUser(string $orgId, string $userId): void
    {
        OrganizationUser::where('organization_id', $orgId)->where('user_id', $userId)->delete();
    }

    public function listGroups(string $orgId): array
    {
        setPermissionsTeamId($orgId);
        $roles = Role::all();
        $resources = $roles->map(fn (Role $r) => [
            'schemas' => ['urn:ietf:params:scim:schemas:core:2.0:Group'],
            'id' => (string) $r->id,
            'displayName' => $r->name,
            'members' => [],
        ])->toArray();

        return [
            'schemas' => ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            'totalResults' => count($resources),
            'Resources' => $resources,
        ];
    }
}

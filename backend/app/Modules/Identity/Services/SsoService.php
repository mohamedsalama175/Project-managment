<?php

namespace App\Modules\Identity\Services;

use App\Models\User;
use App\Modules\Identity\Models\SsoConfiguration;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SsoService
{
    /**
     * Standard IdP attribute mapping defaults
     */
    public const DEFAULT_ATTRIBUTE_MAPPING = [
        'email' => 'email',
        'name' => 'name',
        'first_name' => 'given_name',
        'last_name' => 'family_name',
        'groups' => 'groups',
    ];

    public function initiateLogin(string $orgSlug): array
    {
        $org = Organization::where('slug', $orgSlug)->firstOrFail();
        $config = SsoConfiguration::where('organization_id', $org->id)->where('enabled', true)->firstOrFail();

        $state = Str::random(40);
        session(['sso_state' => $state, 'sso_org_id' => $org->id]);

        $redirectUrl = $config->sso_url . (str_contains($config->sso_url, '?') ? '&' : '?') . http_build_query([
            'response_type' => 'code',
            'client_id' => $config->client_id ?? $config->idp_entity_id,
            'redirect_uri' => url('/api/v1/auth/sso/callback'),
            'scope' => 'openid profile email',
            'state' => $state,
        ]);

        return [
            'redirect_url' => $redirectUrl,
            'provider' => $config->provider,
            'organization_id' => $org->id,
        ];
    }

    public function handleCallback(string $orgId, array $claims): array
    {
        $config = SsoConfiguration::where('organization_id', $orgId)->firstOrFail();
        $mapping = array_merge(self::DEFAULT_ATTRIBUTE_MAPPING, $config->attribute_mapping ?? []);

        $email = $claims[$mapping['email']] ?? $claims['email'] ?? null;
        if (!$email) {
            throw new \InvalidArgumentException("IdP assertion does not contain a valid email claim.");
        }

        $name = $claims[$mapping['name']] ?? trim(($claims[$mapping['first_name']] ?? '') . ' ' . ($claims[$mapping['last_name']] ?? ''));
        if (empty($name)) {
            $name = explode('@', $email)[0];
        }

        // Just-In-Time (JIT) Provisioning
        $user = User::firstOrCreate(
            ['email' => strtolower($email)],
            [
                'id' => (string) Str::ulid(),
                'name' => $name,
                'password' => Hash::make(Str::random(32)),
                'status' => 'active',
                'email_verified_at' => now(),
                'default_organization_id' => $orgId,
            ]
        );

        // Ensure tenant membership
        $membership = OrganizationUser::firstOrCreate(
            ['organization_id' => $orgId, 'user_id' => $user->id],
            ['is_owner' => false, 'joined_at' => now()]
        );

        // Map IdP groups to Spatie role
        $idpGroups = (array) ($claims[$mapping['groups']] ?? []);
        $roleMapping = $config->role_mapping ?? ['*' => 'contributor'];
        $assignedRole = 'viewer';

        foreach ($idpGroups as $group) {
            if (isset($roleMapping[$group])) {
                $assignedRole = $roleMapping[$group];
                break;
            }
        }
        if ($assignedRole === 'viewer' && isset($roleMapping['*'])) {
            $assignedRole = $roleMapping['*'];
        }

        setPermissionsTeamId($orgId);
        if (!$user->hasRole($assignedRole)) {
            $user->syncRoles([$assignedRole]);
        }

        $token = $user->createToken('sso-login', ["org:{$orgId}"])->plainTextToken;

        return [
            'token' => $token,
            'user' => $user,
            'organization_id' => $orgId,
            'role' => $assignedRole,
        ];
    }
}

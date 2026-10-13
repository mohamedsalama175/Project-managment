<?php

namespace App\Modules\Identity\Services;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class RegistrationService
{
    public function __construct(protected TenantManager $tenantManager) {}

    public function registerTenantAndOwner(array $data): array
    {
        return $this->tenantManager->executeWithoutTenantScope(function () use ($data) {
            return DB::transaction(function () use ($data) {
                $orgId = (string) Str::ulid();
                $userId = (string) Str::ulid();

                $orgName = $data['organization_name'] ?? $data['company_name'] ?? ($data['name'] . "'s Organization");
                // Slug Uniqueness Retry Loop with 10-attempt cap (Item 21)
                $baseSlug = Str::slug($orgName);
                $slug = $baseSlug;
                $counter = 1;

                while (Organization::where('slug', $slug)->exists()) {
                    if ($counter > 10) {
                        throw new RuntimeException('Failed to generate unique organization slug after 10 attempts.');
                    }
                    $slug = $baseSlug . '-' . Str::lower(Str::random(4)) . "-{$counter}";
                    $counter++;
                }

                $organization = Organization::create([
                    'id' => $orgId,
                    'name' => $orgName,
                    'slug' => $slug,
                    'industry' => $data['industry'] ?? null,
                    'region' => $data['region'] ?? 'MENA',
                    'plan' => 'free',
                    'trial_ends_at' => now()->addDays(14),
                    'billing_email' => $data['email'],
                    'timezone' => $data['timezone'] ?? 'UTC',
                    'status' => 'trialing',
                ]);

                $user = User::create([
                    'id' => $userId,
                    'default_organization_id' => $orgId, // Item 2 & 9
                    'name' => $data['name'],
                    'email' => strtolower($data['email']),
                    'password' => Hash::make($data['password']),
                    'job_title' => 'Owner',
                    'department' => 'Executive',
                    'weekly_capacity_hours' => 40.00,
                    'status' => 'active',
                    'color' => '#1f8a70',
                    'must_change_password' => false,
                ]);

                OrganizationUser::create([
                    'id' => (string) Str::ulid(),
                    'organization_id' => $orgId,
                    'user_id' => $userId,
                    'is_owner' => 1,
                    'joined_at' => now(),
                ]);

                // Assign Spatie team admin role
                setPermissionsTeamId($orgId);
                $user->assignRole('admin');

                event(new Registered($user));

                // Return user and organization ONLY (no token) (Item 2)
                return [
                    'user' => $user,
                    'organization' => $organization,
                ];
            });
        });
    }
}

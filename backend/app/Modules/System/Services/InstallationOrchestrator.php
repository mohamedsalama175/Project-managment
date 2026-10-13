<?php

namespace App\Modules\System\Services;

use App\Models\InstallState;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\SystemProjectTemplatesSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpKernel\Exception\HttpException;

class InstallationOrchestrator
{
    /**
     * Installs the system, seeds permissions and system templates, creates the primary administrator
     * and organization, and records install_state.
     *
     * @throws HttpException if already installed
     */
    public function install(array $data = [], string $installedVia = 'cli', ?string $ip = null): array
    {
        if (InstallState::isInstalled()) {
            throw new HttpException(409, 'SYSTEM_ALREADY_INSTALLED');
        }

        return DB::transaction(function () use ($data, $installedVia, $ip) {
            // 1. Run required seeders (PermissionSeeder and SystemProjectTemplatesSeeder)
            app(PermissionRegistrar::class)->forgetCachedPermissions();
            
            $permissionSeeder = new PermissionSeeder();
            $permissionSeeder->run();

            $templatesSeeder = new SystemProjectTemplatesSeeder();
            $templatesSeeder->run();

            // 2. Resolve administrator parameters or fallback to env
            $name = $data['name'] ?? env('INITIAL_ADMIN_NAME', config('app.initial_admin_name', 'DeliverOps Super Admin'));
            $email = strtolower($data['email'] ?? env('INITIAL_ADMIN_EMAIL', config('app.initial_admin_email', 'admin@deliverops.com')));
            $password = $data['password'] ?? env('INITIAL_ADMIN_PASSWORD', config('app.initial_admin_password', 'AdminPassword2026!'));
            $orgName = $data['organization_name'] ?? 'DeliverOps Primary Organization';

            // 3. Create or update the root system organization
            $systemOrgId = config('deliverops.system_org_id', '01HZX000000000000000000000');
            $org = Organization::firstOrCreate(
                ['id' => $systemOrgId],
                [
                    'name' => $orgName,
                    'slug' => Str::slug($orgName) ?: 'system-default',
                    'industry' => $data['industry'] ?? 'Platform Administration',
                    'region' => $data['region'] ?? null,
                    'plan' => 'enterprise',
                    'timezone' => 'UTC',
                    'status' => 'active',
                ]
            );

            // 4. Create primary admin user
            $adminUser = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make($password),
                    'job_title' => 'System Administrator',
                    'department' => 'Executive',
                    'weekly_capacity_hours' => 40,
                    'status' => 'active',
                    'color' => '#1f8a70',
                    'must_change_password' => false,
                    'default_organization_id' => $org->id,
                    'email_verified_at' => now(),
                ]
            );

            $adminUser->update([
                'name' => $name,
                'default_organization_id' => $org->id,
                'status' => 'active',
                'email_verified_at' => now(),
            ]);

            // 5. Link user as organization owner
            OrganizationUser::firstOrCreate(
                ['organization_id' => $org->id, 'user_id' => $adminUser->id],
                ['is_owner' => true, 'joined_at' => now()]
            );

            // 6. Assign Spatie Admin role in team context
            setPermissionsTeamId($org->id);
            $adminUser->syncRoles(['admin']);

            // 7. Persist install_state singleton
            $installState = InstallState::create([
                'id' => InstallState::SINGLETON_ID,
                'installed_at' => now(),
                'installed_via' => $installedVia,
                'installed_by_ip' => $ip,
                'admin_user_id' => $adminUser->id,
                'app_version' => config('deliverops.version', '1.0.0'),
            ]);

            return [
                'user' => $adminUser,
                'organization' => $org,
                'install_state' => $installState,
            ];
        });
    }
}

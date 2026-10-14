<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    /**
     * Seeds the primary Super Administrator account (admin@admin.com / 123456).
     */
    public function run(): void
    {
        $systemOrgId = config('deliverops.system_org_id', '01HZX000000000000000000000');
        $org = Organization::firstOrCreate(
            ['id' => $systemOrgId],
            [
                'name' => 'DeliverOps System Organization',
                'slug' => 'system-default',
                'industry' => 'Platform Administration',
                'region' => 'EMEA',
                'plan' => 'enterprise',
                'timezone' => 'UTC',
                'status' => 'active',
            ]
        );

        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name' => 'Super Administrator',
                'job_title' => 'System Administrator',
                'department' => 'Executive',
                'default_organization_id' => $systemOrgId,
                'weekly_capacity_hours' => 40.0,
                'password' => Hash::make('123456'),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
        $superAdmin->password = Hash::make('123456');
        $superAdmin->save();

        if (!$superAdmin->organizations()->where('organizations.id', $systemOrgId)->exists()) {
            $superAdmin->organizations()->attach($systemOrgId, [
                'id' => (string) Str::ulid(),
                'is_owner' => true,
                'joined_at' => now(),
            ]);
        }

        setPermissionsTeamId($systemOrgId);
        $superAdmin->syncRoles(['admin']);
        setPermissionsTeamId(null);

        // Seed all Team Directory members as real Users in the backend database
        $teamMembers = [
            [
                'email' => 'mahmoud.hossam@bitwise-solutions.com',
                'name' => 'Mahmoud Hossam',
                'job_title' => 'Backend',
                'department' => 'Engineering',
                'role' => 'field_engineer',
                'weekly_capacity_hours' => 40.0,
                'skills' => ['PHP', 'Laravel', 'Backend', 'API'],
                'color' => '#3b82f6',
                'password' => '12345678',
            ],
            [
                'email' => 'mohamed.magdy@bitwise-solutions.com',
                'name' => 'Mohamed Magdy',
                'job_title' => 'Frontend',
                'department' => 'Engineering',
                'role' => 'field_engineer',
                'weekly_capacity_hours' => 40.0,
                'skills' => ['React', 'TypeScript', 'Frontend', 'CSS'],
                'color' => '#10b981',
                'password' => '12345678',
            ],
            [
                'email' => 'hadeer.mahmoud@bitwise-solutions.com',
                'name' => 'Hadeer Mahmoud',
                'job_title' => 'frontend',
                'department' => 'Engineering',
                'role' => 'field_engineer',
                'weekly_capacity_hours' => 40.0,
                'skills' => ['React', 'UI/UX', 'Frontend'],
                'color' => '#0d9488',
                'password' => '12345678',
            ],
            [
                'email' => 'muhammad.mamdouh@bitwise-solutions.com',
                'name' => 'Muhammad Mamdouh',
                'job_title' => 'Engineering manager',
                'department' => 'Engineering',
                'role' => 'field_engineer',
                'weekly_capacity_hours' => 40.0,
                'skills' => ['Management', 'System Architecture', 'Engineering'],
                'color' => '#f59e0b',
                'password' => '12345678',
            ],
            [
                'email' => 'ahmed.sameh@bitwise-solutions.com',
                'name' => 'Ahmed sameh',
                'job_title' => 'Tester',
                'department' => 'Engineering',
                'role' => 'field_engineer',
                'weekly_capacity_hours' => 40.0,
                'skills' => ['QA', 'Testing', 'Automation'],
                'color' => '#6366f1',
                'password' => '12345678',
            ],
            [
                'email' => 'mohamed.salama@bitwise-solutions.com',
                'name' => 'Mohamed Salama',
                'job_title' => 'Product manager',
                'department' => 'Executive',
                'role' => 'admin',
                'weekly_capacity_hours' => 40.0,
                'skills' => ['Product Management', 'Full-Stack', 'DeliverOps'],
                'color' => '#10b981',
                'password' => '12345678',
            ],
        ];

        foreach ($teamMembers as $tm) {
            $member = User::firstOrCreate(
                ['email' => $tm['email']],
                [
                    'name' => $tm['name'],
                    'job_title' => $tm['job_title'],
                    'department' => $tm['department'],
                    'skills' => $tm['skills'],
                    'color' => $tm['color'],
                    'default_organization_id' => $systemOrgId,
                    'weekly_capacity_hours' => $tm['weekly_capacity_hours'],
                    'password' => Hash::make($tm['password'] ?? 'Password123!'),
                    'status' => 'active',
                    'email_verified_at' => now(),
                ]
            );

            if (isset($tm['password'])) {
                $member->password = Hash::make($tm['password']);
                $member->save();
            }

            if (!$member->organizations()->where('organizations.id', $systemOrgId)->exists()) {
                $member->organizations()->attach($systemOrgId, [
                    'id' => (string) Str::ulid(),
                    'is_owner' => false,
                    'joined_at' => now(),
                ]);
            }

            setPermissionsTeamId($systemOrgId);
            $member->syncRoles([$tm['role']]);
            setPermissionsTeamId(null);
        }

        \App\Models\InstallState::firstOrCreate(
            ['id' => \App\Models\InstallState::SINGLETON_ID],
            [
                'installed_at' => now(),
                'installed_via' => 'cli',
                'installed_by_ip' => '127.0.0.1',
                'admin_user_id' => $superAdmin->id,
                'app_version' => '1.0.0',
            ]
        );

        \App\Modules\Onboarding\Models\OnboardingProgress::firstOrCreate(
            [
                'organization_id' => $systemOrgId,
                'user_id' => $superAdmin->id,
            ],
            [
                'flow_type' => 'owner',
                'current_step' => 7,
                'completed_steps' => [1, 2, 3, 4, 5, 6, 7],
                'skipped_steps' => [],
                'is_completed' => true,
                'tour_completed' => true,
                'completed_at' => now(),
            ]
        );
    }
}

<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskEffortAllocation;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $orgId = config('deliverops.system_org_id', '01HZX000000000000000000000');
        $org = Organization::firstOrCreate(
            ['id' => $orgId],
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

        // 1. Seed Demo Team Members (Capacity = 40h each)
        $usersData = [
            [
                'email' => 'ahmed.khalil@deliverops.local',
                'name' => 'Ahmed Khalil',
                'job_title' => 'Lead Integration Engineer',
                'department' => 'Engineering',
                'role' => 'project_manager',
                'weekly_capacity_hours' => 40.0,
            ],
            [
                'email' => 'tariq.mansoor@deliverops.local',
                'name' => 'Tariq Mansoor',
                'job_title' => 'Systems & Simulator Specialist',
                'department' => 'Engineering',
                'role' => 'contributor',
                'weekly_capacity_hours' => 40.0,
            ],
            [
                'email' => 'sarah.loutfy@deliverops.local',
                'name' => 'Sarah Loutfy',
                'job_title' => 'Operations & PO Flow Lead',
                'department' => 'Operations',
                'role' => 'contributor',
                'weekly_capacity_hours' => 40.0,
            ],
            [
                'email' => 'omar.farouk@deliverops.local',
                'name' => 'Omar Farouk',
                'job_title' => 'Quality & Scale QA Inspector',
                'department' => 'QA & Compliance',
                'role' => 'contributor',
                'weekly_capacity_hours' => 40.0,
            ],
            [
                'email' => 'nouran.adel@deliverops.local',
                'name' => 'Nouran Adel',
                'job_title' => 'Frontend & UI Specialist',
                'department' => 'Product & Design',
                'role' => 'contributor',
                'weekly_capacity_hours' => 40.0,
            ],
            [
                'email' => 'admin@admin.com',
                'name' => 'Super Administrator',
                'job_title' => 'System Administrator',
                'department' => 'Executive',
                'role' => 'admin',
                'weekly_capacity_hours' => 40.0,
                'password' => '123456',
            ],
            [
                'email' => 'director@deliverops.local',
                'name' => 'Executive Director',
                'job_title' => 'Managing Director',
                'department' => 'Executive',
                'role' => 'admin',
                'weekly_capacity_hours' => 40.0,
            ],
        ];

        $userMap = [];
        foreach ($usersData as $ud) {
            $user = User::firstOrCreate(
                ['email' => $ud['email']],
                [
                    'name' => $ud['name'],
                    'job_title' => $ud['job_title'],
                    'department' => $ud['department'],
                    'default_organization_id' => $orgId,
                    'weekly_capacity_hours' => $ud['weekly_capacity_hours'],
                    'password' => Hash::make($ud['password'] ?? Str::random(32)),
                    'status' => 'active',
                    'email_verified_at' => now(),
                ]
            );
            if (isset($ud['password'])) {
                $user->password = Hash::make($ud['password']);
                $user->save();
            }
            $user->syncRoles([$ud['role']]);
            $userMap[$ud['name']] = $user;
        }

        // 2. Demo Project
        $project = Project::firstOrCreate(
            ['code' => 'MAFI-01'],
            [
                'organization_id' => $orgId,
                'name' => 'MAFI Citrus Automated Weighing & PO Integration',
                'project_manager_id' => $userMap['Ahmed Khalil']->id,
                'status' => 'active',
                'progress_pct' => 15,
                'start_date' => '2026-10-04',
                'target_end_date' => '2026-11-15',
            ]
        );

        // Rebalanced Allocation Profile:
        // Ahmed Khalil: 36h / 40h = 90% (80–95%)
        // Nouran Adel: 34h / 40h = 85% (80–95%)
        // Tariq Mansoor: 39h / 40h = 97.5% (95–100%)
        // Omar Farouk: 38h / 40h = 95% (95–100%)
        // Sarah Loutfy: 44h / 40h = 110% (105–115%)
        // Executive Director: 20h / 40h = 50% (50%)
        $tasksData = [
            ['name' => 'Scale application done on MAFI server', 'owner' => 'Ahmed Khalil', 'hours' => 16.0, 'status' => 'In Progress', 'pct' => 45],
            ['name' => 'Make a simulator for the scale', 'owner' => 'Tariq Mansoor', 'hours' => 16.0, 'contrib' => 'Ahmed Khalil', 'contrib_hours' => 4.0, 'status' => 'In Progress', 'pct' => 80],
            ['name' => 'Add supplier site field', 'owner' => 'Sarah Loutfy', 'hours' => 12.0, 'status' => 'In Progress', 'pct' => 30],
            ['name' => 'Add PO type & workflow validation', 'owner' => 'Sarah Loutfy', 'hours' => 16.0, 'status' => 'In Progress', 'pct' => 15],
            ['name' => 'Add PO reference & tracking ID', 'owner' => 'Omar Farouk', 'hours' => 18.0, 'status' => 'Not Started', 'pct' => 0],
            ['name' => 'Add order number generation', 'owner' => 'Omar Farouk', 'hours' => 20.0, 'status' => 'Not Started', 'pct' => 0],
            ['name' => 'Remaining quantity calculation engine', 'owner' => 'Tariq Mansoor', 'hours' => 11.0, 'status' => 'Not Started', 'pct' => 0],
            ['name' => 'Inventory organization & bin mapping', 'owner' => 'Sarah Loutfy', 'hours' => 16.0, 'status' => 'Not Started', 'pct' => 0],
            ['name' => 'Add post test flow & calibration sign-off', 'owner' => 'Ahmed Khalil', 'hours' => 8.0, 'status' => 'Not Started', 'pct' => 0],
            ['name' => 'Block reasons CRUD (truck, driver compliance)', 'owner' => 'Nouran Adel', 'hours' => 14.0, 'status' => 'Not Started', 'pct' => 0],
            ['name' => 'Hardware Acceptance Sign-off Milestone', 'owner' => 'Executive Director', 'hours' => 20.0, 'status' => 'Not Started', 'pct' => 0],
        ];

        // Second Project (ERP-02)
        $project2 = Project::firstOrCreate(
            ['code' => 'DOPS-02'],
            [
                'organization_id' => $orgId,
                'name' => 'DeliverOps Next-Gen Cloud Platform',
                'project_manager_id' => $userMap['Ahmed Khalil']->id,
                'status' => 'active',
                'progress_pct' => 40,
                'start_date' => '2026-10-01',
                'target_end_date' => '2026-12-15',
            ]
        );

        $tasksData2 = [
            ['name' => 'Database Schema & Partitioning Model', 'owner' => 'Tariq Mansoor', 'hours' => 12.0, 'status' => 'In Progress', 'pct' => 90],
            ['name' => 'Capacity Engine & Workload Mathematics', 'owner' => 'Ahmed Khalil', 'hours' => 8.0, 'status' => 'In Progress', 'pct' => 35],
            ['name' => 'Claymorphic UI System & Responsive Dock', 'owner' => 'Nouran Adel', 'hours' => 20.0, 'status' => 'In Progress', 'pct' => 75],
        ];

        $allProjectConfigs = [
            [$project, $tasksData],
            [$project2, $tasksData2],
        ];

        foreach ($allProjectConfigs as [$proj, $taskConfigs]) {
            foreach ($taskConfigs as $idx => $td) {
                $ownerUser = $userMap[$td['owner']];
                $task = Task::firstOrCreate(
                    [
                        'project_id' => $proj->id,
                        'name' => $td['name'],
                    ],
                    [
                        'organization_id' => $orgId,
                        'category' => 'Engineering',
                        'priority' => 'High',
                        'start_date' => '2026-10-04',
                        'end_date' => '2026-10-25',
                        'pct' => $td['pct'],
                        'status' => $td['status'],
                        'primary_owner_id' => $ownerUser->id,
                        'primary_owner_hours' => $td['hours'],
                        'estimated_hours' => $td['hours'] + ($td['contrib_hours'] ?? 0),
                        'order_index' => $idx + 1,
                    ]
                );

                if (isset($td['contrib']) && isset($td['contrib_hours'])) {
                    $contribUser = $userMap[$td['contrib']];
                    TaskEffortAllocation::firstOrCreate(
                        [
                            'task_id' => $task->id,
                            'user_id' => $contribUser->id,
                        ],
                        [
                            'organization_id' => $orgId,
                            'allocated_hours' => $td['contrib_hours'],
                        ]
                    );
                }
            }
        }
    }
}

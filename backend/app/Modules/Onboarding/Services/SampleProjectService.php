<?php

namespace App\Modules\Onboarding\Services;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Models\TaskDependency;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SampleProjectService
{
    /**
     * Create a realistic sample project with 10 tasks, dependencies, and 2 risks.
     * Flagged with is_sample = true and linked to the organization.
     */
    public function createSampleProject(Organization $org, User $user): Project
    {
        return DB::transaction(function () use ($org, $user) {
            // If organization already has a sample project, return it
            if ($org->sample_project_id) {
                $existing = Project::withoutGlobalScopes()
                    ->where('id', $org->sample_project_id)
                    ->where('is_sample', true)
                    ->first();
                if ($existing) {
                    return $existing;
                }
            }

            $projectId = (string) Str::ulid();
            $startDate = Carbon::today()->addDays(1);

            $project = Project::withoutGlobalScopes()->create([
                'id' => $projectId,
                'organization_id' => $org->id,
                'name' => 'Demo: E-Commerce Platform Modernization',
                'code' => 'SMPL-' . strtoupper(Str::random(5)),
                'description' => 'Interactive sample project showcasing deliverable WBS breakdown, critical path calculations, and risk tracking.',
                'client_name' => 'Acme Global Retail',
                'project_type' => 'client',
                'project_manager_id' => $user->id,
                'config' => ['calendar' => 'standard_5d_40h'],
                'has_locked_baseline' => false,
                'tree_version' => 1,
                'is_archived' => false,
                'is_sample' => true,
            ]);

            // Add user to project roster
            $project->members()->attach($user->id, [
                'id' => (string) Str::ulid(),
                'project_role' => 'lead',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create 10 realistic tasks
            $taskDefs = [
                ['wbs' => '1.0', 'name' => 'Architecture & Solution Design', 'dur' => 5, 'parent' => null, 'progress' => 100, 'status' => 'completed'],
                ['wbs' => '1.1', 'name' => 'Domain Model & Database Schema', 'dur' => 3, 'parent' => '1.0', 'progress' => 100, 'status' => 'completed'],
                ['wbs' => '1.2', 'name' => 'API Contracts & OpenAPI Specifications', 'dur' => 4, 'parent' => '1.0', 'progress' => 100, 'status' => 'completed'],
                ['wbs' => '2.0', 'name' => 'Core Microservices Implementation', 'dur' => 10, 'parent' => null, 'progress' => 60, 'status' => 'in_progress'],
                ['wbs' => '2.1', 'name' => 'Catalog & Inventory Service', 'dur' => 6, 'parent' => '2.0', 'progress' => 80, 'status' => 'in_progress'],
                ['wbs' => '2.2', 'name' => 'Checkout & Payment Gateway', 'dur' => 7, 'parent' => '2.0', 'progress' => 40, 'status' => 'in_progress'],
                ['wbs' => '3.0', 'name' => 'Frontend Storefront & Experience', 'dur' => 8, 'parent' => null, 'progress' => 30, 'status' => 'in_progress'],
                ['wbs' => '3.1', 'name' => 'Responsive UI Component Library', 'dur' => 5, 'parent' => '3.0', 'progress' => 50, 'status' => 'in_progress'],
                ['wbs' => '4.0', 'name' => 'Quality Assurance & Automated Testing', 'dur' => 6, 'parent' => null, 'progress' => 0, 'status' => 'not_started'],
                ['wbs' => '5.0', 'name' => 'Production Go-Live & Canary Release', 'dur' => 3, 'parent' => null, 'progress' => 0, 'status' => 'not_started'],
            ];

            $taskMap = [];
            $currentDate = $startDate->copy();

            foreach ($taskDefs as $index => $def) {
                $taskId = (string) Str::ulid();
                $parentId = $def['parent'] ? ($taskMap[$def['parent']] ?? null) : null;
                $taskStart = $currentDate->copy()->addDays($index * 2);
                $taskEnd = $taskStart->copy()->addDays($def['dur']);

                $task = Task::withoutGlobalScopes()->create([
                    'id' => $taskId,
                    'project_id' => $projectId,
                    'organization_id' => $org->id,
                    'parent_id' => $parentId,
                    'wbs_code' => $def['wbs'],
                    'name' => $def['name'],
                    'category' => 'Execution',
                    'start_date' => $taskStart->toDateString(),
                    'end_date' => $taskEnd->toDateString(),
                    'pct' => $def['progress'],
                    'status' => $def['status'] === 'completed' ? 'Completed' : ($def['status'] === 'in_progress' ? 'In Progress' : 'Not Started'),
                    'priority' => 'Medium',
                    'order_index' => $index + 1,
                    'description' => "Deliverable for {$def['name']}",
                    'primary_owner_id' => $user->id,
                ]);

                $taskMap[$def['wbs']] = $taskId;
            }

            // Create Dependencies (long-form enum: finish_to_start)
            $dependencies = [
                ['pred' => '1.0', 'succ' => '2.0'],
                ['pred' => '2.1', 'succ' => '2.2'],
                ['pred' => '2.0', 'succ' => '3.0'],
                ['pred' => '3.0', 'succ' => '4.0'],
                ['pred' => '4.0', 'succ' => '5.0'],
            ];

            foreach ($dependencies as $dep) {
                if (isset($taskMap[$dep['pred']]) && isset($taskMap[$dep['succ']])) {
                    TaskDependency::withoutGlobalScopes()->create([
                        'id' => (string) Str::ulid(),
                        'task_id' => $taskMap[$dep['succ']], // successor
                        'predecessor_id' => $taskMap[$dep['pred']], // predecessor
                        'dependency_type' => 'finish_to_start',
                        'lag_days' => 0,
                    ]);
                }
            }

            // Create 2 Project Risks
            ProjectRisk::withoutGlobalScopes()->create([
                'id' => (string) Str::ulid(),
                'project_id' => $projectId,
                'title' => 'Payment Gateway Webhook SLA Latency',
                'description' => 'Third-party sandbox webhook timeouts during surge simulation.',
                'type' => 'risk',
                'severity' => 'medium',
                'status' => 'investigating',
                'likelihood' => 'medium',
                'impact' => 'medium',
                'identified_date' => Carbon::today()->toDateString(),
                'due_date' => Carbon::today()->addDays(14)->toDateString(),
                'mitigation_plan' => 'Implement idempotency retries with exponential backoff and jitter.',
                'owner_id' => $user->id,
            ]);

            ProjectRisk::withoutGlobalScopes()->create([
                'id' => (string) Str::ulid(),
                'project_id' => $projectId,
                'title' => 'Staging CDN Edge SSL Certificate Expiry',
                'description' => 'Automated certbot renewal failure on staging wildcard domain.',
                'type' => 'issue',
                'severity' => 'low',
                'status' => 'open',
                'likelihood' => 'low',
                'impact' => 'low',
                'identified_date' => Carbon::today()->toDateString(),
                'due_date' => Carbon::today()->addDays(7)->toDateString(),
                'mitigation_plan' => 'Migrate staging to managed Cloudflare origin certificates.',
                'owner_id' => $user->id,
            ]);

            // Update organization sample data pointer
            $org->update([
                'sample_project_id' => $project->id,
                'sample_data_opted_in' => true,
                'sample_data_opted_in_at' => now(),
            ]);

            return $project;
        });
    }

    /**
     * Purge sample project from the organization.
     * Cascades delete across tasks, dependencies, and risks via FK cascade.
     */
    public function purge(Organization $org): void
    {
        DB::transaction(function () use ($org) {
            if ($org->sample_project_id) {
                $sampleProject = Project::withoutGlobalScopes()
                    ->where('id', $org->sample_project_id)
                    ->where('is_sample', true)
                    ->first();

                if ($sampleProject) {
                    $sampleProject->forceDelete();
                }

                $org->update([
                    'sample_project_id' => null,
                    'sample_data_opted_in' => false,
                ]);
            }
        });
    }
}

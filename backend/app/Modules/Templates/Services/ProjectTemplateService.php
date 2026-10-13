<?php

namespace App\Modules\Templates\Services;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Models\TaskDependency;
use App\Models\User;
use App\Modules\Templates\Models\ProjectTemplate;
use App\Modules\Tenancy\Exceptions\PlanLimitExceededException;
use App\Modules\Tenancy\Models\Organization;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ProjectTemplateService
{
    /**
     * List all templates accessible in the current context.
     * Hybrid visibility applies automatically via model scope.
     */
    public function listTemplates(?string $search = null, ?string $industry = null): Collection
    {
        $query = ProjectTemplate::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($industry && strtolower($industry) !== 'all') {
            $query->where('industry', $industry);
        }

        return $query->orderBy('is_system', 'desc')->orderBy('name')->get();
    }

    /**
     * Retrieve a specific template by ID or throw 404 with TEMPLATE_NOT_FOUND.
     */
    public function getTemplate(string $id): ProjectTemplate
    {
        $template = ProjectTemplate::find($id);

        if (!$template) {
            throw new HttpException(404, 'TEMPLATE_NOT_FOUND');
        }

        return $template;
    }

    /**
     * Create a new project instantiated from a project template.
     */
    public function createProjectFromTemplate(ProjectTemplate $template, Organization $org, User $user, array $overrides = []): Project
    {
        if (!$org->canCreateProject()) {
            throw new PlanLimitExceededException('Organization plan limit reached for total projects.');
        }

        return DB::transaction(function () use ($template, $org, $user, $overrides) {
            $projectId = (string) Str::ulid();
            $projectName = $overrides['name'] ?? $template->name;
            $projectCode = $overrides['code'] ?? ('PRJ-' . strtoupper(Str::random(5)));

            $project = Project::withoutGlobalScopes()->create([
                'id' => $projectId,
                'organization_id' => $org->id,
                'name' => $projectName,
                'code' => $projectCode,
                'description' => $overrides['description'] ?? $template->description,
                'client_name' => $overrides['client_name'] ?? null,
                'project_type' => $overrides['project_type'] ?? 'client',
                'project_manager_id' => $user->id,
                'config' => ['calendar' => $org->default_calendar ?? 'standard_5d_40h'],
                'has_locked_baseline' => false,
                'tree_version' => 1,
                'is_archived' => false,
                'is_sample' => false,
            ]);

            // Add user to project roster as Lead
            $project->members()->attach($user->id, [
                'id' => (string) Str::ulid(),
                'project_role' => 'lead',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $templateData = $template->template_data ?? [];
            $tasks = $templateData['tasks'] ?? [];
            $dependencies = $templateData['dependencies'] ?? [];
            $risks = $templateData['risks'] ?? [];

            $taskMap = [];
            $startDate = Carbon::today()->addDays(1);

            // Phase 1: Create tasks (first pass without parent_id)
            foreach ($tasks as $index => $tDef) {
                $tempId = $tDef['temp_id'] ?? ('T' . ($index + 1));
                $taskId = (string) Str::ulid();
                $dur = (int) ($tDef['duration_days'] ?? 1);
                $taskStart = $startDate->copy()->addDays($index * 2);
                $taskEnd = $taskStart->copy()->addDays($dur);

                Task::withoutGlobalScopes()->create([
                    'id' => $taskId,
                    'project_id' => $projectId,
                    'organization_id' => $org->id,
                    'parent_id' => null, // will link in second pass
                    'wbs_code' => $tDef['wbs_code'] ?? ($index + 1 . '.0'),
                    'name' => $tDef['name'],
                    'category' => $tDef['category'] ?? 'Execution',
                    'start_date' => $taskStart->toDateString(),
                    'end_date' => $taskEnd->toDateString(),
                    'pct' => 0,
                    'status' => 'Not Started',
                    'priority' => ucfirst(strtolower($tDef['priority'] ?? 'Medium')),
                    'order_index' => $tDef['order_index'] ?? ($index + 1),
                    'description' => $tDef['description'] ?? null,
                    'primary_owner_id' => $user->id,
                ]);

                $taskMap[$tempId] = $taskId;
            }

            // Phase 2: Link hierarchy parents
            foreach ($tasks as $tDef) {
                $tempId = $tDef['temp_id'] ?? null;
                $parentTempId = $tDef['parent_temp_id'] ?? null;

                if ($tempId && $parentTempId && isset($taskMap[$tempId]) && isset($taskMap[$parentTempId])) {
                    Task::withoutGlobalScopes()
                        ->where('id', $taskMap[$tempId])
                        ->update(['parent_id' => $taskMap[$parentTempId]]);
                }
            }

            // Phase 3: Insert Dependencies
            foreach ($dependencies as $dep) {
                $predTemp = $dep['predecessor_temp_id'] ?? null;
                $succTemp = $dep['successor_temp_id'] ?? null;

                if ($predTemp && $succTemp && isset($taskMap[$predTemp]) && isset($taskMap[$succTemp])) {
                    TaskDependency::withoutGlobalScopes()->create([
                        'id' => (string) Str::ulid(),
                        'task_id' => $taskMap[$succTemp],
                        'predecessor_id' => $taskMap[$predTemp],
                        'dependency_type' => $dep['dependency_type'] ?? 'finish_to_start',
                        'lag_days' => (int) ($dep['lag_days'] ?? 0),
                    ]);
                }
            }

            // Phase 4: Insert Risks
            foreach ($risks as $rDef) {
                ProjectRisk::withoutGlobalScopes()->create([
                    'id' => (string) Str::ulid(),
                    'project_id' => $projectId,
                    'title' => $rDef['title'],
                    'description' => $rDef['description'] ?? '',
                    'type' => $rDef['type'] ?? 'risk',
                    'severity' => $rDef['severity'] ?? 'medium',
                    'status' => 'open',
                    'likelihood' => $rDef['likelihood'] ?? 'medium',
                    'impact' => $rDef['impact'] ?? 'medium',
                    'identified_date' => Carbon::today()->toDateString(),
                    'due_date' => Carbon::today()->addDays(14)->toDateString(),
                    'mitigation_plan' => $rDef['mitigation_plan'] ?? null,
                    'owner_id' => $user->id,
                ]);
            }

            return $project;
        });
    }

    /**
     * Save an existing project's structure as a new custom reusable project template.
     */
    public function saveAsTemplate(Project $project, User $user, array $data): ProjectTemplate
    {
        $tasks = $project->tasks()->orderBy('order_index')->get();

        if ($tasks->isEmpty()) {
            throw new HttpException(422, 'TEMPLATE_SOURCE_EMPTY');
        }

        $idToTempId = [];
        $templateTasks = [];

        foreach ($tasks as $idx => $task) {
            $tempId = 'T' . ($idx + 1);
            $idToTempId[$task->id] = $tempId;
        }

        foreach ($tasks as $idx => $task) {
            $templateTasks[] = [
                'temp_id' => $idToTempId[$task->id],
                'wbs_code' => $task->wbs_code ?? ($idx + 1 . '.0'),
                'name' => $task->name,
                'duration_days' => $task->duration_days,
                'parent_temp_id' => $task->parent_id ? ($idToTempId[$task->parent_id] ?? null) : null,
                'order_index' => $task->order_index,
                'description' => $task->description,
                'priority' => $task->priority,
            ];
        }

        $taskIds = $tasks->pluck('id');
        $dependencies = TaskDependency::withoutGlobalScopes()
            ->whereIn('task_id', $taskIds)
            ->whereIn('predecessor_id', $taskIds)
            ->get();

        $templateDeps = [];
        foreach ($dependencies as $dep) {
            if (isset($idToTempId[$dep->predecessor_id]) && isset($idToTempId[$dep->task_id])) {
                $templateDeps[] = [
                    'predecessor_temp_id' => $idToTempId[$dep->predecessor_id],
                    'successor_temp_id' => $idToTempId[$dep->task_id],
                    'dependency_type' => $dep->dependency_type,
                    'lag_days' => $dep->lag_days,
                ];
            }
        }

        $risks = $project->risks()->get();
        $templateRisks = [];
        foreach ($risks as $risk) {
            $templateRisks[] = [
                'title' => $risk->title,
                'description' => $risk->description,
                'type' => in_array($risk->type, ['risk', 'issue', 'dependency', 'assumption'], true) ? $risk->type : 'risk',
                'severity' => in_array($risk->severity, ['low', 'medium', 'high', 'critical'], true) ? $risk->severity : 'medium',
                'impact' => in_array($risk->impact, ['low', 'medium', 'high'], true) ? $risk->impact : 'medium',
                'likelihood' => in_array($risk->likelihood, ['low', 'medium', 'high'], true) ? $risk->likelihood : 'medium',
                'mitigation_plan' => $risk->mitigation_plan,
            ];
        }

        // Define $templateData before checking size
        $templateData = [
            'tasks' => $templateTasks,
            'dependencies' => $templateDeps,
            'risks' => $templateRisks,
        ];

        $jsonEncoded = json_encode($templateData);
        if ($jsonEncoded === false || strlen($jsonEncoded) > 5 * 1024 * 1024) {
            throw new HttpException(422, 'TEMPLATE_PAYLOAD_TOO_LARGE');
        }

        return ProjectTemplate::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $project->organization_id,
            'name' => $data['name'],
            'slug' => Str::slug($data['name']) . '-' . Str::random(4),
            'description' => $data['description'] ?? null,
            'industry' => $data['industry'] ?? 'General',
            'category' => $data['category'] ?? 'custom',
            'is_system' => false,
            'version' => 1,
            'template_data' => $templateData,
            'created_by_id' => $user->id,
        ]);
    }
}

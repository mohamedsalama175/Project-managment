<?php

namespace App\Modules\Integrations\Services\Importers;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskDependency;
use App\Models\User;
use App\Modules\Integrations\Models\ImportBatch;
use App\Modules\Scheduling\Exceptions\CycleDetectedException;
use App\Modules\Scheduling\Services\CpmSchedulingService;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

abstract class BaseImporter
{
    public function __construct(
        protected CpmSchedulingService $cpmService
    ) {}

    abstract public function getSourceToolName(): string;

    /**
     * Pass 1: Parse raw file content into normalized tasks and dependencies.
     * Returns [$normalizedTasks, $normalizedDependencies]
     */
    abstract protected function parse(string $rawContent): array;

    /**
     * Execute the 5-pass import workflow.
     */
    public function import(Project $project, User $user, string $fileName, string $rawContent): ImportBatch
    {
        $errors = [];
        $tasksCount = 0;
        $dependenciesCount = 0;

        try {
            // Pass 1: Parse
            [$normalizedTasks, $normalizedDependencies] = $this->parse($rawContent);

            DB::beginTransaction();

            // Pass 2: Insert tasks
            $sourceIdToTaskId = [];
            $order = 0;

            foreach ($normalizedTasks as $taskData) {
                $order++;
                $task = Task::create([
                    'id' => (string) Str::ulid(),
                    'organization_id' => $project->organization_id,
                    'project_id' => $project->id,
                    'title' => $taskData['title'] ?? 'Untitled Task',
                    'description' => $taskData['description'] ?? null,
                    'status' => $taskData['status'] ?? 'todo',
                    'priority' => $taskData['priority'] ?? 'medium',
                    'is_milestone' => (bool) ($taskData['is_milestone'] ?? false),
                    'estimated_hours' => (float) ($taskData['estimated_hours'] ?? 0),
                    'order_index' => $taskData['order_index'] ?? $order,
                    'start_date' => $taskData['start_date'] ?? null,
                    'due_date' => $taskData['due_date'] ?? null,
                ]);

                $sourceId = (string) ($taskData['source_id'] ?? $task->id);
                $sourceIdToTaskId[$sourceId] = $task->id;
                $tasksCount++;
            }

            // Set parent_id hierarchy
            foreach ($normalizedTasks as $taskData) {
                $sourceId = (string) ($taskData['source_id'] ?? '');
                $parentSourceId = isset($taskData['parent_source_id']) ? (string) $taskData['parent_source_id'] : null;

                if ($parentSourceId && isset($sourceIdToTaskId[$sourceId]) && isset($sourceIdToTaskId[$parentSourceId])) {
                    Task::where('id', $sourceIdToTaskId[$sourceId])->update([
                        'parent_id' => $sourceIdToTaskId[$parentSourceId],
                    ]);
                }
            }

            // Pass 3: Insert task dependencies
            foreach ($normalizedDependencies as $depData) {
                $taskSourceId = (string) ($depData['task_source_id'] ?? '');
                $predSourceId = (string) ($depData['predecessor_source_id'] ?? '');

                if (isset($sourceIdToTaskId[$taskSourceId]) && isset($sourceIdToTaskId[$predSourceId])) {
                    $taskId = $sourceIdToTaskId[$taskSourceId];
                    $predId = $sourceIdToTaskId[$predSourceId];

                    if ($taskId !== $predId) {
                        TaskDependency::create([
                            'id' => (string) Str::ulid(),
                            'organization_id' => $project->organization_id,
                            'project_id' => $project->id,
                            'task_id' => $taskId,
                            'predecessor_id' => $predId,
                            'dependency_type' => $depData['dependency_type'] ?? 'FS',
                            'lag_days' => $depData['lag_days'] ?? 0,
                        ]);
                        $dependenciesCount++;
                    }
                }
            }

            // Pass 4: Run CPM calculation
            try {
                $this->cpmService->calculateCriticalPath($project);
            } catch (CycleDetectedException $e) {
                $errors[] = 'A circular dependency cycle was detected and skipped in schedule calculation.';
            }

            DB::commit();

            // Pass 5: Record ImportBatch
            return ImportBatch::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $project->organization_id,
                'created_by_id' => $user->id,
                'project_id' => $project->id,
                'provider' => $this->getSourceToolName(),
                'file_name' => $fileName,
                'summary' => [
                    'tasks_count' => $tasksCount,
                    'dependencies_count' => $dependenciesCount,
                    'errors' => empty($errors) ? null : $errors,
                ],
                'status' => 'completed',
            ]);
        } catch (Exception $e) {
            DB::rollBack();
            $errors[] = $e->getMessage();

            return ImportBatch::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $project->organization_id,
                'created_by_id' => $user->id,
                'project_id' => $project->id,
                'provider' => $this->getSourceToolName(),
                'file_name' => $fileName,
                'summary' => [
                    'tasks_count' => $tasksCount,
                    'dependencies_count' => $dependenciesCount,
                    'errors' => $errors,
                ],
                'status' => 'failed',
            ]);
        }
    }
}

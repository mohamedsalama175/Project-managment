<?php

namespace App\Modules\Tasks\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskDependency;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TaskImportService
{
    /**
     * Import tasks from CSV or JSON file/payload into a target project.
     * Supports dry-run validation with code IMPORT_DRY_RUN_PASSED.
     */
    public function import(Project $project, User $user, UploadedFile|array $source, bool $dryRun = false): array
    {
        $rawRecords = is_array($source) ? $source : $this->parseFile($source);

        if (empty($rawRecords)) {
            throw new HttpException(422, 'IMPORT_PAYLOAD_INVALID');
        }

        $validatedTasks = [];
        $validatedDependencies = [];
        $wbsIndexMap = [];

        // 1. Validate individual task records
        foreach ($rawRecords as $index => $row) {
            $rowNum = $index + 1;
            $name = trim($row['name'] ?? '');
            if (!$name) {
                throw new HttpException(422, "Row #{$rowNum}: The task name field is required.");
            }

            $wbs = trim($row['wbs_code'] ?? ($rowNum . '.0'));
            $dur = max(1, (int) ($row['duration_days'] ?? 1));
            $parentWbs = !empty($row['parent_wbs_code']) ? trim($row['parent_wbs_code']) : null;

            if ($parentWbs && $parentWbs === $wbs) {
                throw new HttpException(422, "Row #{$rowNum}: Task cannot be its own parent.");
            }

            $validatedTasks[] = [
                'row' => $rowNum,
                'name' => $name,
                'wbs_code' => $wbs,
                'duration_days' => $dur,
                'parent_wbs' => $parentWbs,
                'order_index' => (int) ($row['order_index'] ?? $rowNum),
                'description' => $row['description'] ?? null,
                'priority' => $row['priority'] ?? 'medium',
                'predecessors' => !empty($row['predecessors']) ? (is_array($row['predecessors']) ? $row['predecessors'] : explode(',', (string) $row['predecessors'])) : [],
            ];

            $wbsIndexMap[$wbs] = $index;
        }

        // 2. Validate hierarchy and dependency relationships
        foreach ($validatedTasks as $t) {
            if ($t['parent_wbs'] && !isset($wbsIndexMap[$t['parent_wbs']])) {
                throw new HttpException(422, "Row #{$t['row']}: Parent task with WBS code '{$t['parent_wbs']}' does not exist in dataset.");
            }

            foreach ($t['predecessors'] as $predWbs) {
                $trimmedPred = trim($predWbs);
                if ($trimmedPred) {
                    if (!isset($wbsIndexMap[$trimmedPred])) {
                        throw new HttpException(422, "Row #{$t['row']}: Predecessor task with WBS code '{$trimmedPred}' does not exist in dataset.");
                    }
                    if ($trimmedPred === $t['wbs_code']) {
                        throw new HttpException(422, "Row #{$t['row']}: Task cannot depend on itself.");
                    }
                    $validatedDependencies[] = [
                        'successor_wbs' => $t['wbs_code'],
                        'predecessor_wbs' => $trimmedPred,
                    ];
                }
            }
        }

        // 3. Dry-run Mode
        if ($dryRun) {
            return [
                'dry_run' => true,
                'code' => 'IMPORT_DRY_RUN_PASSED',
                'message' => 'Task import dry-run validated successfully with no errors.',
                'summary' => [
                    'tasks_count' => count($validatedTasks),
                    'dependencies_count' => count($validatedDependencies),
                ],
                'tasks' => $validatedTasks,
            ];
        }

        // 4. Persistence Mode
        return DB::transaction(function () use ($project, $user, $validatedTasks, $validatedDependencies) {
            $taskMap = [];
            $startDate = Carbon::today()->addDays(1);

            foreach ($validatedTasks as $idx => $t) {
                $taskId = (string) Str::ulid();
                $dur = $t['duration_days'];
                $taskStart = $startDate->copy()->addDays($idx * 2);
                $taskEnd = $taskStart->copy()->addDays($dur);

                Task::withoutGlobalScopes()->create([
                    'id' => $taskId,
                    'project_id' => $project->id,
                    'organization_id' => $project->organization_id,
                    'parent_id' => null,
                    'wbs_code' => $t['wbs_code'],
                    'name' => $t['name'],
                    'category' => 'Execution',
                    'start_date' => $taskStart->toDateString(),
                    'end_date' => $taskEnd->toDateString(),
                    'pct' => 0,
                    'status' => 'Not Started',
                    'priority' => ucfirst(strtolower($t['priority'] ?? 'Medium')),
                    'order_index' => $t['order_index'],
                    'description' => $t['description'],
                    'primary_owner_id' => $user->id,
                ]);

                $taskMap[$t['wbs_code']] = $taskId;
            }

            // Link parent tasks
            foreach ($validatedTasks as $t) {
                if ($t['parent_wbs'] && isset($taskMap[$t['parent_wbs']]) && isset($taskMap[$t['wbs_code']])) {
                    Task::withoutGlobalScopes()
                        ->where('id', $taskMap[$t['wbs_code']])
                        ->update(['parent_id' => $taskMap[$t['parent_wbs']]]);
                }
            }

            // Link dependencies
            foreach ($validatedDependencies as $dep) {
                if (isset($taskMap[$dep['predecessor_wbs']]) && isset($taskMap[$dep['successor_wbs']])) {
                    TaskDependency::withoutGlobalScopes()->create([
                        'id' => (string) Str::ulid(),
                        'task_id' => $taskMap[$dep['successor_wbs']],
                        'predecessor_id' => $taskMap[$dep['predecessor_wbs']],
                        'dependency_type' => 'finish_to_start',
                        'lag_days' => 0,
                    ]);
                }
            }

            return [
                'dry_run' => false,
                'message' => 'Tasks imported successfully.',
                'summary' => [
                    'tasks_count' => count($validatedTasks),
                    'dependencies_count' => count($validatedDependencies),
                ],
            ];
        });
    }

    protected function parseFile(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $content = file_get_contents($file->getRealPath());

        if ($extension === 'json' || str_starts_with(trim($content), '[') || str_starts_with(trim($content), '{')) {
            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                return isset($decoded['tasks']) ? $decoded['tasks'] : $decoded;
            }
            throw new HttpException(422, 'Invalid JSON format in uploaded file.');
        }

        // CSV Parser
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
        $rows = [];
        $header = null;

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (!$trimmed) {
                continue;
            }
            $cols = str_getcsv($trimmed);
            if (!$header) {
                $header = array_map(fn($col) => strtolower(trim(str_replace([' ', '-'], '_', $col))), $cols);
            } else {
                $row = [];
                foreach ($header as $i => $colName) {
                    $row[$colName] = $cols[$i] ?? null;
                }
                $rows[] = $row;
            }
        }

        return $rows;
    }
}

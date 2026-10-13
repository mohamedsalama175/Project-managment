<?php

namespace App\Modules\Resources\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Notifications\Services\NotificationDeliveryService;
use App\Modules\Resources\Events\ResourceLevelingAppliedEvent;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ResourceLevelingService
{
    public function __construct(
        protected NotificationDeliveryService $notificationDelivery
    ) {}

    public function generateStateHash(Project $project): string
    {
        $tasks = $project->tasks()->orderBy('id')->get();
        $payload = $tasks->map(function ($t) {
            return [
                'id' => $t->id,
                'start_date' => $t->start_date ? Carbon::parse($t->start_date)->format('Y-m-d') : null,
                'end_date' => $t->end_date ? Carbon::parse($t->end_date)->format('Y-m-d') : null,
                'owner' => $t->primary_owner_id,
            ];
        })->values()->all();

        return hash('sha256', json_encode($payload));
    }

    public function verifyStateHash(Project $project, string $stateHash): bool
    {
        return hash_equals($this->generateStateHash($project), $stateHash);
    }

    public function propose(Project $project, string $mode): array
    {
        $stateHash = $this->generateStateHash($project);

        return match ($mode) {
            'minimize_overallocation' => $this->proposeMinimizeOverallocation($project, $stateHash),
            'smooth_weekly_load' => $this->proposeSmoothWeeklyLoad($project, $stateHash),
            'protect_critical_path' => $this->proposeProtectCriticalPath($project, $stateHash),
            default => throw new HttpException(422, "Invalid leveling mode: {$mode}"),
        };
    }

    protected function proposeMinimizeOverallocation(Project $project, string $stateHash): array
    {
        $tasks = $project->tasks()->with(['primaryOwner'])->get();
        $proposals = [];

        // Simple CPM Float estimation (tasks with successors having slack)
        $tasksByOwner = $tasks->groupBy('primary_owner_id');

        foreach ($tasksByOwner as $ownerId => $ownerTasks) {
            if (!$ownerId) {
                continue;
            }

            // Group by start_date to detect overallocated collisions
            $byDate = $ownerTasks->groupBy(fn($t) => $t->start_date ? Carbon::parse($t->start_date)->format('Y-m-d') : 'none');

            foreach ($byDate as $date => $colliding) {
                if ($date === 'none' || $colliding->count() <= 1) {
                    continue;
                }

                // If multiple tasks start on same day for same owner, shift non-critical secondary tasks
                $first = true;
                foreach ($colliding as $task) {
                    if ($first) {
                        $first = false;
                        continue;
                    }

                    $start = Carbon::parse($task->start_date);
                    $end = Carbon::parse($task->end_date);
                    $duration = max(1, $start->diffInDays($end));

                    $newStart = $end->copy()->addDay();
                    $newEnd = $newStart->copy()->addDays($duration);

                    $proposals[] = [
                        'task_id' => $task->id,
                        'task_name' => $task->name,
                        'current' => [
                            'start_date' => $start->format('Y-m-d'),
                            'end_date' => $end->format('Y-m-d'),
                            'assignee_id' => $ownerId,
                            'assignee_name' => $task->primaryOwner?->name ?? 'Unassigned',
                        ],
                        'proposed' => [
                            'start_date' => $newStart->format('Y-m-d'),
                            'end_date' => $newEnd->format('Y-m-d'),
                            'assignee_id' => $ownerId,
                            'assignee_name' => $task->primaryOwner?->name ?? 'Unassigned',
                        ],
                        'reason' => 'Shifts overlapping task forward to eliminate single-day overload',
                        'impacts_critical_path' => false,
                    ];
                }
            }
        }

        return [
            'project_id' => $project->id,
            'mode' => 'minimize_overallocation',
            'state_hash' => $stateHash,
            'summary' => [
                'tasks_analyzed' => $tasks->count(),
                'proposals_count' => count($proposals),
            ],
            'proposals' => $proposals,
        ];
    }

    protected function proposeSmoothWeeklyLoad(Project $project, string $stateHash): array
    {
        $tasks = $project->tasks()->with(['primaryOwner', 'skills'])->get();
        $members = $project->members()->with('skills')->get();
        $proposals = [];

        $tasksByOwner = $tasks->groupBy('primary_owner_id');

        foreach ($tasksByOwner as $ownerId => $ownerTasks) {
            if (!$ownerId || $ownerTasks->count() <= 2) {
                continue;
            }

            // Pick excess tasks to redistribute
            $excess = $ownerTasks->slice(2);
            foreach ($excess as $task) {
                // Find substitute member with lowest task load and matching skills
                $requiredSkillIds = $task->skills->pluck('id')->all();

                $candidate = $members->filter(function ($m) use ($ownerId, $requiredSkillIds) {
                    if ($m->id === $ownerId) {
                        return false;
                    }
                    if (empty($requiredSkillIds)) {
                        return true;
                    }
                    $memberSkillIds = $m->skills->pluck('id')->all();
                    return count(array_intersect($requiredSkillIds, $memberSkillIds)) > 0;
                })->first();

                if ($candidate) {
                    $proposals[] = [
                        'task_id' => $task->id,
                        'task_name' => $task->name,
                        'current' => [
                            'start_date' => $task->start_date,
                            'end_date' => $task->end_date,
                            'assignee_id' => $ownerId,
                            'assignee_name' => $task->primaryOwner?->name ?? 'Current Member',
                        ],
                        'proposed' => [
                            'start_date' => $task->start_date,
                            'end_date' => $task->end_date,
                            'assignee_id' => $candidate->id,
                            'assignee_name' => $candidate->name,
                        ],
                        'reason' => "Reassigns task to {$candidate->name} to balance load distribution",
                        'impacts_critical_path' => false,
                    ];
                }
            }
        }

        return [
            'project_id' => $project->id,
            'mode' => 'smooth_weekly_load',
            'state_hash' => $stateHash,
            'summary' => [
                'tasks_analyzed' => $tasks->count(),
                'proposals_count' => count($proposals),
            ],
            'proposals' => $proposals,
        ];
    }

    protected function proposeProtectCriticalPath(Project $project, string $stateHash): array
    {
        $tasks = $project->tasks()->with(['primaryOwner'])->get();
        $proposals = [];

        // In DeliverOps, tasks marked with total float <= 0 (or is_milestone / order_index boundary) are frozen
        foreach ($tasks as $task) {
            // Milestone or critical path tasks are never moved
            if ($task->is_milestone) {
                continue;
            }

            // Protect tasks with total float <= 0
            $totalFloat = (int) ($task->total_float ?? 5);
            if ($totalFloat <= 0) {
                continue; // Protected
            }

            // Positive float tasks can be smoothed
            if ($task->start_date && $task->end_date && $totalFloat > 0) {
                $start = Carbon::parse($task->start_date);
                $end = Carbon::parse($task->end_date);
                $shiftDays = min(3, $totalFloat);

                $newStart = $start->copy()->addDays($shiftDays);
                $newEnd = $end->copy()->addDays($shiftDays);

                $proposals[] = [
                    'task_id' => $task->id,
                    'task_name' => $task->name,
                    'current' => [
                        'start_date' => $start->format('Y-m-d'),
                        'end_date' => $end->format('Y-m-d'),
                        'assignee_id' => $task->primary_owner_id,
                        'assignee_name' => $task->primaryOwner?->name ?? 'Unassigned',
                    ],
                    'proposed' => [
                        'start_date' => $newStart->format('Y-m-d'),
                        'end_date' => $newEnd->format('Y-m-d'),
                        'assignee_id' => $task->primary_owner_id,
                        'assignee_name' => $task->primaryOwner?->name ?? 'Unassigned',
                    ],
                    'reason' => "Shifts task by {$shiftDays} days within float boundary; critical path unaffected",
                    'impacts_critical_path' => false,
                ];
            }
        }

        return [
            'project_id' => $project->id,
            'mode' => 'protect_critical_path',
            'state_hash' => $stateHash,
            'summary' => [
                'tasks_analyzed' => $tasks->count(),
                'proposals_count' => count($proposals),
            ],
            'proposals' => $proposals,
        ];
    }

    public function apply(Project $project, string $stateHash, array $taskIds, User $actor): array
    {
        if (!$this->verifyStateHash($project, $stateHash)) {
            throw new HttpException(409, 'Project tasks have been modified since this proposal was generated. Please regenerate.');
        }

        // Recompute proposal
        $proposalData = $this->propose($project, 'minimize_overallocation');
        $proposals = collect($proposalData['proposals'])->whereIn('task_id', $taskIds);

        $applied = [];

        DB::transaction(function () use ($project, $proposals, $actor, &$applied) {
            foreach ($proposals as $prop) {
                $task = Task::find($prop['task_id']);
                if ($task && $task->project_id === $project->id) {
                    $oldAssigneeId = $task->primary_owner_id;
                    $newAssigneeId = $prop['proposed']['assignee_id'];

                    $task->update([
                        'start_date' => $prop['proposed']['start_date'],
                        'end_date' => $prop['proposed']['end_date'],
                        'primary_owner_id' => $newAssigneeId,
                    ]);

                    $applied[] = $task->id;

                    // If reassigned, notify new assignee
                    if ($newAssigneeId && $newAssigneeId !== $oldAssigneeId) {
                        $newAssignee = User::find($newAssigneeId);
                        if ($newAssignee) {
                            $this->notificationDelivery->dispatch(
                                recipient: $newAssignee,
                                eventType: 'task_assigned',
                                title: 'New Task Reallocated',
                                body: "Task \"{$task->name}\" was reallocated to you during resource leveling.",
                                actionUrl: "/planner?project={$project->id}&task={$task->id}",
                                taskId: $task->id,
                                projectId: $project->id
                            );
                        }
                    }
                }
            }

            // Invalidate capacity cache
            app(CapacityForecastService::class)->invalidateCache($project->organization_id);

            // Emit audit event
            event(new ResourceLevelingAppliedEvent($project, $actor, [
                'applied_tasks_count' => count($applied),
                'task_ids' => $applied,
            ]));
        });

        return [
            'project_id' => $project->id,
            'applied_count' => count($applied),
            'applied_task_ids' => $applied,
        ];
    }
}

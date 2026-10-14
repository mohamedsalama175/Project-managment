<?php

namespace App\Modules\Resources\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Resources\Events\TimeEntryTransitionedEvent;
use App\Modules\Resources\Models\TimeEntry;
use App\Modules\Resources\Models\TimeOffRequest;
use App\Modules\Resources\Services\TimesheetService;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TimeEntryController extends Controller
{
    public function __construct(
        protected TimesheetService $timesheetService
    ) {}

    public function store(Request $request, string $taskId): JsonResponse
    {
        $user = $request->user();
        $tenantId = app(TenantManager::class)->getTenantId() ?? $user->default_organization_id;

        $existingTask = Task::withoutGlobalScopes()->with('project')->find($taskId);

        if ($existingTask) {
            if ($existingTask->organization_id !== $tenantId) {
                return response()->json([
                    'message' => 'Task not found or not accessible.',
                    'code' => 'TASK_NOT_FOUND',
                ], 404);
            }
            $task = $existingTask;
        } else {
            $task = null;
            // Only auto-provision if explicit task or project metadata is provided by the client
            if ($request->has('task_name') || $request->has('project_id') || $request->has('projectId')) {
                $projectId = $request->input('project_id') ?? $request->input('projectId');
                $project = null;

                if ($projectId) {
                    $project = Project::withoutGlobalScopes()
                        ->where('organization_id', $tenantId)
                        ->find($projectId);

                    if (!$project) {
                        $projectName = $request->input('project_name', 'Active Delivery Project');
                        $code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $projectName), 0, 8)) ?: 'PROJ';
                        $project = Project::withoutGlobalScopes()->create([
                            'id' => $projectId,
                            'organization_id' => $tenantId,
                            'name' => $projectName,
                            'code' => $code,
                            'project_manager_id' => $user->id,
                            'is_archived' => false,
                        ]);
                    }
                } else {
                    $project = Project::withoutGlobalScopes()
                        ->where('organization_id', $tenantId)
                        ->where('is_archived', false)
                        ->first();
                }

                if ($project) {
                    $taskName = $request->input('task_name') ?? $request->input('name') ?? "Task {$taskId}";
                    $task = Task::withoutGlobalScopes()->create([
                        'id' => $taskId,
                        'organization_id' => $tenantId,
                        'project_id' => $project->id,
                        'name' => $taskName,
                        'start_date' => $request->input('date', now()->format('Y-m-d')),
                        'end_date' => $request->input('date', now()->format('Y-m-d')),
                        'estimated_hours' => (float) ($request->input('estimated_hours') ?? $request->input('hours', 8.0)),
                        'primary_owner_id' => $user->id,
                        'status' => 'In Progress',
                    ]);
                }
            }
        }

        if (!$task) {
            return response()->json([
                'message' => 'Task not found or not accessible.',
                'code' => 'TASK_NOT_FOUND',
            ], 404);
        }

        if ($task->project && $task->project->is_archived) {
            return response()->json([
                'message' => 'Cannot log time on an archived project.',
                'code' => 'PROJECT_ARCHIVED',
                'error_code' => 'PROJECT_ARCHIVED',
            ], 422);
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'hours' => ['required', 'numeric', 'min:0.25', 'max:24.00'],
            'description' => ['nullable', 'string', 'max:2000'],
            'billable' => ['nullable', 'boolean'],
        ]);

        $roundedHours = $this->timesheetService->roundHours((float) $validated['hours']);

        // Default billable to 0 unless task or request marks billable
        $isBillable = $validated['billable'] ?? (bool) ($task->billable ?? false);

        $entry = TimeEntry::create([
            'organization_id' => $tenantId,
            'project_id' => $task->project_id,
            'task_id' => $task->id,
            'user_id' => $user->id,
            'date' => $validated['date'],
            'hours' => $roundedHours,
            'description' => $validated['description'] ?? null,
            'billable' => $isBillable,
        ]);

        event(new TimeEntryTransitionedEvent($entry, 'time_entry_created', $user));

        // Check for time-off overlap warning
        $warnings = $this->checkTimeOffOverlap($entry);

        return response()->json([
            'data' => $entry->load(['task', 'project']),
            'warnings' => $warnings,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $entry = TimeEntry::findOrFail($id);
        Gate::authorize('update', $entry);

        if ($entry->approved_at !== null) {
            throw new HttpException(422, 'Approved time entries are immutable. Submit an adjustment entry to correct discrepancies.');
        }

        $validated = $request->validate([
            'date' => ['sometimes', 'date'],
            'hours' => ['sometimes', 'numeric', 'min:0.25', 'max:24.00'],
            'description' => ['nullable', 'string', 'max:2000'],
            'billable' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['hours'])) {
            $validated['hours'] = $this->timesheetService->roundHours((float) $validated['hours']);
        }

        $entry->update($validated);

        event(new TimeEntryTransitionedEvent($entry, 'time_entry_updated', $request->user()));

        return response()->json([
            'data' => $entry->load(['task', 'project']),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $entry = TimeEntry::findOrFail($id);
        Gate::authorize('delete', $entry);

        if ($entry->approved_at !== null) {
            throw new HttpException(422, 'Approved time entries are immutable and cannot be deleted.');
        }

        $entry->delete();

        return response()->json(null, 204);
    }

    public function timesheet(Request $request, string $userId): JsonResponse
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        $user = User::whereHas('organizations', function ($q) use ($tenantId) {
            $q->where('organizations.id', $tenantId);
        })->findOrFail($userId);

        $request->validate([
            'week' => ['required', 'string', 'regex:/^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/'],
        ]);

        $weekStr = $request->query('week');
        // Parse ISO week e.g. 2026-W42
        $startOfWeek = Carbon::now()->setISODate(
            (int) substr($weekStr, 0, 4),
            (int) substr($weekStr, 6, 2)
        )->startOfWeek(Carbon::MONDAY);
        $endOfWeek = $startOfWeek->copy()->endOfWeek(Carbon::SUNDAY);

        $entries = TimeEntry::where('organization_id', $tenantId)
            ->where('user_id', $user->id)
            ->whereDate('date', '>=', $startOfWeek->format('Y-m-d'))
            ->whereDate('date', '<=', $endOfWeek->format('Y-m-d'))
            ->with(['task.project', 'project'])
            ->get();

        // Build 7-day grid map
        $days = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $startOfWeek->copy()->addDays($i);
            $days[$day->format('Y-m-d')] = [
                'day_name' => $day->format('D'),
                'date' => $day->format('Y-m-d'),
                'is_weekend' => in_array($day->dayOfWeek, [0, 6], true),
            ];
        }

        // Group by task
        $groupedByTask = $entries->groupBy('task_id');
        $taskRows = [];
        $weeklyTotalHours = 0.0;
        $weeklyBillableHours = 0.0;

        foreach ($groupedByTask as $taskId => $taskEntries) {
            $task = $taskEntries->first()->task;
            $project = $taskEntries->first()->project ?? $task?->project;
            $rowDaily = [];
            $rowTotal = 0.0;

            foreach ($days as $dateStr => $dayMeta) {
                $dayEntry = $taskEntries->firstWhere(fn($e) => Carbon::parse($e->date)->format('Y-m-d') === $dateStr);
                $hours = $dayEntry ? (float) $dayEntry->hours : 0.0;
                $rowDaily[$dateStr] = [
                    'entry_id' => $dayEntry?->id,
                    'hours' => $hours,
                    'billable' => $dayEntry ? (bool) $dayEntry->billable : false,
                    'status' => $dayEntry?->status ?? 'none',
                    'rejection_reason' => $dayEntry?->rejection_reason,
                ];
                $rowTotal += $hours;
                if ($dayEntry && $dayEntry->billable) {
                    $weeklyBillableHours += $hours;
                }
            }

            $weeklyTotalHours += $rowTotal;

            $taskRows[] = [
                'task_id' => $taskId,
                'task_name' => $task?->name ?? 'Deleted Task',
                'project_id' => $project?->id,
                'project_name' => $project?->name,
                'project_code' => $project?->code,
                'days' => $rowDaily,
                'total_hours' => round($rowTotal, 2),
            ];
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'weekly_capacity_hours' => (float) ($user->weekly_capacity_hours ?? 40.0),
            ],
            'week' => $weekStr,
            'start_date' => $startOfWeek->format('Y-m-d'),
            'end_date' => $endOfWeek->format('Y-m-d'),
            'days_meta' => array_values($days),
            'summary' => [
                'total_hours' => round($weeklyTotalHours, 2),
                'billable_hours' => round($weeklyBillableHours, 2),
                'non_billable_hours' => round($weeklyTotalHours - $weeklyBillableHours, 2),
            ],
            'tasks' => $taskRows,
        ]);
    }

    public function submit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entry_ids' => ['required', 'array'],
            'entry_ids.*' => ['required', 'string'],
        ]);

        $result = $this->timesheetService->submit($validated['entry_ids'], $request->user());

        return response()->json($result);
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $entry = TimeEntry::findOrFail($id);
        $this->authorize('approve', $entry);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $rejected = $this->timesheetService->reject($entry, $request->user(), $validated['reason']);

        return response()->json([
            'data' => $rejected,
        ]);
    }

    public function bulkApprove(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entry_ids' => ['required', 'array'],
            'entry_ids.*' => ['required', 'string'],
        ]);

        $result = $this->timesheetService->bulkApprove($validated['entry_ids'], $request->user());

        return response()->json($result);
    }

    public function bulkReject(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entry_ids' => ['required', 'array'],
            'entry_ids.*' => ['required', 'string'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $result = $this->timesheetService->bulkReject(
            $validated['entry_ids'],
            $request->user(),
            $validated['reason']
        );

        return response()->json($result);
    }

    public function reportsBillability(Request $request): JsonResponse
    {
        $tenantId = app(TenantManager::class)->getTenantId();

        $from = $request->query('from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $to = $request->query('to', Carbon::now()->endOfMonth()->format('Y-m-d'));
        $projectId = $request->query('project_id');

        $query = TimeEntry::withoutGlobalScopes()
            ->where('organization_id', $tenantId)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->with(['user', 'project']);

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        $entries = $query->get();

        // Project rates map
        $projectMembers = \App\Models\ProjectUser::withoutGlobalScopes()
            ->where('organization_id', $tenantId)
            ->get();

        $ratesMap = [];
        foreach ($projectMembers as $pm) {
            $ratesMap["{$pm->project_id}:{$pm->user_id}"] = (float) $pm->billable_rate;
        }

        $totalHours = 0.0;
        $billableHours = 0.0;
        $totalCost = 0.0;

        $userBreakdown = [];
        $projectBreakdown = [];

        foreach ($entries as $e) {
            $h = (float) $e->hours;
            $rate = $ratesMap["{$e->project_id}:{$e->user_id}"] ?? 0.0;
            $cost = $e->billable ? ($h * $rate) : 0.0;

            $totalHours += $h;
            if ($e->billable) {
                $billableHours += $h;
                $totalCost += $cost;
            }

            // Per User
            $uid = $e->user_id;
            if (!isset($userBreakdown[$uid])) {
                $userBreakdown[$uid] = [
                    'user_id' => $uid,
                    'user_name' => $e->user?->name,
                    'total_hours' => 0.0,
                    'billable_hours' => 0.0,
                    'total_cost' => 0.0,
                ];
            }
            $userBreakdown[$uid]['total_hours'] += $h;
            if ($e->billable) {
                $userBreakdown[$uid]['billable_hours'] += $h;
                $userBreakdown[$uid]['total_cost'] += $cost;
            }

            // Per Project
            $pid = $e->project_id;
            if (!isset($projectBreakdown[$pid])) {
                $projectBreakdown[$pid] = [
                    'project_id' => $pid,
                    'project_name' => $e->project?->name,
                    'total_hours' => 0.0,
                    'billable_hours' => 0.0,
                    'total_cost' => 0.0,
                ];
            }
            $projectBreakdown[$pid]['total_hours'] += $h;
            if ($e->billable) {
                $projectBreakdown[$pid]['billable_hours'] += $h;
                $projectBreakdown[$pid]['total_cost'] += $cost;
            }
        }

        $billablePercent = $totalHours > 0 ? round(($billableHours / $totalHours) * 100, 1) : 0.0;

        return response()->json([
            'range' => ['from' => $from, 'to' => $to],
            'summary' => [
                'total_hours' => round($totalHours, 2),
                'billable_hours' => round($billableHours, 2),
                'non_billable_hours' => round($totalHours - $billableHours, 2),
                'billable_percent' => $billablePercent,
                'total_cost' => round($totalCost, 2),
            ],
            'by_user' => array_values($userBreakdown),
            'by_project' => array_values($projectBreakdown),
        ]);
    }

    protected function checkTimeOffOverlap(TimeEntry $entry): array
    {
        $hasApprovedLeave = TimeOffRequest::withoutGlobalScopes()
            ->where('organization_id', $entry->organization_id)
            ->where('user_id', $entry->user_id)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $entry->date)
            ->whereDate('end_date', '>=', $entry->date)
            ->exists();

        if (!$hasApprovedLeave) {
            return [];
        }

        return [
            [
                'code' => 'TIME_OFF_OVERLAPS_TIMESHEET',
                'message' => "Time entry logged on date {$entry->date->format('Y-m-d')} which has approved time-off scheduled.",
                'colliding_dates' => [$entry->date->format('Y-m-d')],
                'total_logged_hours' => (float) $entry->hours,
            ],
        ];
    }
}

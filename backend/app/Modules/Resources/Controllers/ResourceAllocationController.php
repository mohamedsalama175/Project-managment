<?php

namespace App\Modules\Resources\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResourceAllocationController extends Controller
{
    public function userAllocations(Request $request, string $userId): JsonResponse
    {
        $tenantId = app(TenantManager::class)->getTenantId();

        $user = User::whereHas('organizations', function ($q) use ($tenantId) {
            $q->where('organizations.id', $tenantId);
        })->findOrFail($userId);

        $from = $request->query('from', Carbon::now()->startOfWeek()->format('Y-m-d'));
        $to = $request->query('to', Carbon::now()->addWeeks(8)->endOfWeek()->format('Y-m-d'));

        $tasks = Task::withoutGlobalScopes()
            ->where('organization_id', $tenantId)
            ->where('primary_owner_id', $user->id)
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->whereDate('start_date', '<=', $to)
            ->whereDate('end_date', '>=', $from)
            ->with(['project'])
            ->orderBy('start_date')
            ->get();

        // Get user's billable rates per project
        $projectMembers = \App\Models\ProjectUser::withoutGlobalScopes()
            ->where('organization_id', $tenantId)
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('project_id');

        $allocations = $tasks->map(function ($task) use ($from, $to, $projectMembers) {
            $start = Carbon::parse($task->start_date);
            $end = Carbon::parse($task->end_date);

            // Clip boundaries to window
            $clippedStart = $start->isBefore($from) ? $from : $start->format('Y-m-d');
            $clippedEnd = $end->isAfter($to) ? $to : $end->format('Y-m-d');

            $pivot = $projectMembers->get($task->project_id);

            return [
                'task_id' => $task->id,
                'task_name' => $task->name,
                'status' => $task->status,
                'project_id' => $task->project_id,
                'project_name' => $task->project?->name,
                'project_code' => $task->project?->code,
                'original_start_date' => $start->format('Y-m-d'),
                'original_end_date' => $end->format('Y-m-d'),
                'clipped_start_date' => $clippedStart,
                'clipped_end_date' => $clippedEnd,
                'duration_days' => max(1, $start->diffInDays($end) + 1),
                'estimated_hours' => (float) ($task->estimated_hours ?? 0.0),
                'billable_rate' => (float) ($pivot?->billable_rate ?? 0.00),
                'billable_currency' => $pivot?->billable_currency ?? 'USD',
            ];
        });

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'weekly_capacity_hours' => (float) ($user->weekly_capacity_hours ?? 40.0),
            ],
            'window' => [
                'from' => $from,
                'to' => $to,
            ],
            'allocations_count' => $allocations->count(),
            'allocations' => $allocations,
        ]);
    }
}

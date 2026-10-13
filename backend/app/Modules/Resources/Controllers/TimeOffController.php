<?php

namespace App\Modules\Resources\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Notifications\Services\NotificationDeliveryService;
use App\Modules\Resources\Events\TimeOffStatusChangedEvent;
use App\Modules\Resources\Models\TimeEntry;
use App\Modules\Resources\Models\TimeOffRequest;
use App\Modules\Resources\Services\CapacityForecastService;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TimeOffController extends Controller
{
    public function __construct(
        protected NotificationDeliveryService $notificationDelivery,
        protected CapacityForecastService $capacityService
    ) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', TimeOffRequest::class);

        $query = TimeOffRequest::query();

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->filled('from')) {
            $query->whereDate('end_date', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('start_date', '<=', $request->query('to'));
        }

        $requests = $query->with(['user', 'approver'])
            ->orderBy('start_date', 'desc')
            ->paginate($request->integer('per_page', 25));

        return response()->json([
            'data' => $requests->items(),
            'meta' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'total' => $requests->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', TimeOffRequest::class);

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:vacation,sick,personal,holiday'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'hours_off' => ['nullable', 'numeric', 'min:0.25', 'max:24.00'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $user = $request->user();
        $tenantId = app(TenantManager::class)->getTenantId() ?? $user->default_organization_id;

        // Prevent overlapping active requests
        $hasOverlap = TimeOffRequest::where('user_id', $user->id)
            ->where('status', '!=', 'rejected')
            ->whereDate('start_date', '<=', $validated['end_date'])
            ->whereDate('end_date', '>=', $validated['start_date'])
            ->exists();

        if ($hasOverlap) {
            throw new HttpException(422, 'A time-off request already exists covering this date range.');
        }

        $timeOff = TimeOffRequest::create([
            'organization_id' => $tenantId,
            'user_id' => $user->id,
            'type' => $validated['type'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'hours_off' => $validated['hours_off'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);

        // Check for timesheet collision warning
        $warnings = $this->checkTimesheetOverlap($timeOff);

        return response()->json([
            'data' => $timeOff->load('user'),
            'warnings' => $warnings,
        ], 201);
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $timeOff = TimeOffRequest::findOrFail($id);
        Gate::authorize('approve', $timeOff);

        if ($timeOff->status === 'approved') {
            return response()->json(['data' => $timeOff]);
        }

        $approver = $request->user();

        $timeOff->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by_id' => $approver->id,
            'approved_by_ulid_snapshot' => $approver->id,
            'approved_by_name' => $approver->name,
        ]);

        $this->capacityService->invalidateCache($timeOff->organization_id);

        event(new TimeOffStatusChangedEvent($timeOff, 'approved', $approver));

        // Notify requesting employee
        if ($timeOff->user) {
            $this->notificationDelivery->dispatch(
                recipient: $timeOff->user,
                eventType: 'time_off_approved',
                title: 'Time-Off Approved',
                body: "Your {$timeOff->type} request for {$timeOff->start_date->format('M j')} - {$timeOff->end_date->format('M j, Y')} was approved.",
                actionUrl: '/people?tab=time-off'
            );
        }

        $warnings = $this->checkTimesheetOverlap($timeOff);

        return response()->json([
            'data' => $timeOff->load(['user', 'approver']),
            'warnings' => $warnings,
        ]);
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $timeOff = TimeOffRequest::findOrFail($id);
        Gate::authorize('reject', $timeOff);

        $approver = $request->user();

        $timeOff->update([
            'status' => 'rejected',
        ]);

        $this->capacityService->invalidateCache($timeOff->organization_id);

        event(new TimeOffStatusChangedEvent($timeOff, 'rejected', $approver));

        if ($timeOff->user) {
            $this->notificationDelivery->dispatch(
                recipient: $timeOff->user,
                eventType: 'time_off_rejected',
                title: 'Time-Off Rejected',
                body: "Your {$timeOff->type} request for {$timeOff->start_date->format('M j')} - {$timeOff->end_date->format('M j, Y')} was rejected.",
                actionUrl: '/people?tab=time-off'
            );
        }

        return response()->json([
            'data' => $timeOff->load(['user', 'approver']),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $timeOff = TimeOffRequest::findOrFail($id);
        Gate::authorize('delete', $timeOff);

        $timeOff->delete();
        $this->capacityService->invalidateCache($timeOff->organization_id);

        return response()->json(null, 204);
    }

    protected function checkTimesheetOverlap(TimeOffRequest $timeOff): array
    {
        $collidingEntries = TimeEntry::withoutGlobalScopes()
            ->where('organization_id', $timeOff->organization_id)
            ->where('user_id', $timeOff->user_id)
            ->whereDate('date', '>=', $timeOff->start_date)
            ->whereDate('date', '<=', $timeOff->end_date)
            ->get();

        if ($collidingEntries->isEmpty()) {
            return [];
        }

        $totalHours = (float) $collidingEntries->sum('hours');
        $dates = $collidingEntries->pluck('date')->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))->unique()->values()->all();

        return [
            [
                'code' => 'TIME_OFF_OVERLAPS_TIMESHEET',
                'message' => "Time-off covers dates with {$collidingEntries->count()} logged time entries (total {$totalHours}h).",
                'colliding_dates' => $dates,
                'total_logged_hours' => $totalHours,
            ],
        ];
    }
}

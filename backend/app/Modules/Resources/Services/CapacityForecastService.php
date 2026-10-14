<?php

namespace App\Modules\Resources\Services;

use App\Models\Task;
use App\Models\User;
use App\Modules\Resources\Models\TimeOffRequest;
use App\Modules\Tenancy\Models\Organization;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Cache;

class CapacityForecastService
{
    public function getForecast(string $orgId, int $weeks = 8): array
    {
        $version = Cache::rememberForever("org:{$orgId}:capacity_v", fn() => (string) now()->timestamp);
        $cacheKey = "capacity_forecast:{$orgId}:v{$version}:weeks_{$weeks}";

        return Cache::remember($cacheKey, 3600, function () use ($orgId, $weeks) {
            return $this->calculateForecast($orgId, $weeks);
        });
    }

    public function invalidateCache(string $orgId): void
    {
        $current = (int) Cache::get("org:{$orgId}:capacity_v", now()->timestamp);
        $next = max((int) now()->timestamp, $current + 1);
        Cache::forever("org:{$orgId}:capacity_v", (string) $next);
    }

    public function calculateForecast(string $orgId, int $weeks = 8): array
    {
        $weeks = min(52, max(1, $weeks));
        $org = Organization::find($orgId);
        $weekendDays = $org?->config['weekendDays'] ?? [0, 6]; // Default Sun(0) & Sat(6)
        $workingDaysPerWeek = max(1, 7 - count($weekendDays));

        // Start from current week Monday
        $startOfWeek = Carbon::now()->startOfWeek(Carbon::MONDAY);
        $weekWindows = [];

        for ($w = 0; $w < $weeks; $w++) {
            $currentStart = $startOfWeek->copy()->addWeeks($w);
            $currentEnd = $currentStart->copy()->endOfWeek(Carbon::SUNDAY);
            $isoWeek = $currentStart->format('o-\WW'); // e.g. 2026-W42

            $weekWindows[] = [
                'iso_week' => $isoWeek,
                'start_date' => $currentStart->format('Y-m-d'),
                'end_date' => $currentEnd->format('Y-m-d'),
                'start_carbon' => $currentStart,
                'end_carbon' => $currentEnd,
            ];
        }

        $forecastStart = $weekWindows[0]['start_date'];
        $forecastEnd = end($weekWindows)['end_date'];

        // Get tenant users
        $users = User::whereHas('organizations', function ($q) use ($orgId) {
            $q->where('organizations.id', $orgId);
        })->get();

        // Eager load approved time-off in window
        $timeOffRequests = TimeOffRequest::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $forecastEnd)
            ->whereDate('end_date', '>=', $forecastStart)
            ->get();

        // Eager load active tasks in window
        $tasks = Task::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->whereDate('start_date', '<=', $forecastEnd)
            ->whereDate('end_date', '>=', $forecastStart)
            ->get();

        $userData = [];

        foreach ($users as $user) {
            $baseCapacity = (float) ($user->weekly_capacity_hours ?? 40.0);
            $dailyCapacity = $baseCapacity / $workingDaysPerWeek;
            $userWeeks = [];

            // User's leaves
            $userLeaves = $timeOffRequests->where('user_id', $user->id);

            // User's tasks
            $userTasks = $tasks->filter(function ($task) use ($user) {
                return $task->primary_owner_id === $user->id;
            });

            foreach ($weekWindows as $wMeta) {
                $wStart = $wMeta['start_carbon'];
                $wEnd = $wMeta['end_carbon'];

                // 1. Calculate Time-off deductions
                $timeOffHours = 0.0;
                foreach ($userLeaves as $leave) {
                    $lStart = Carbon::parse($leave->start_date);
                    $lEnd = Carbon::parse($leave->end_date);

                    // Intersect with week
                    $overlapStart = $wStart->greaterThan($lStart) ? $wStart : $lStart;
                    $overlapEnd = $wEnd->lessThan($lEnd) ? $wEnd : $lEnd;

                    if ($overlapStart->lessThanOrEqualTo($overlapEnd)) {
                        if ($leave->hours_off !== null) {
                            $timeOffHours += (float) $leave->hours_off;
                        } else {
                            $period = CarbonPeriod::create($overlapStart, $overlapEnd);
                            foreach ($period as $date) {
                                if (!in_array($date->dayOfWeek, $weekendDays, true)) {
                                    $timeOffHours += $dailyCapacity;
                                }
                            }
                        }
                    }
                }

                $effectiveCapacity = max(0.0, round($baseCapacity - $timeOffHours, 2));

                // 2. Calculate Allocated task hours in this week
                $allocatedHours = 0.0;
                foreach ($userTasks as $task) {
                    $tStart = Carbon::parse($task->start_date);
                    $tEnd = Carbon::parse($task->end_date);

                    $overlapStart = $wStart->greaterThan($tStart) ? $wStart : $tStart;
                    $overlapEnd = $wEnd->lessThan($tEnd) ? $wEnd : $tEnd;

                    if ($overlapStart->lessThanOrEqualTo($overlapEnd)) {
                        // Count total working days of task
                        $taskTotalWorkingDays = 0;
                        foreach (CarbonPeriod::create($tStart, $tEnd) as $d) {
                            if (!in_array($d->dayOfWeek, $weekendDays, true)) {
                                $taskTotalWorkingDays++;
                            }
                        }
                        $taskTotalWorkingDays = max(1, $taskTotalWorkingDays);

                        // Count working days of task falling in this week
                        $weekTaskWorkingDays = 0;
                        foreach (CarbonPeriod::create($overlapStart, $overlapEnd) as $d) {
                            if (!in_array($d->dayOfWeek, $weekendDays, true)) {
                                $weekTaskWorkingDays++;
                            }
                        }

                        $taskTotalHours = (float) ($task->estimated_hours ?? ($taskTotalWorkingDays * $dailyCapacity));
                        $hoursInThisWeek = ($taskTotalHours / $taskTotalWorkingDays) * $weekTaskWorkingDays;
                        $allocatedHours += $hoursInThisWeek;
                    }
                }

                $allocatedHours = round($allocatedHours, 2);

                // 3. Zero-Branch & Status Calculation
                if ($effectiveCapacity <= 0.0) {
                    if ($allocatedHours > 0.0) {
                        $loadPercent = 999.0;
                        $status = 'over';
                    } else {
                        $loadPercent = 0.0;
                        $status = 'zero_capacity';
                    }
                } else {
                    $loadPercent = round(($allocatedHours / $effectiveCapacity) * 100, 1);
                    if ($loadPercent < 60.0) {
                        $status = 'under';
                    } elseif ($loadPercent <= 100.0) {
                        $status = 'balanced';
                    } else {
                        $status = 'over';
                    }
                }

                $userWeeks[] = [
                    'iso_week' => $wMeta['iso_week'],
                    'start_date' => $wMeta['start_date'],
                    'end_date' => $wMeta['end_date'],
                    'base_capacity_hours' => $baseCapacity,
                    'time_off_hours' => round($timeOffHours, 2),
                    'effective_capacity_hours' => $effectiveCapacity,
                    'allocated_hours' => $allocatedHours,
                    'load_percent' => $loadPercent,
                    'status' => $status,
                ];
            }

            $userData[] = [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'weekly_capacity_hours' => $baseCapacity,
                'weeks' => $userWeeks,
            ];
        }

        $totalBaseCapacity = 0.0;
        $totalEffectiveCapacity = 0.0;
        $totalAllocatedHours = 0.0;
        $overallocatedWeeksCount = 0;
        $zeroCapacityWeeksCount = 0;

        foreach ($userData as $u) {
            foreach ($u['weeks'] as $w) {
                $totalBaseCapacity += (float) ($w['base_capacity_hours'] ?? 0);
                $totalEffectiveCapacity += (float) ($w['effective_capacity_hours'] ?? 0);
                $totalAllocatedHours += (float) ($w['allocated_hours'] ?? 0);
                if (($w['status'] ?? '') === 'over' || ($w['load_percent'] ?? 0) > 100) {
                    $overallocatedWeeksCount++;
                }
                if (($w['effective_capacity_hours'] ?? 0) <= 0) {
                    $zeroCapacityWeeksCount++;
                }
            }
        }

        $averageLoad = $totalEffectiveCapacity > 0
            ? round(($totalAllocatedHours / $totalEffectiveCapacity) * 100, 1)
            : 0.0;

        return [
            'organization_id' => $orgId,
            'generated_at' => now()->toIso8601String(),
            'weeks' => $weeks,
            'weeks_count' => $weeks,
            'version' => (string) now()->timestamp,
            'range' => [
                'from' => $forecastStart,
                'to' => $forecastEnd,
            ],
            'summary' => [
                'total_base_capacity' => round($totalBaseCapacity, 2),
                'total_effective_capacity' => round($totalEffectiveCapacity, 2),
                'total_allocated_hours' => round($totalAllocatedHours, 2),
                'average_load_percent' => $averageLoad,
                'overallocated_weeks_count' => $overallocatedWeeksCount,
                'zero_capacity_weeks_count' => $zeroCapacityWeeksCount,
            ],
            'users' => $userData,
        ];
    }
}

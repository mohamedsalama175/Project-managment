<?php

use App\Modules\Resources\Controllers\CapacityController;
use App\Modules\Resources\Controllers\LevelingController;
use App\Modules\Resources\Controllers\ResourceAllocationController;
use App\Modules\Resources\Controllers\SkillController;
use App\Modules\Resources\Controllers\TimeEntryController;
use App\Modules\Resources\Controllers\TimeOffController;
use Illuminate\Support\Facades\Route;

Route::middleware(['api', 'auth:sanctum', 'email.verified', 'tenant'])
    ->prefix('api/v1')
    ->group(function () {
        // 1. Time-Off Calendar
        Route::get('time-off', [TimeOffController::class, 'index']);
        Route::post('time-off', [TimeOffController::class, 'store']);
        Route::put('time-off/{id}/approve', [TimeOffController::class, 'approve']);
        Route::put('time-off/{id}/reject', [TimeOffController::class, 'reject']);
        Route::delete('time-off/{id}', [TimeOffController::class, 'destroy']);

        // 2. Skills Matrix
        Route::get('skills', [SkillController::class, 'index']);
        Route::post('skills', [SkillController::class, 'store']);
        Route::get('skills/search', [SkillController::class, 'search']);
        Route::put('skills/{id}', [SkillController::class, 'update']);
        Route::delete('skills/{id}', [SkillController::class, 'destroy']);
        Route::put('users/{id}/skills', [SkillController::class, 'bulkAssign']);

        // 3. Cross-Project View
        Route::get('users/{id}/allocations', [ResourceAllocationController::class, 'userAllocations']);

        // 4. Capacity & Long-Range Forecast
        Route::get('organizations/current/capacity', [CapacityController::class, 'current']);
        Route::get('organizations/current/capacity/forecast', [CapacityController::class, 'forecast']);
        Route::get('organizations/current/capacity/hiring-recommendations', [CapacityController::class, 'hiringRecommendations']);

        // 5. Leveling Algorithms (Advisory)
        Route::post('projects/{id}/level-resources', [LevelingController::class, 'propose']);
        Route::post('projects/{id}/level-resources/apply', [LevelingController::class, 'apply']);

        // 6. Time Tracking & Timesheets
        Route::post('tasks/{taskId}/time-entries', [TimeEntryController::class, 'store']);
        Route::put('time-entries/{id}', [TimeEntryController::class, 'update']);
        Route::delete('time-entries/{id}', [TimeEntryController::class, 'destroy']);

        Route::get('users/{id}/timesheet', [TimeEntryController::class, 'timesheet']);
        Route::post('timesheets/submit', [TimeEntryController::class, 'submit']);
        Route::post('timesheets/{id}/reject', [TimeEntryController::class, 'reject']);
        Route::put('timesheets/bulk-approve', [TimeEntryController::class, 'bulkApprove']);
        Route::put('timesheets/bulk-reject', [TimeEntryController::class, 'bulkReject']);

        // 7. Billability Reporting
        Route::get('reports/billability', [TimeEntryController::class, 'reportsBillability']);
    });

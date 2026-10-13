<?php

use App\Modules\Automation\Controllers\AutomationRuleController;
use App\Modules\Automation\Controllers\AutomationRunController;
use App\Modules\Automation\Controllers\AutomationTemplateController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/automation')
    ->middleware(['auth:sanctum', 'tenant', 'email.verified'])
    ->group(function () {
        // Automation Rules
        Route::get('rules', [AutomationRuleController::class, 'index']);
        Route::post('rules', [AutomationRuleController::class, 'store']);
        Route::get('rules/{id}', [AutomationRuleController::class, 'show']);
        Route::put('rules/{id}', [AutomationRuleController::class, 'update']);
        Route::delete('rules/{id}', [AutomationRuleController::class, 'destroy']);
        Route::patch('rules/{id}/toggle', [AutomationRuleController::class, 'toggle']);

        // Automation Runs
        Route::get('runs', [AutomationRunController::class, 'index']);
        Route::get('runs/{id}', [AutomationRunController::class, 'show']);

        // Automation Templates
        Route::get('templates', [AutomationTemplateController::class, 'index']);
        Route::post('templates/{templateId}/instantiate', [AutomationTemplateController::class, 'instantiate']);
    });

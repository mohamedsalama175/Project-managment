<?php

use App\Modules\AI\Controllers\AiAssistantController;
use App\Modules\AI\Controllers\AiEstimationController;
use App\Modules\AI\Controllers\AiRiskPredictionController;
use App\Modules\AI\Controllers\AiSummarizationController;
use App\Modules\AI\Controllers\AiTaskParserController;
use App\Modules\AI\Controllers\AiUsageController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['auth:sanctum', 'tenant', 'email.verified'])
    ->group(function () {
        // AI Estimation & Task Parser
        Route::post('ai/estimate-task', [AiEstimationController::class, 'estimate']);
        Route::post('ai/parse-task', [AiTaskParserController::class, 'parse']);

        // AI Summarization
        Route::post('ai/summarize', [AiSummarizationController::class, 'summarize']);

        // AI Assistant & Rollback
        Route::post('ai/chat', [AiAssistantController::class, 'chat']);
        Route::post('ai/actions/{id}/rollback', [AiAssistantController::class, 'rollback']);

        // AI Usage & Settings
        Route::get('ai/usage', [AiUsageController::class, 'usage']);
        Route::put('ai/settings', [AiUsageController::class, 'updateSettings']);

        // Project-scoped AI routes
        Route::get('projects/{id}/ai/risk-score', [AiRiskPredictionController::class, 'riskScore']);
        Route::get('projects/{id}/ai/anomalies', [AiUsageController::class, 'anomalies']);
        Route::post('ai/anomalies/{id}/acknowledge', [AiUsageController::class, 'acknowledgeAnomaly']);

        // Multimodal AI Parsing
        Route::post('ai/parse-from-image', [\App\Modules\AI\Controllers\AiMultimodalController::class, 'parseFromImage']);
        Route::post('ai/parse-from-voice', [\App\Modules\AI\Controllers\AiMultimodalController::class, 'parseFromVoice']);
    });

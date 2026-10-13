<?php

namespace App\Modules\AI;

use App\Modules\AI\Events\AiBudgetThresholdExceeded;
use App\Modules\AI\Listeners\SendBudgetAlert;
use App\Modules\AI\Services\AiAssistantService;
use App\Modules\AI\Services\AiManagerService;
use App\Modules\AI\Services\AiRiskEngineService;
use App\Modules\AI\Services\AiSummarizationService;
use App\Modules\AI\Services\AiTaskEstimatorService;
use App\Modules\AI\Services\NaturalLanguageTaskParserService;
use App\Modules\AI\Services\PiiScrubberService;
use App\Modules\AI\Services\ProjectAnomalyDetectorService;
use App\Modules\AI\Services\Providers\MockAiProvider;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AIServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind MockAiProvider as singleton for deterministic testing
        $this->app->singleton(MockAiProvider::class, fn () => new MockAiProvider());

        // Domain & Management Services (AIProviderInterface is NOT bound here to prevent circular DI)
        $this->app->singleton(PiiScrubberService::class);
        $this->app->singleton(AiManagerService::class);
        $this->app->singleton(AiTaskEstimatorService::class);
        $this->app->singleton(AiRiskEngineService::class);
        $this->app->singleton(AiSummarizationService::class);
        $this->app->singleton(NaturalLanguageTaskParserService::class);
        $this->app->singleton(ProjectAnomalyDetectorService::class);
        $this->app->singleton(AiAssistantService::class);
    }

    public function boot(): void
    {
        // Register Event Listeners
        Event::listen(AiBudgetThresholdExceeded::class, SendBudgetAlert::class);

        // Load Module Routes
        if (file_exists(__DIR__ . '/routes.php')) {
            $this->loadRoutesFrom(__DIR__ . '/routes.php');
        }
    }
}

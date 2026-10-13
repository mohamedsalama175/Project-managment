<?php

namespace App\Modules\Automation;

use App\Modules\Automation\Services\AutomationActionDispatcherService;
use App\Modules\Automation\Services\AutomationConditionEvaluatorService;
use App\Modules\Automation\Services\AutomationEngineService;
use App\Modules\Automation\Services\TemplateResolver;
use Illuminate\Support\ServiceProvider;

class AutomationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TemplateResolver::class);
        $this->app->singleton(AutomationConditionEvaluatorService::class);
        $this->app->singleton(AutomationActionDispatcherService::class);
        $this->app->singleton(AutomationEngineService::class);
    }

    public function boot(): void
    {
        if (file_exists(__DIR__ . '/routes.php')) {
            $this->loadRoutesFrom(__DIR__ . '/routes.php');
        }
    }
}

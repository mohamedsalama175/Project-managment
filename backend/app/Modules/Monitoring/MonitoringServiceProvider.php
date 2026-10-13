<?php

namespace App\Modules\Monitoring;

use App\Modules\Monitoring\Commands\AggregateSlaMetricsCommand;
use Illuminate\Support\ServiceProvider;

class MonitoringServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([
                AggregateSlaMetricsCommand::class,
            ]);
        }
    }

    public function boot(): void
    {
        if (file_exists(__DIR__ . '/routes.php')) {
            $this->loadRoutesFrom(__DIR__ . '/routes.php');
        }
    }
}

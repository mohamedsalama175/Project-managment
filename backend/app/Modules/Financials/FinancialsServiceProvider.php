<?php

namespace App\Modules\Financials;

use App\Modules\Financials\Models\Dashboard;
use App\Modules\Financials\Models\Expense;
use App\Modules\Financials\Models\Invoice;
use App\Modules\Financials\Policies\DashboardPolicy;
use App\Modules\Financials\Policies\ExpensePolicy;
use App\Modules\Financials\Policies\InvoicePolicy;
use App\Modules\Financials\Services\CostCalculationService;
use App\Modules\Financials\Services\CurrencyConversionService;
use App\Modules\Financials\Services\EvmCalculationService;
use App\Modules\Financials\Services\ForecastEngineService;
use App\Modules\Financials\Services\InvoiceSequenceService;
use App\Modules\Financials\Services\ReportGeneratorService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class FinancialsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(InvoiceSequenceService::class);
        $this->app->singleton(CurrencyConversionService::class);
        $this->app->singleton(CostCalculationService::class);
        $this->app->singleton(EvmCalculationService::class);
        $this->app->singleton(ForecastEngineService::class);
        $this->app->singleton(ReportGeneratorService::class);
    }

    public function boot(): void
    {
        // Gate Policies
        Gate::policy(Expense::class, ExpensePolicy::class);
        Gate::policy(Invoice::class, InvoicePolicy::class);
        Gate::policy(Dashboard::class, DashboardPolicy::class);

        // Load Routes
        if (file_exists(__DIR__ . '/routes.php')) {
            $this->loadRoutesFrom(__DIR__ . '/routes.php');
        }
    }
}

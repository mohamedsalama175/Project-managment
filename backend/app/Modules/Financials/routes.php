<?php

use App\Modules\Financials\Controllers\BudgetController;
use App\Modules\Financials\Controllers\CostTrackingController;
use App\Modules\Financials\Controllers\CurrencyController;
use App\Modules\Financials\Controllers\DashboardController;
use App\Modules\Financials\Controllers\EvmController;
use App\Modules\Financials\Controllers\ExpenseController;
use App\Modules\Financials\Controllers\InvoiceController;
use App\Modules\Financials\Controllers\ReportController;
use App\Modules\Financials\Controllers\UserRateController;
use Illuminate\Support\Facades\Route;

Route::middleware(['api', 'auth:sanctum', 'email.verified', 'tenant'])
    ->prefix('api/v1')
    ->group(function () {
        // 1. Projects Budget & Revisions
        Route::get('projects/{id}/budget', [BudgetController::class, 'show']);
        Route::put('projects/{id}/budget', [BudgetController::class, 'update']);
        Route::get('projects/{id}/budget/revisions', [BudgetController::class, 'revisions']);

        // 2. Labor Rates & Rate History
        Route::get('rates/users', [UserRateController::class, 'index']);
        Route::post('rates/users', [UserRateController::class, 'store']);
        Route::put('rates/users/{id}', [UserRateController::class, 'update']);
        Route::delete('rates/users/{id}', [UserRateController::class, 'destroy']);

        // 3. Project Costs & Snapshots
        Route::get('projects/{id}/costs', [CostTrackingController::class, 'index']);
        Route::post('projects/{id}/costs/snapshot', [CostTrackingController::class, 'takeSnapshot']);
        Route::get('projects/{id}/costs/snapshots', [CostTrackingController::class, 'snapshots']);

        // 4. Earned Value Management, Burn Rate & Forecast
        Route::get('projects/{id}/evm', [EvmController::class, 'evm']);
        Route::get('projects/{id}/burn-rate', [EvmController::class, 'burnRate']);
        Route::get('projects/{id}/forecast-to-complete', [EvmController::class, 'forecast']);

        // 5. Expense Claims Workflow
        Route::get('expenses', [ExpenseController::class, 'index']);
        Route::post('expenses', [ExpenseController::class, 'store']);
        Route::get('expenses/{id}', [ExpenseController::class, 'show']);
        Route::put('expenses/{id}', [ExpenseController::class, 'update']);
        Route::delete('expenses/{id}', [ExpenseController::class, 'destroy']);
        Route::post('expenses/{id}/submit', [ExpenseController::class, 'submit']);
        Route::post('expenses/{id}/approve', [ExpenseController::class, 'approve']);
        Route::post('expenses/{id}/reject', [ExpenseController::class, 'reject']);
        Route::post('expenses/{id}/reimburse', [ExpenseController::class, 'reimburse']);

        // 6. Invoices Management
        Route::get('invoices', [InvoiceController::class, 'index']);
        Route::post('invoices', [InvoiceController::class, 'store']);
        Route::get('invoices/{id}', [InvoiceController::class, 'show']);
        Route::put('invoices/{id}', [InvoiceController::class, 'update']);
        Route::delete('invoices/{id}', [InvoiceController::class, 'destroy']);
        Route::post('invoices/{id}/send', [InvoiceController::class, 'send']);
        Route::post('invoices/{id}/mark-paid', [InvoiceController::class, 'markPaid']);
        Route::post('invoices/{id}/void', [InvoiceController::class, 'void']);
        Route::get('invoices/{id}/pdf', [InvoiceController::class, 'downloadPdf']);

        // 7. Multi-Currency Operations
        Route::get('currencies/rates', [CurrencyController::class, 'index']);
        Route::post('currencies/rates', [CurrencyController::class, 'store']);
        Route::post('currencies/convert', [CurrencyController::class, 'convert']);

        // 8. Reports Catalog, Generation & Schedules
        Route::get('reports/catalog', [ReportController::class, 'catalog']);
        Route::post('reports/generate', [ReportController::class, 'generate']);
        Route::get('reports/scheduled', [ReportController::class, 'scheduled']);
        Route::post('reports/scheduled', [ReportController::class, 'createScheduled']);
        Route::delete('reports/scheduled/{id}', [ReportController::class, 'deleteScheduled']);

        // 9. Dashboards & Widgets Catalog
        Route::get('widgets', [DashboardController::class, 'widgets']);
        Route::get('dashboards', [DashboardController::class, 'index']);
        Route::post('dashboards', [DashboardController::class, 'store']);
        Route::get('dashboards/{id}', [DashboardController::class, 'show']);
        Route::put('dashboards/{id}', [DashboardController::class, 'update']);
        Route::delete('dashboards/{id}', [DashboardController::class, 'destroy']);
    });

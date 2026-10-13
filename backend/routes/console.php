<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;
use App\Modules\Financials\Jobs\MarkOverdueInvoicesJob;
use App\Modules\Financials\Jobs\SnapshotProjectCostsJob;
use App\Modules\Financials\Jobs\DispatchScheduledReportsJob;
use App\Modules\Financials\Jobs\SyncCurrencyRatesJob;
use App\Modules\Financials\Jobs\PruneOldCostSnapshotsJob;

Schedule::job(new MarkOverdueInvoicesJob)->daily();
Schedule::job(new SnapshotProjectCostsJob)->weekly();
Schedule::job(new DispatchScheduledReportsJob)->hourly();
Schedule::job(new SyncCurrencyRatesJob)->daily();
Schedule::job(new PruneOldCostSnapshotsJob)->daily();

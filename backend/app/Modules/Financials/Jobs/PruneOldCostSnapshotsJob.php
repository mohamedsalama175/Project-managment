<?php

namespace App\Modules\Financials\Jobs;

use App\Modules\Financials\Models\ProjectCostSnapshot;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class PruneOldCostSnapshotsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $retentionMonths = (int) config('deliverops.cost_snapshot_retention_months', 24);
        $cutoffDate = Carbon::today()->subMonths($retentionMonths)->toDateString();

        ProjectCostSnapshot::withoutGlobalScopes()
            ->where('snapshot_date', '<', $cutoffDate)
            ->delete();
    }
}

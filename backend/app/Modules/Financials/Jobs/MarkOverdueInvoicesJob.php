<?php

namespace App\Modules\Financials\Jobs;

use App\Modules\Financials\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class MarkOverdueInvoicesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $today = Carbon::today()->toDateString();

        Invoice::withoutGlobalScopes()
            ->where('status', 'sent')
            ->where('due_date', '<', $today)
            ->update(['status' => 'overdue', 'updated_at' => now()]);
    }
}

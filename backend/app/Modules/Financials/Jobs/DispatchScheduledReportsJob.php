<?php

namespace App\Modules\Financials\Jobs;

use App\Modules\Financials\Models\ScheduledReport;
use App\Modules\Financials\Services\ReportGeneratorService;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DispatchScheduledReportsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(ReportGeneratorService $reportService, TenantManager $tenantManager): void
    {
        $now = Carbon::now();

        $reports = ScheduledReport::withoutGlobalScopes()
            ->where('is_active', true)
            ->where(function ($q) use ($now) {
                $q->whereNull('next_run_at')
                  ->orWhere('next_run_at', '<=', $now);
            })
            ->get();

        foreach ($reports as $report) {
            $tenantManager->runForTenant($report->organization_id, function () use ($reportService, $report, $now) {
                try {
                    $result = $reportService->generate(
                        $report->report_type,
                        $report->parameters ?? [],
                        $report->format ?? 'pdf'
                    );

                    Log::info("Dispatched scheduled report [{$report->id}] for org [{$report->organization_id}]");

                    $report->last_run_at = $now;
                    // Calculate next run approx 1 week or standard increment
                    $report->next_run_at = $now->copy()->addWeek();
                    $report->save();
                } catch (\Throwable $e) {
                    Log::error("Failed to run scheduled report [{$report->id}]: " . $e->getMessage());
                }
            });
        }
    }
}

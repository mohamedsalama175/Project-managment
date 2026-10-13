<?php

namespace App\Modules\Financials\Jobs;

use App\Models\Project;
use App\Modules\Financials\Services\CostCalculationService;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SnapshotProjectCostsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(CostCalculationService $costService, TenantManager $tenantManager): void
    {
        $today = Carbon::today()->toDateString();

        $projects = Project::withoutGlobalScopes()
            ->where('is_archived', false)
            ->get();

        foreach ($projects as $project) {
            $tenantManager->runForTenant($project->organization_id, function () use ($costService, $project, $today) {
                $costService->createCostSnapshot($project, $today);
            });
        }
    }
}

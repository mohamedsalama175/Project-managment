<?php

namespace App\Jobs;

use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

abstract class GlobalJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    final public function handle(TenantManager $tenantManager): void
    {
        $tenantManager->executeWithoutTenantScope(function () {
            $this->executeGlobally();
        });
    }

    abstract protected function executeGlobally(): void;
}

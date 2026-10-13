<?php

namespace App\Jobs;

use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

abstract class TenantAwareJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public string $organizationId) {}

    final public function handle(TenantManager $tenantManager): void
    {
        $tenantManager->runForTenant($this->organizationId, function () {
            $this->executeInTenantContext();
        });
    }

    abstract protected function executeInTenantContext(): void;
}

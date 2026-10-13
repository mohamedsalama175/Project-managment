<?php

namespace App\Modules\Compliance\Jobs;

use App\Jobs\TenantAwareJob;
use App\Modules\Compliance\Services\GdprService;

class ProcessDsarExportJob extends TenantAwareJob
{
    public function __construct(
        string $organizationId,
        public string $requestId,
        public string $userId
    ) {
        parent::__construct($organizationId);
    }

    protected function executeInTenantContext(): void
    {
        $gdprService = app(GdprService::class);
        $gdprService->compileExportArchive($this->organizationId, $this->requestId, $this->userId);
    }
}

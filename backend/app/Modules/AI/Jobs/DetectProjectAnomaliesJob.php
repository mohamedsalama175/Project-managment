<?php

namespace App\Modules\AI\Jobs;

use App\Jobs\TenantAwareJob;
use App\Modules\AI\Services\ProjectAnomalyDetectorService;

class DetectProjectAnomaliesJob extends TenantAwareJob
{
    public function __construct(
        string $organizationId,
        public ?string $projectId = null
    ) {
        parent::__construct($organizationId);
    }

    protected function executeInTenantContext(): void
    {
        /** @var ProjectAnomalyDetectorService $detector */
        $detector = app(ProjectAnomalyDetectorService::class);
        $detector->detectAnomalies($this->organizationId, $this->projectId);
    }
}

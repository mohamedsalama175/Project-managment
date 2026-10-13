<?php

namespace App\Modules\AI\Jobs;

use App\Jobs\TenantAwareJob;
use App\Modules\AI\Services\AiSummarizationService;

class GenerateWeeklyDigestSummaryJob extends TenantAwareJob
{
    public function __construct(
        string $organizationId,
        public string $projectId
    ) {
        parent::__construct($organizationId);
    }

    protected function executeInTenantContext(): void
    {
        /** @var AiSummarizationService $summarizer */
        $summarizer = app(AiSummarizationService::class);
        $summarizer->generateAndCacheWeeklyDigest($this->organizationId, $this->projectId);
    }
}

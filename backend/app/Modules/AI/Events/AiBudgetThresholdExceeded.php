<?php

namespace App\Modules\AI\Events;

use App\Modules\Tenancy\Models\Organization;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AiBudgetThresholdExceeded
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Organization $organization,
        public int $threshold,
        public float $currentSpend,
        public float $budgetLimit
    ) {}
}

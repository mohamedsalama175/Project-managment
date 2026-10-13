<?php

namespace App\Modules\Compliance;

use App\Modules\Audit\Services\AuditHashChainService;
use App\Modules\Compliance\Models\ComplianceDsarRequest;
use App\Modules\Compliance\Models\LegalHold;
use App\Modules\Compliance\Services\GdprService;
use App\Modules\Compliance\Services\LegalHoldService;
use App\Policies\ComplianceDsarRequestPolicy;
use App\Policies\LegalHoldPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class ComplianceServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AuditHashChainService::class);
        $this->app->singleton(LegalHoldService::class);
        $this->app->singleton(GdprService::class);
    }

    public function boot(): void
    {
        Gate::policy(LegalHold::class, LegalHoldPolicy::class);
        Gate::policy(ComplianceDsarRequest::class, ComplianceDsarRequestPolicy::class);

        if (file_exists(__DIR__ . '/routes.php')) {
            $this->loadRoutesFrom(__DIR__ . '/routes.php');
        }
    }
}

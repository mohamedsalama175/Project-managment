<?php

use App\Modules\Collaboration\CollaborationServiceProvider;
use App\Modules\Notifications\NotificationsServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    CollaborationServiceProvider::class,
    NotificationsServiceProvider::class,
    \App\Modules\Resources\ResourcesServiceProvider::class,
    \App\Modules\Financials\FinancialsServiceProvider::class,
    \App\Modules\Integrations\IntegrationsServiceProvider::class,
    \App\Modules\AI\AIServiceProvider::class,
    \App\Modules\Automation\AutomationServiceProvider::class,
    \App\Modules\Identity\IdentityServiceProvider::class,
    \App\Modules\Compliance\ComplianceServiceProvider::class,
    \App\Modules\Monitoring\MonitoringServiceProvider::class,
];

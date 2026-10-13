<?php

namespace App\Modules\Integrations;

use App\Modules\Integrations\Models\ApiKey;
use App\Modules\Integrations\Models\IntegrationConnection;
use App\Modules\Integrations\Models\OAuthClient;
use App\Modules\Integrations\Models\WebhookEndpoint;
use App\Modules\Integrations\Policies\ApiKeyPolicy;
use App\Modules\Integrations\Policies\IntegrationConnectionPolicy;
use App\Modules\Integrations\Policies\OAuthClientPolicy;
use App\Modules\Integrations\Policies\WebhookEndpointPolicy;
use App\Modules\Integrations\Services\ApiKeyService;
use App\Modules\Integrations\Services\GitCommitMatcherService;
use App\Modules\Integrations\Services\Importers\AsanaImporter;
use App\Modules\Integrations\Services\Importers\JiraImporter;
use App\Modules\Integrations\Services\Importers\MondayImporter;
use App\Modules\Integrations\Services\Importers\MsProjectImporter;
use App\Modules\Integrations\Services\OAuthService;
use App\Modules\Integrations\Services\SlackService;
use App\Modules\Integrations\Services\TeamsService;
use App\Modules\Integrations\Services\WebhookDispatcherService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class IntegrationsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ApiKeyService::class);
        $this->app->singleton(OAuthService::class);
        $this->app->singleton(WebhookDispatcherService::class);
        $this->app->singleton(SlackService::class);
        $this->app->singleton(TeamsService::class);
        $this->app->singleton(GitCommitMatcherService::class);
        $this->app->singleton(JiraImporter::class);
        $this->app->singleton(AsanaImporter::class);
        $this->app->singleton(MondayImporter::class);
        $this->app->singleton(MsProjectImporter::class);
    }

    public function boot(): void
    {
        // Gate Policies
        Gate::policy(ApiKey::class, ApiKeyPolicy::class);
        Gate::policy(OAuthClient::class, OAuthClientPolicy::class);
        Gate::policy(WebhookEndpoint::class, WebhookEndpointPolicy::class);
        Gate::policy(IntegrationConnection::class, IntegrationConnectionPolicy::class);

        // Load Routes
        if (file_exists(__DIR__ . '/routes.php')) {
            $this->loadRoutesFrom(__DIR__ . '/routes.php');
        }
    }
}

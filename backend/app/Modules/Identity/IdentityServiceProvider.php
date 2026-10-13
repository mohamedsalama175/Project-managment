<?php

namespace App\Modules\Identity;

use App\Modules\Identity\Models\ScimToken;
use App\Modules\Identity\Models\SsoConfiguration;
use App\Modules\Identity\Services\MfaService;
use App\Modules\Identity\Services\RegistrationService;
use App\Modules\Identity\Services\RolePermissionService;
use App\Modules\Identity\Services\ScimService;
use App\Modules\Identity\Services\SsoService;
use App\Modules\Identity\Services\UserService;
use App\Policies\ScimTokenPolicy;
use App\Policies\SsoConfigurationPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class IdentityServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(UserService::class);
        $this->app->singleton(RolePermissionService::class);
        $this->app->singleton(RegistrationService::class);
        $this->app->singleton(MfaService::class);
        $this->app->singleton(SsoService::class);
        $this->app->singleton(ScimService::class);
    }

    public function boot(): void
    {
        Gate::policy(SsoConfiguration::class, SsoConfigurationPolicy::class);
        Gate::policy(ScimToken::class, ScimTokenPolicy::class);

        if (file_exists(__DIR__ . '/routes.php')) {
            $this->loadRoutesFrom(__DIR__ . '/routes.php');
        }
    }
}

<?php

namespace App\Modules\Notifications;

use App\Modules\Notifications\Models\PushToken;
use App\Modules\Notifications\Services\NotificationDeliveryService;
use App\Modules\Notifications\Services\NotificationPipelineService;
use App\Modules\Notifications\Services\PushNotificationDispatcherService;
use App\Modules\Notifications\Services\Providers\ApnsProvider;
use App\Modules\Notifications\Services\Providers\FcmProvider;
use App\Modules\Notifications\Services\Providers\MockPushProvider;
use App\Modules\Notifications\Services\Providers\WebPushProvider;
use App\Policies\PushTokenPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class NotificationsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(NotificationDeliveryService::class);
        $this->app->bind(NotificationPipelineService::class, NotificationDeliveryService::class);

        // Phase 9 Push Providers & Dispatcher
        $this->app->singleton(MockPushProvider::class);
        $this->app->singleton(ApnsProvider::class);
        $this->app->singleton(FcmProvider::class);
        $this->app->singleton(WebPushProvider::class);
        $this->app->singleton(PushNotificationDispatcherService::class);
    }

    public function boot(): void
    {
        Gate::policy(PushToken::class, PushTokenPolicy::class);

        if (file_exists(__DIR__ . '/routes.php')) {
            $this->loadRoutesFrom(__DIR__ . '/routes.php');
        }
    }
}

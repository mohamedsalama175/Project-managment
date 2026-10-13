<?php

namespace App\Modules\Resources;

use App\Modules\Resources\Events\ResourceLevelingAppliedEvent;
use App\Modules\Resources\Events\TimeEntryTransitionedEvent;
use App\Modules\Resources\Events\TimeOffStatusChangedEvent;
use App\Modules\Resources\Listeners\LogResourceActivityEventListener;
use App\Modules\Resources\Models\Skill;
use App\Modules\Resources\Models\TimeEntry;
use App\Modules\Resources\Models\TimeOffRequest;
use App\Modules\Resources\Policies\SkillPolicy;
use App\Modules\Resources\Policies\TimeEntryPolicy;
use App\Modules\Resources\Policies\TimeOffPolicy;
use App\Modules\Resources\Services\CapacityForecastService;
use App\Modules\Resources\Services\HiringRecommendationService;
use App\Modules\Resources\Services\ResourceLevelingService;
use App\Modules\Resources\Services\TimesheetService;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class ResourcesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(CapacityForecastService::class);
        $this->app->singleton(ResourceLevelingService::class);
        $this->app->singleton(HiringRecommendationService::class);
        $this->app->singleton(TimesheetService::class);
    }

    public function boot(): void
    {
        // Gate Policies
        Gate::policy(TimeOffRequest::class, TimeOffPolicy::class);
        Gate::policy(Skill::class, SkillPolicy::class);
        Gate::policy(TimeEntry::class, TimeEntryPolicy::class);

        // Domain Event Listeners for Activity Logging
        Event::listen(TimeEntryTransitionedEvent::class, [LogResourceActivityEventListener::class, 'handleTimeEntryTransition']);
        Event::listen(ResourceLevelingAppliedEvent::class, [LogResourceActivityEventListener::class, 'handleLevelingApplied']);
        Event::listen(TimeOffStatusChangedEvent::class, [LogResourceActivityEventListener::class, 'handleTimeOffStatusChanged']);

        // Load Routes
        if (file_exists(__DIR__ . '/routes.php')) {
            $this->loadRoutesFrom(__DIR__ . '/routes.php');
        }
    }
}

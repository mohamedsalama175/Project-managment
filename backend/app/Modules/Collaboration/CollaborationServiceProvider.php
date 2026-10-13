<?php

namespace App\Modules\Collaboration;

use App\Modules\Collaboration\Models\TaskComment;
use App\Modules\Collaboration\Policies\TaskCommentPolicy;
use App\Modules\Collaboration\Services\ActivityLoggerService;
use App\Modules\Collaboration\Services\ActivityRecorderService;
use App\Modules\Collaboration\Services\ClamAvClient;
use App\Modules\Collaboration\Services\ClamAvClientInterface;
use App\Modules\Collaboration\Services\MentionParserService;
use App\Modules\Collaboration\Services\ReviewWorkflowService;
use App\Modules\Collaboration\Services\TaskCommentService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class CollaborationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ClamAvClientInterface::class, ClamAvClient::class);
        $this->app->singleton(MentionParserService::class);
        $this->app->singleton(ActivityLoggerService::class);
        $this->app->bind(ActivityRecorderService::class, ActivityLoggerService::class);
        $this->app->singleton(ReviewWorkflowService::class);
        $this->app->singleton(TaskCommentService::class);
    }

    public function boot(): void
    {
        Gate::policy(TaskComment::class, TaskCommentPolicy::class);
    }
}

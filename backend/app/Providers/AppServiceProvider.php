<?php

namespace App\Providers;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationInvitation;
use App\Modules\Tenancy\Policies\OrganizationInvitationPolicy;
use App\Modules\Tenancy\Policies\OrganizationPolicy;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TenantManager::class);
        $this->app->singleton(
            \App\Modules\Collaboration\Services\ClamAvClientInterface::class,
            \App\Modules\Collaboration\Services\ClamAvClient::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Explicit Policy Mappings for Modular Domains
        Gate::policy(\App\Models\User::class, \App\Modules\Identity\Policies\UserPolicy::class);
        Gate::policy(\App\Models\Role::class, \App\Modules\Identity\Policies\RolePolicy::class);
        Gate::policy(\Spatie\Permission\Models\Role::class, \App\Modules\Identity\Policies\RolePolicy::class);
        Gate::policy(\App\Models\Project::class, \App\Modules\Projects\Policies\ProjectPolicy::class);
        Gate::policy(\App\Models\Task::class, \App\Modules\Tasks\Policies\TaskPolicy::class);
        Gate::policy(\App\Models\ProjectRisk::class, \App\Modules\Risks\Policies\ProjectRiskPolicy::class);
        Gate::policy(Organization::class, OrganizationPolicy::class);
        Gate::policy(OrganizationInvitation::class, OrganizationInvitationPolicy::class);
        Gate::policy(\App\Modules\Templates\Models\ProjectTemplate::class, \App\Policies\ProjectTemplatePolicy::class);
        Gate::policy(\App\Modules\Collaboration\Models\TaskComment::class, \App\Modules\Collaboration\Policies\TaskCommentPolicy::class);

        // Global Administrator Capability Bypass (Scoped to Team/Tenant)
        Gate::before(function (User $user, string $ability) {
            if ($user->email === 'admin@admin.com') {
                return true;
            }

            if (getPermissionsTeamId() === null && $user->default_organization_id) {
                setPermissionsTeamId($user->default_organization_id);
            }

            return $user->hasRole('admin') ? true : null;
        });

        // Email Verification Listener (Item 14)
        Event::listen(Registered::class, SendEmailVerificationNotification::class);

        // Rate Limiters Configuration (Item 11 & Item 18)
        $this->configureRateLimiters();
    }

    protected function configureRateLimiters(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $key = strtolower($request->input('email', '')) . '|' . $request->ip();
            $maxAttempts = config('ratelimits.guest.login.max_attempts', 5);
            $decayMinutes = config('ratelimits.guest.login.decay_minutes', 1);

            return Limit::perMinutes($decayMinutes, $maxAttempts)->by($key)->response(function () {
                return response()->json([
                    'message' => 'Too many login attempts. Please wait 60 seconds.',
                    'code' => 'AUTH_THROTTLED',
                ], 429);
            });
        });

        RateLimiter::for('guest.register', function (Request $request) {
            $maxAttempts = config('ratelimits.guest.register.max_attempts', 3);
            $decayMinutes = config('ratelimits.guest.register.decay_minutes', 60);
            return Limit::perMinutes($decayMinutes, $maxAttempts)->by($request->ip());
        });

        RateLimiter::for('auth.signup', function (Request $request) {
            return Limit::perMinutes(60, 3)->by($request->ip());
        });

        RateLimiter::for('auth.email_resend', function (Request $request) {
            $key = strtolower($request->input('email', '')) . '|' . $request->ip();
            return Limit::perMinutes(1, 1)->by($key);
        });

        RateLimiter::for('auth.forgot_password', function (Request $request) {
            return Limit::perMinutes(15, 5)->by($request->ip());
        });

        RateLimiter::for('guest.mfa_challenge', function (Request $request) {
            $maxAttempts = config('ratelimits.guest.mfa_challenge.max_attempts', 5);
            $decayMinutes = config('ratelimits.guest.mfa_challenge.decay_minutes', 1);
            return Limit::perMinutes($decayMinutes, $maxAttempts)->by($request->ip());
        });

        RateLimiter::for('user.mfa_confirm', function (Request $request) {
            $maxAttempts = config('ratelimits.user.mfa_confirm.max_attempts', 5);
            $decayMinutes = config('ratelimits.user.mfa_confirm.decay_minutes', 1);
            return Limit::perMinutes($decayMinutes, $maxAttempts)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('user.logout_all', function (Request $request) {
            $maxAttempts = config('ratelimits.user.logout_all.max_attempts', 5);
            $decayMinutes = config('ratelimits.user.logout_all.decay_minutes', 1);
            return Limit::perMinutes($decayMinutes, $maxAttempts)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('user.invitations', function (Request $request) {
            $maxAttempts = config('ratelimits.user.invitations.max_attempts', 20);
            $decayMinutes = config('ratelimits.user.invitations.decay_minutes', 1);
            return Limit::perMinutes($decayMinutes, $maxAttempts)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('org.invitations', function (Request $request) {
            $orgId = $request->route('id') ?: ($request->user()?->default_organization_id ?: $request->ip());
            return Limit::perDay(50)->by('org_invites_' . $orgId);
        });

        RateLimiter::for('user.password_change', function (Request $request) {
            $maxAttempts = config('ratelimits.user.password_change.max_attempts', 5);
            $decayMinutes = config('ratelimits.user.password_change.decay_minutes', 1);
            return Limit::perMinutes($decayMinutes, $maxAttempts)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('install', function (Request $request) {
            return Limit::perHour(5)->by($request->ip());
        });

        RateLimiter::for('heavy_import', function (Request $request) {
            return Limit::perHour(10)->by($request->user()?->id ?: $request->ip());
        });
    }
}

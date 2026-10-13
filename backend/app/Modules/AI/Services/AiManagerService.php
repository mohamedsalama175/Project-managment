<?php

namespace App\Modules\AI\Services;

use App\Models\User;
use App\Modules\AI\Contracts\AIProviderInterface;
use App\Modules\AI\Events\AiBudgetThresholdExceeded;
use App\Modules\AI\Models\AiUsageLog;
use App\Modules\AI\Models\OrganizationAiCredential;
use App\Modules\AI\Services\Providers\AnthropicProvider;
use App\Modules\AI\Services\Providers\GoogleGeminiProvider;
use App\Modules\AI\Services\Providers\MockAiProvider;
use App\Modules\AI\Services\Providers\OllamaProvider;
use App\Modules\AI\Services\Providers\OpenAiProvider;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AiManagerService
{
    public function __construct(
        protected TenantManager $tenantManager,
        protected PiiScrubberService $piiScrubber
    ) {}

    /**
     * Dynamically resolve AI provider for a specific organization
     */
    public function resolveProvider(string $tenantId): AIProviderInterface
    {
        if (app()->environment('testing')) {
            return app(MockAiProvider::class);
        }

        $org = Organization::findOrFail($tenantId);
        $settings = $org->ai_settings ?? [];
        $providerKey = $settings['provider'] ?? config('deliverops.ai.default_provider', 'openai');

        // Resolve encrypted credentials
        $creds = OrganizationAiCredential::where('organization_id', $tenantId)->first();

        return match ($providerKey) {
            'anthropic' => new AnthropicProvider($creds?->anthropic_key ?? config('services.anthropic.key')),
            'gemini' => new GoogleGeminiProvider($creds?->gemini_key ?? config('services.gemini.key')),
            'ollama' => new OllamaProvider($creds?->ollama_url ?? 'http://127.0.0.1:11434'),
            default => new OpenAiProvider($creds?->openai_key ?? config('services.openai.key')),
        };
    }

    /**
     * Check feature enablement, user rate limit, and monthly budget
     */
    public function checkBudgetAndAuthorize(string $tenantId, ?User $user, string $feature): void
    {
        $org = Organization::findOrFail($tenantId);
        $settings = $org->ai_settings ?? [];

        // 1. Feature Flag Check
        if (isset($settings['features'][$feature]) && !$settings['features'][$feature]) {
            throw new HttpException(403, "AI feature '{$feature}' is disabled for this organization.");
        }

        // 2. Per-User Daily Rate Limit (default 100/day)
        if ($user) {
            $today = Carbon::today()->toDateString();
            $key = "ai_user_daily_req:{$tenantId}:{$user->id}:{$today}";
            Cache::add($key, 0, Carbon::now()->endOfDay());
            $dailyCount = Cache::increment($key);

            $dailyLimit = (int) ($settings['daily_request_limit_per_user'] ?? config('deliverops.ai.daily_request_limit_per_user', 100));
            if ($dailyCount > $dailyLimit) {
                throw new HttpException(429, "Daily AI request limit of {$dailyLimit} exceeded for this user.");
            }
        }

        // 3. Monthly Budget Check
        $startOfMonth = Carbon::now()->startOfMonth();
        $monthlySpend = (float) AiUsageLog::withoutGlobalScopes()
            ->where('organization_id', $tenantId)
            ->where('created_at', '>=', $startOfMonth)
            ->sum('cost_usd');

        $budgetLimit = (float) ($org->ai_monthly_budget_usd ?? 50.00);

        if ($monthlySpend >= $budgetLimit) {
            $throttleKey100 = "ai_budget_alert_sent:{$tenantId}:100";
            if (Cache::add($throttleKey100, true, 21600)) { // 6 hours throttle
                event(new AiBudgetThresholdExceeded($org, 100, $monthlySpend, $budgetLimit));
            }
            throw new HttpException(402, "Organization monthly AI budget limit of \${$budgetLimit} exceeded. Usage paused.");
        }

        if ($monthlySpend >= ($budgetLimit * 0.8)) {
            $throttleKey80 = "ai_budget_alert_sent:{$tenantId}:80";
            if (Cache::add($throttleKey80, true, 21600)) { // 6 hours throttle
                event(new AiBudgetThresholdExceeded($org, 80, $monthlySpend, $budgetLimit));
            }
        }
    }

    /**
     * Record consumption in forensic AI usage log
     */
    public function recordUsage(
        string $tenantId,
        ?User $user,
        string $feature,
        string $provider,
        string $model,
        int $tokensIn,
        int $tokensOut,
        float $costUsd,
        array $metadata = []
    ): AiUsageLog {
        return AiUsageLog::create([
            'organization_id' => $tenantId,
            'user_id' => $user?->id,
            'feature' => $feature,
            'provider' => $provider,
            'model' => $model,
            'tokens_in' => $tokensIn,
            'tokens_out' => $tokensOut,
            'cost_usd' => $costUsd,
            'metadata' => $metadata,
        ]);
    }
}

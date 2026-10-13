<?php

namespace App\Modules\AI\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Models\AiUsageLog;
use App\Modules\AI\Models\OrganizationAiCredential;
use App\Modules\AI\Models\ProjectAnomaly;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AiUsageController extends Controller
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function usage(Request $request): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $org = Organization::findOrFail($tenantId);
        $monthlyBudget = (float) ($org->ai_monthly_budget_usd ?? 50.0);

        $startOfMonth = Carbon::now()->startOfMonth();
        $currentMonthSpend = (float) AiUsageLog::where('organization_id', $tenantId)
            ->where('created_at', '>=', $startOfMonth)
            ->sum('cost_usd');

        $byFeature = AiUsageLog::where('organization_id', $tenantId)
            ->where('created_at', '>=', $startOfMonth)
            ->select(
                'feature',
                DB::raw('COUNT(*) as requests_count'),
                DB::raw('SUM(tokens_in) as total_tokens_in'),
                DB::raw('SUM(tokens_out) as total_tokens_out'),
                DB::raw('SUM(cost_usd) as total_cost_usd')
            )
            ->groupBy('feature')
            ->get();

        $recentLogs = AiUsageLog::where('organization_id', $tenantId)
            ->latest('created_at')
            ->take(20)
            ->get();

        return response()->json([
            'monthly_budget_usd' => $monthlyBudget,
            'current_month_spend_usd' => round($currentMonthSpend, 4),
            'remaining_budget_usd' => max(0.0, round($monthlyBudget - $currentMonthSpend, 4)),
            'burn_percentage' => $monthlyBudget > 0 ? round(($currentMonthSpend / $monthlyBudget) * 100, 1) : 0,
            'features' => $byFeature,
            'recent_logs' => $recentLogs,
            'ai_settings' => $org->ai_settings ?? [],
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $validated = $request->validate([
            'ai_monthly_budget_usd' => ['nullable', 'numeric', 'min:0'],
            'ai_settings' => ['nullable', 'array'],
            'credentials' => ['nullable', 'array'],
            'credentials.openai_key' => ['nullable', 'string', 'max:2048'],
            'credentials.anthropic_key' => ['nullable', 'string', 'max:2048'],
            'credentials.gemini_key' => ['nullable', 'string', 'max:2048'],
            'credentials.ollama_url' => ['nullable', 'string', 'max:255'],
        ]);

        $org = Organization::findOrFail($tenantId);

        if (isset($validated['ai_monthly_budget_usd'])) {
            $org->ai_monthly_budget_usd = $validated['ai_monthly_budget_usd'];
        }

        if (isset($validated['ai_settings'])) {
            $currentSettings = $org->ai_settings ?? [];
            $org->ai_settings = array_merge($currentSettings, $validated['ai_settings']);
        }

        $org->save();

        if (!empty($validated['credentials'])) {
            $creds = OrganizationAiCredential::firstOrNew(['organization_id' => $tenantId]);
            if (isset($validated['credentials']['openai_key'])) {
                $creds->openai_key = $validated['credentials']['openai_key'];
            }
            if (isset($validated['credentials']['anthropic_key'])) {
                $creds->anthropic_key = $validated['credentials']['anthropic_key'];
            }
            if (isset($validated['credentials']['gemini_key'])) {
                $creds->gemini_key = $validated['credentials']['gemini_key'];
            }
            if (isset($validated['credentials']['ollama_url'])) {
                $creds->ollama_url = $validated['credentials']['ollama_url'];
            }
            $creds->save();
        }

        return response()->json([
            'message' => 'AI settings updated successfully.',
            'ai_monthly_budget_usd' => (float) $org->ai_monthly_budget_usd,
            'ai_settings' => $org->ai_settings,
        ]);
    }

    public function anomalies(Request $request, string $projectId): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $anomalies = ProjectAnomaly::with('acknowledgedBy:id,name')
            ->where('organization_id', $tenantId)
            ->where('project_id', $projectId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'project_id' => $projectId,
            'anomalies' => $anomalies,
        ]);
    }

    public function acknowledgeAnomaly(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $anomaly = ProjectAnomaly::where('organization_id', $tenantId)->findOrFail($id);

        $anomaly->update([
            'acknowledged_at' => now(),
            'acknowledged_by_id' => $request->user()->id,
        ]);

        return response()->json([
            'anomaly' => $anomaly->fresh()->load('acknowledgedBy:id,name'),
            'message' => 'Anomaly acknowledged successfully.',
        ]);
    }
}

<?php

namespace App\Modules\Automation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Automation\Models\AutomationRule;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationRuleController extends Controller
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $query = AutomationRule::where('organization_id', $tenantId)
            ->with(['creator:id,name', 'project:id,name,code']);

        if ($request->query('project_id')) {
            $query->where('project_id', $request->query('project_id'));
        }

        if ($request->has('enabled')) {
            $query->where('enabled', filter_var($request->query('enabled'), FILTER_VALIDATE_BOOLEAN));
        }

        $rules = $query->orderByDesc('created_at')->get();

        return response()->json(['rules' => $rules]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:255'],
            'project_id' => ['nullable', 'string'],
            'trigger' => ['required', 'array'],
            'trigger.event' => ['required', 'string'],
            'conditions' => ['nullable', 'array'],
            'actions' => ['required', 'array', 'min:1'],
            'enabled' => ['nullable', 'boolean'],
        ]);

        $rule = AutomationRule::create([
            'organization_id' => $tenantId,
            'project_id' => $validated['project_id'] ?? null,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'trigger' => $validated['trigger'],
            'conditions' => $validated['conditions'] ?? [],
            'actions' => $validated['actions'],
            'enabled' => $validated['enabled'] ?? true,
            'created_by_id' => $request->user()->id,
        ]);

        return response()->json([
            'rule' => $rule->load(['creator:id,name', 'project:id,name,code']),
            'message' => 'Automation rule created successfully.',
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $rule = AutomationRule::where('organization_id', $tenantId)
            ->with(['creator:id,name', 'project:id,name,code'])
            ->findOrFail($id);

        $recentRuns = $rule->runs()->latest('executed_at')->take(10)->get();

        return response()->json([
            'rule' => $rule,
            'recent_runs' => $recentRuns,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $rule = AutomationRule::where('organization_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:255'],
            'project_id' => ['nullable', 'string'],
            'trigger' => ['nullable', 'array'],
            'conditions' => ['nullable', 'array'],
            'actions' => ['nullable', 'array'],
            'enabled' => ['nullable', 'boolean'],
        ]);

        $rule->update($validated);

        return response()->json([
            'rule' => $rule->fresh()->load(['creator:id,name', 'project:id,name,code']),
            'message' => 'Automation rule updated successfully.',
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $rule = AutomationRule::where('organization_id', $tenantId)->findOrFail($id);
        $rule->delete(); // SoftDeletes

        return response()->json([
            'message' => 'Automation rule deleted successfully.',
        ]);
    }

    public function toggle(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $rule = AutomationRule::where('organization_id', $tenantId)->findOrFail($id);
        $rule->update(['enabled' => !$rule->enabled]);

        return response()->json([
            'rule' => $rule,
            'message' => 'Rule status updated successfully.',
        ]);
    }
}

<?php

namespace App\Modules\Automation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Automation\Models\AutomationRule;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationTemplateController extends Controller
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function index(): JsonResponse
    {
        $templates = config('deliverops.automation_templates', []);
        return response()->json(['templates' => $templates]);
    }

    public function instantiate(Request $request, string $templateId): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $templates = config('deliverops.automation_templates', []);
        $template = collect($templates)->firstWhere('id', $templateId);

        if (!$template) {
            return response()->json(['message' => 'Automation template not found.'], 404);
        }

        $validated = $request->validate([
            'project_id' => ['nullable', 'string'],
            'name' => ['nullable', 'string', 'max:150'],
        ]);

        $conditions = $template['conditions'] ?? [];
        if (isset($conditions['all'])) {
            $conditions = $conditions['all'];
        }

        $rule = AutomationRule::create([
            'organization_id' => $tenantId,
            'project_id' => $validated['project_id'] ?? null,
            'name' => $validated['name'] ?? $template['name'],
            'description' => $template['description'] ?? null,
            'trigger' => $template['trigger'],
            'conditions' => $conditions,
            'actions' => $template['actions'],
            'enabled' => true,
            'created_by_id' => $request->user()->id,
        ]);

        return response()->json([
            'rule' => $rule->load(['creator:id,name', 'project:id,name,code']),
            'message' => "Rule created from template '{$template['name']}'.",
        ], 201);
    }
}

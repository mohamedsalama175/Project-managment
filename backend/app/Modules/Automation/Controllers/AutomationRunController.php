<?php

namespace App\Modules\Automation\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Automation\Models\AutomationRun;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationRunController extends Controller
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

        $query = AutomationRun::where('organization_id', $tenantId)
            ->with(['rule:id,name,project_id']);

        if ($request->query('rule_id')) {
            $query->where('rule_id', $request->query('rule_id'));
        }

        if ($request->query('status')) {
            $query->where('status', $request->query('status'));
        }

        $runs = $query->orderByDesc('executed_at')->paginate($request->query('per_page', 25));

        return response()->json($runs);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $run = AutomationRun::where('organization_id', $tenantId)
            ->with(['rule'])
            ->findOrFail($id);

        return response()->json(['run' => $run]);
    }
}

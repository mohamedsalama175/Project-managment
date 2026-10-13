<?php

namespace App\Modules\AI\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Services\AiAssistantService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAssistantController extends Controller
{
    public function __construct(
        protected AiAssistantService $assistantService,
        protected TenantManager $tenantManager
    ) {}

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'messages' => ['required', 'array', 'min:1'],
            'messages.*.role' => ['required', 'string', 'in:user,assistant,system'],
            'messages.*.content' => ['required', 'string'],
            'project_id' => ['nullable', 'string'],
        ]);

        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $result = $this->assistantService->chat(
            $tenantId,
            $request->user(),
            $validated['messages'],
            $validated['project_id'] ?? null
        );

        return response()->json($result);
    }

    public function rollback(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $result = $this->assistantService->rollbackAction($tenantId, $request->user(), $id);

        return response()->json($result);
    }
}

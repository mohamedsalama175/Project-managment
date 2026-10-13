<?php

namespace App\Modules\AI\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Services\NaturalLanguageTaskParserService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiTaskParserController extends Controller
{
    public function __construct(
        protected NaturalLanguageTaskParserService $parserService,
        protected TenantManager $tenantManager
    ) {}

    public function parse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'text' => ['required', 'string', 'min:3', 'max:2000'],
            'project_id' => ['nullable', 'string'],
        ]);

        $tenantId = $this->tenantManager->getTenantId() ?? $request->user()->current_organization_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        $result = $this->parserService->parse(
            $tenantId,
            $request->user(),
            $validated['text'],
            $validated['project_id'] ?? null
        );

        return response()->json($result);
    }
}

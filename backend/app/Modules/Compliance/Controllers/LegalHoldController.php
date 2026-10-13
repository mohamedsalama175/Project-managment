<?php

namespace App\Modules\Compliance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Compliance\Models\LegalHold;
use App\Modules\Compliance\Services\LegalHoldService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LegalHoldController extends Controller
{
    public function __construct(
        protected LegalHoldService $legalHoldService,
        protected TenantManager $tenantManager
    ) {}

    public function index(): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $holds = LegalHold::where('organization_id', $orgId)->orderBy('created_at', 'desc')->get();

        return response()->json(['legal_holds' => $holds]);
    }

    public function store(Request $request): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $validated = $request->validate([
            'entity_type' => 'required|in:Project,Task,User,Attachment',
            'entity_id' => 'required|string',
            'reason' => 'required|string|max:1000',
            'case_number' => 'nullable|string|max:100',
        ]);

        $hold = $this->legalHoldService->createHold(
            $orgId,
            $validated['entity_type'],
            $validated['entity_id'],
            $validated['reason'],
            $validated['case_number'] ?? null,
            auth()->id()
        );

        return response()->json([
            'message' => 'Legal hold created successfully.',
            'legal_hold' => $hold,
        ], 201);
    }

    public function release(string $id): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $hold = $this->legalHoldService->releaseHold($orgId, $id, auth()->id());

        return response()->json([
            'message' => 'Legal hold released successfully.',
            'legal_hold' => $hold,
        ]);
    }

    public function exportEdiscovery(Request $request): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $validated = $request->validate([
            'legal_hold_id' => 'required|string',
        ]);

        $res = $this->legalHoldService->exportEdiscovery($orgId, $validated['legal_hold_id']);

        return response()->json($res);
    }
}

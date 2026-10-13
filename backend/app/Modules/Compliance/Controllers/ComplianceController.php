<?php

namespace App\Modules\Compliance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Compliance\Models\ComplianceDsarRequest;
use App\Modules\Compliance\Services\GdprService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ComplianceController extends Controller
{
    public function __construct(
        protected GdprService $gdprService,
        protected TenantManager $tenantManager
    ) {}

    public function requestDsarExport(Request $request): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $validated = $request->validate([
            'user_id' => 'required|string',
        ]);

        $dsarRequest = $this->gdprService->requestDsarExport(
            $orgId,
            $validated['user_id'],
            auth()->id()
        );

        return response()->json([
            'message' => 'DSAR export queued successfully.',
            'dsar_request' => $dsarRequest,
        ], 202);
    }

    public function listDsarRequests(): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $requests = ComplianceDsarRequest::where('organization_id', $orgId)->orderBy('created_at', 'desc')->get();

        return response()->json(['dsar_requests' => $requests]);
    }

    public function downloadDsar(Request $request, string $id)
    {
        if (!$request->hasValidSignature()) {
            abort(401, 'Invalid or expired download signature.');
        }

        $dsar = ComplianceDsarRequest::findOrFail($id);
        if (!$dsar->archive_path || !Storage::disk('local')->exists($dsar->archive_path)) {
            abort(404, 'Export archive not found.');
        }

        return response()->download(Storage::disk('local')->path($dsar->archive_path));
    }

    public function executeErasure(Request $request): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $validated = $request->validate([
            'user_id' => 'required|string',
        ]);

        $this->gdprService->executeErasure($orgId, $validated['user_id'], auth()->id());

        return response()->json([
            'message' => 'User identity successfully pseudonymized in compliance with GDPR Right to Erasure.',
        ]);
    }

    public function soc2Evidence(): JsonResponse
    {
        return response()->json([
            'controls' => [
                'CC6.1' => ['title' => 'MFA & Logical Access', 'status' => 'compliant', 'evidence' => 'MFA enforced with TOTP and recovery codes.'],
                'CC6.2' => ['title' => 'User Lifecycle Management', 'status' => 'compliant', 'evidence' => 'Automated JIT SSO & SCIM 2.0 provisioning.'],
                'CC6.6' => ['title' => 'Data in Transit Protection', 'status' => 'compliant', 'evidence' => 'TLS 1.3 enforced across all API routes.'],
                'CC6.7' => ['title' => 'Data at Rest Encryption', 'status' => 'compliant', 'evidence' => 'AES-256 encrypted casts on credentials and certificates.'],
                'CC7.1' => ['title' => 'Vulnerability & Malware Defense', 'status' => 'compliant', 'evidence' => 'Async ClamAV scanning on all file attachments.'],
                'CC8.1' => ['title' => 'Tamper-Evident Audit Trails', 'status' => 'compliant', 'evidence' => 'SHA-256 Merkle chain verification on audit_logs.'],
            ],
            'generated_at' => now()->toIso8601String(),
        ]);
    }
}

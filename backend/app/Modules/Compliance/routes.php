<?php

use App\Modules\Audit\Controllers\AuditVerifyController;
use App\Modules\Compliance\Controllers\ComplianceController;
use App\Modules\Compliance\Controllers\LegalHoldController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'tenant', 'email.verified'])->prefix('api/v1')->group(function () {
    // Cryptographic Audit Hash Verification
    Route::get('audit/verify', [AuditVerifyController::class, 'verify']);

    // Legal Holds & E-Discovery
    Route::get('compliance/legal-holds', [LegalHoldController::class, 'index']);
    Route::post('compliance/legal-holds', [LegalHoldController::class, 'store']);
    Route::post('compliance/legal-holds/{id}/release', [LegalHoldController::class, 'release']);
    Route::post('compliance/ediscovery/export', [LegalHoldController::class, 'exportEdiscovery']);

    // GDPR DSAR & Erasure
    Route::post('compliance/dsar/export', [ComplianceController::class, 'requestDsarExport']);
    Route::get('compliance/dsar/requests', [ComplianceController::class, 'listDsarRequests']);
    Route::post('compliance/erasure', [ComplianceController::class, 'executeErasure']);
    Route::get('compliance/soc2/evidence', [ComplianceController::class, 'soc2Evidence']);
});

// Signed URL route for DSAR downloads
Route::get('api/v1/compliance/dsar/download/{id}', [ComplianceController::class, 'downloadDsar'])
    ->name('compliance.dsar.download');

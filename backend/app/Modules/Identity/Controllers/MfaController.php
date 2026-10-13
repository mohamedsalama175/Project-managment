<?php

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Audit\Services\AuditLoggerService;
use App\Modules\Identity\Resources\UserResource;
use App\Modules\Identity\Services\MfaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MfaController extends Controller
{
    public function __construct(
        protected MfaService $mfaService,
        protected AuditLoggerService $auditLogger
    ) {}

    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $this->mfaService->generateSecret($user);

        return response()->json([
            'secret' => $data['secret'],
            'qrCodeUri' => $data['qrCodeUri'],
        ]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();
        $result = $this->mfaService->confirmAndEnable($user, $validated['code']);

        if (!$result['success']) {
            return response()->json([
                'message' => 'The provided two-factor authentication code was invalid.',
                'code' => $result['error'],
            ], 422);
        }

        $this->auditLogger->log(
            action: 'mfa.enabled',
            auditableType: User::class,
            auditableId: $user->id,
            projectId: null,
            organizationId: $user->default_organization_id,
            oldValues: ['mfa_enabled' => false],
            newValues: ['mfa_enabled' => true]
        );

        return response()->json([
            'message' => 'Two-factor authentication enabled successfully.',
            'recoveryCodes' => $result['recoveryCodes'],
            'backupCodes' => $result['backupCodes'] ?? $result['recoveryCodes'],
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        return $this->confirm($request);
    }

    public function challenge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challengeToken' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $cacheKey = "mfa_challenge:{$validated['challengeToken']}";
        $userId = cache()->get($cacheKey);

        if (!$userId) {
            return response()->json([
                'message' => 'The MFA challenge token is invalid or has expired. Please log in again.',
                'code' => 'AUTH_MFA_CHALLENGE_EXPIRED',
            ], 410);
        }

        $user = User::find($userId);
        if (!$user) {
            return response()->json([
                'message' => 'User not found.',
                'code' => 'AUTH_USER_NOT_FOUND',
            ], 404);
        }

        $valid = $this->mfaService->verify($user, $validated['code']);
        if (!$valid) {
            return response()->json([
                'message' => 'Invalid two-factor authentication code or recovery code.',
                'code' => 'AUTH_MFA_INVALID_CODE',
            ], 422);
        }

        cache()->forget($cacheKey);

        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        }

        $token = $user->createToken('deliverops_token')->plainTextToken;
        if ($user->default_organization_id) {
            setPermissionsTeamId($user->default_organization_id);
        }
        $permissions = $user->getAllPermissions()->pluck('name')->values()->toArray();

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user->load(['organizations', 'defaultOrganization'])),
            'permissions' => $permissions,
        ]);
    }

    public function disable(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'The password provided does not match your credentials.',
                'code' => 'AUTH_PASSWORD_MISMATCH',
            ], 422);
        }

        $this->mfaService->disable($user);

        $this->auditLogger->log(
            action: 'mfa.disabled',
            auditableType: User::class,
            auditableId: $user->id,
            projectId: null,
            organizationId: $user->default_organization_id,
            oldValues: ['mfa_enabled' => true],
            newValues: ['mfa_enabled' => false]
        );

        return response()->json([
            'message' => 'Two-factor authentication disabled successfully.',
        ]);
    }

    public function recoveryCodesStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $status = $this->mfaService->getRecoveryCodesStatus($user);

        return response()->json($status);
    }

    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'The password provided does not match your credentials.',
                'code' => 'AUTH_PASSWORD_MISMATCH',
            ], 422);
        }

        $plainCodes = $this->mfaService->regenerateRecoveryCodes($user);

        $this->auditLogger->log(
            action: 'mfa.recovery_codes.regenerated',
            auditableType: User::class,
            auditableId: $user->id,
            projectId: null,
            organizationId: $user->default_organization_id,
            oldValues: null,
            newValues: ['regenerated' => true]
        );

        return response()->json([
            'message' => 'Recovery codes regenerated successfully. Store these safely; they will not be shown again.',
            'recoveryCodes' => $plainCodes,
        ]);
    }
}

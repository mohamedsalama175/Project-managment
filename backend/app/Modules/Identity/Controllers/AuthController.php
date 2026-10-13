<?php

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Audit\Services\AuditLoggerService;
use App\Modules\Identity\Models\AuthEvent;
use App\Modules\Identity\Notifications\NewDeviceLoginNotification;
use App\Modules\Identity\Requests\LoginRequest;
use App\Modules\Identity\Requests\RegisterRequest;
use App\Modules\Identity\Resources\UserResource;
use App\Modules\Identity\Services\RegistrationService;
use App\Modules\Tenancy\Resources\OrganizationResource;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Self-service signup flow (Deliverable 1)
     */
    public function signup(RegisterRequest $request, RegistrationService $service): JsonResponse
    {
        return $this->register($request, $service);
    }

    /**
     * Standard registration method
     */
    public function register(RegisterRequest $request, RegistrationService $service): JsonResponse
    {
        $result = $service->registerTenantAndOwner($request->validated());

        // Authenticate immediately via Web session cookie if session is present
        if ($request->hasSession()) {
            Auth::guard('web')->login($result['user']);
            $request->session()->regenerate();
        }

        // Issue Sanctum token for API/mobile/SPA clients
        $token = $result['user']->createToken('deliverops_access_token')->plainTextToken;

        $this->logAuthEvent(
            $result['user']->id,
            $result['organization']->id,
            'signup_success',
            $request,
            ['company_name' => $result['organization']->name],
            $result['user']->email
        );

        return response()->json([
            'message' => 'Registration successful. A verification email has been dispatched.',
            'token' => $token,
            'access_token' => $token,
            'user' => new UserResource($result['user']),
            'organization' => new OrganizationResource($result['organization']),
        ], 201);
    }

    /**
     * Standard login flow with lockout, 2FA, device check, and cookie tokens (Deliverable 4)
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email = strtolower($validated['email']);
        $remember = (bool) ($validated['remember'] ?? false);

        $user = User::where('email', $email)->first();

        // 1. Account Lockout Check (15m at 5 fails, 1h at 10 fails)
        if ($user && $user->locked_until && now()->lessThan($user->locked_until)) {
            $seconds = (int) now()->diffInSeconds($user->locked_until);
            return response()->json([
                'message' => "Account locked due to consecutive failed attempts. Retry in {$seconds} seconds.",
                'code' => 'AUTH_ACCOUNT_LOCKED',
                'retry_after_seconds' => $seconds,
            ], 423);
        }

        // 2. Credential Verification
        if (!$user || !Hash::check($validated['password'], $user->password)) {
            if ($user) {
                $user->increment('failed_login_attempts');
                $fails = $user->failed_login_attempts;

                if ($fails >= 10) {
                    $user->update(['locked_until' => now()->addHour()]);
                    $this->logAuthEvent($user->id, $user->default_organization_id, 'lockout', $request, ['consecutive_failures' => $fails, 'duration' => '1_hour'], $email);
                } elseif ($fails >= 5) {
                    $user->update(['locked_until' => now()->addMinutes(15)]);
                    $this->logAuthEvent($user->id, $user->default_organization_id, 'lockout', $request, ['consecutive_failures' => $fails, 'duration' => '15_minutes'], $email);
                }

                $this->logAuthEvent($user->id, $user->default_organization_id, 'login_failed', $request, ['failed_attempts' => $fails], $email);
            } else {
                $this->logAuthEvent(null, null, 'login_failed', $request, ['reason' => 'user_not_found'], $email);
            }

            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        // 3. Status Verification
        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Your account is currently inactive or on leave.',
                'code' => 'AUTH_ACCOUNT_INACTIVE',
            ], 403);
        }

        // 4. Email Verification Check with Configurable 3-day Grace Period (Deliverable 2)
        if (!$user->hasVerifiedEmail()) {
            $graceDays = (int) config('auth.verification_grace_period_days', 3);
            $graceExpired = $user->created_at && $user->created_at->addDays($graceDays)->isPast();
            if ($graceExpired) {
                $this->logAuthEvent($user->id, $user->default_organization_id, 'login_failed', $request, ['reason' => 'email_unverified_grace_expired'], $email);
                return response()->json([
                    'message' => "Your email is unverified and your {$graceDays}-day grace period has expired. Please verify your email to continue.",
                    'code' => 'AUTH_EMAIL_UNVERIFIED',
                ], 403);
            }
        }

        // Reset failed login counter on success
        $user->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
            'last_login_ip' => $request->ip() ?: '127.0.0.1',
        ]);

        // 5. Two-Factor Authentication Gate (Deliverable 5)
        if ($user->mfa_enabled) {
            $challengeToken = Str::random(64);
            $cacheKey = "mfa_challenge:{$challengeToken}";
            cache()->put($cacheKey, $user->id, now()->addMinutes(5));

            $this->logAuthEvent($user->id, $user->default_organization_id, 'mfa_prompted', $request, [], $email);

            return response()->json([
                'message' => 'Two-factor authentication code required.',
                'code' => 'AUTH_MFA_REQUIRED',
                'challengeToken' => $challengeToken,
            ], 200);
        }

        // 6. Detect New Device & Dispatch Security Alert (Deliverable 6)
        $this->checkAndNotifyNewDevice($user, $request);

        // 7. Authenticate Web Session if Available
        if ($request->hasSession()) {
            Auth::guard('web')->login($user, $remember);
            $request->session()->regenerate();
            $this->recordSessionDeviceInfo($request->session()->getId(), $user->id, $request);
        }

        // 8. Generate Tokens (Access Token + Refresh Token Cookie)
        $tokenDurationDays = $remember ? 30 : 7;
        $accessToken = $user->createToken('deliverops_access_token', ['*'], now()->addDays($tokenDurationDays))->plainTextToken;
        $refreshToken = $user->createToken('deliverops_refresh_token', ['issue-access-token'], now()->addDays($remember ? 30 : 7))->plainTextToken;

        if ($user->default_organization_id) {
            setPermissionsTeamId($user->default_organization_id);
        }
        $permissions = $user->getAllPermissions()->pluck('name')->values()->toArray();

        $this->logAuthEvent($user->id, $user->default_organization_id, 'login_success', $request, ['remember' => $remember], $email);

        $response = response()->json([
            'token' => $accessToken,
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'user' => new UserResource($user->load(['organizations', 'defaultOrganization'])),
            'permissions' => $permissions,
        ]);

        // Return refresh token as HttpOnly cookie for SPA security
        $cookieMinutes = $tokenDurationDays * 24 * 60;
        return $response->cookie(
            'deliverops_refresh_token',
            $refreshToken,
            $cookieMinutes,
            '/',
            null,
            false,
            true, // HttpOnly
            false,
            'Lax'
        );
    }

    /**
     * Single token/session logout (Deliverable 7)
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $this->logAuthEvent($user->id, $user->default_organization_id, 'logout', $request, [], $user->email);
            if ($user->currentAccessToken()) {
                $user->currentAccessToken()->delete();
            }
        }

        if ($request->hasSession()) {
            $sessionId = $request->session()->getId();
            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->where('id', $sessionId)->delete();
            }
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ])->withoutCookie('deliverops_refresh_token');
    }

    /**
     * Revoke all tokens and active sessions (Deliverable 7)
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;

        DB::transaction(function () use ($user, $currentSessionId, $request) {
            if (Schema::hasTable('sessions')) {
                $query = DB::table('sessions')->where('user_id', $user->id);
                if ($currentSessionId) {
                    $query->where('id', '!=', $currentSessionId);
                }
                $query->delete();
            }

            $user->tokens()->delete();

            if ($request->hasSession()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            $this->logAuthEvent($user->id, $user->default_organization_id, 'session_revoked_all', $request, [], $user->email);

            app(AuditLoggerService::class)->log(
                action: 'auth.sessions.revoked_all',
                auditableType: User::class,
                auditableId: $user->id,
                projectId: null,
                organizationId: $user->default_organization_id,
                oldValues: null,
                newValues: ['revoked_by' => $user->id]
            );
        });

        return response()->json([
            'message' => 'All active sessions and tokens have been revoked.',
        ])->withoutCookie('deliverops_refresh_token');
    }

    /**
     * Get active devices and sessions (Deliverable 6)
     */
    public function getSessions(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;

        $sessions = [];
        if (Schema::hasTable('sessions')) {
            $dbSessions = DB::table('sessions')
                ->where('user_id', $user->id)
                ->orderBy('last_activity', 'desc')
                ->get();

            foreach ($dbSessions as $s) {
                $deviceInfo = $this->parseUserAgent($s->user_agent);
                $sessions[] = [
                    'id' => $s->id,
                    'ip_address' => $s->ip_address,
                    'user_agent' => $s->user_agent,
                    'device_type' => $s->device_type ?? $deviceInfo['device_type'],
                    'browser' => $s->browser ?? $deviceInfo['browser'],
                    'platform' => $s->platform ?? $deviceInfo['platform'],
                    'last_activity' => Carbon::createFromTimestamp($s->last_activity)->toIso8601String(),
                    'is_current' => ($currentSessionId !== null && $s->id === $currentSessionId),
                ];
            }
        }

        return response()->json([
            'data' => $sessions,
        ]);
    }

    /**
     * Revoke a specific session (Deliverable 6)
     */
    public function revokeSession(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (Schema::hasTable('sessions')) {
            $deleted = DB::table('sessions')
                ->where('user_id', $user->id)
                ->where('id', $id)
                ->delete();

            if ($deleted > 0) {
                $this->logAuthEvent($user->id, $user->default_organization_id, 'session_revoked', $request, ['session_id' => $id], $user->email);
            }
        }

        // Also check if personal access token matches
        $user->tokens()->where('id', $id)->delete();

        return response()->json([
            'message' => 'Session revoked successfully.',
        ]);
    }

    /**
     * Revoke all other active sessions except current (Deliverable 6)
     */
    public function revokeOtherSessions(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;

        if (Schema::hasTable('sessions')) {
            $query = DB::table('sessions')->where('user_id', $user->id);
            if ($currentSessionId) {
                $query->where('id', '!=', $currentSessionId);
            }
            $query->delete();
        }

        if ($user->currentAccessToken()) {
            $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();
        }

        $this->logAuthEvent($user->id, $user->default_organization_id, 'session_revoked_all', $request, [], $user->email);

        return response()->json([
            'message' => 'All other sessions have been revoked successfully.',
        ]);
    }

    /**
     * Profile inspection (Deliverable 8)
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['roles', 'organizations', 'defaultOrganization', 'primaryTasks', 'reviewTasks']);
        $permissions = $user->getAllPermissions()->pluck('name')->values()->toArray();

        return response()->json([
            'user' => new UserResource($user),
            'organizations' => OrganizationResource::collection($user->organizations),
            'defaultOrganization' => $user->defaultOrganization ? new OrganizationResource($user->defaultOrganization) : null,
            'permissions' => $permissions,
            'mfaEnabled' => (bool) $user->mfa_enabled,
            'workloadSummary' => [
                'activeTasksCount' => $user->primaryTasks()->whereNotIn('status', ['Completed'])->count(),
                'weeklyCapacityHours' => (float) $user->weekly_capacity_hours,
            ],
        ]);
    }

    /**
     * Profile update (Deliverable 8)
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'job_title' => ['sometimes', 'string', 'max:150'],
            'department' => ['sometimes', 'string', 'max:100'],
            'avatar_path' => ['nullable', 'string', 'max:255'],
            'avatar' => ['nullable', 'string', 'max:255'],
            'timezone' => ['nullable', 'string', 'max:50'],
            'locale' => ['nullable', 'string', 'max:10'],
            'skills' => ['nullable', 'array'],
        ]);

        if (isset($validated['avatar']) && !isset($validated['avatar_path'])) {
            $validated['avatar_path'] = $validated['avatar'];
            unset($validated['avatar']);
        }

        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => new UserResource($user->fresh()),
        ]);
    }

    /**
     * Change password (Deliverable 8)
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => [
                'required',
                'string',
                'confirmed',
                Password::min(12)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    ->uncompromised(),
            ],
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided current password does not match.'],
            ]);
        }

        $user->password = Hash::make($validated['new_password']);
        $user->must_change_password = false;
        $user->save();

        if ($user->currentAccessToken()) {
            $currentTokenId = $user->currentAccessToken()->id;
            $user->tokens()->where('id', '!=', $currentTokenId)->delete();
        }

        $this->logAuthEvent($user->id, $user->default_organization_id, 'password_change', $request, [], $user->email);

        return response()->json([
            'message' => 'Password updated successfully.',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Forgot Password - No User Enumeration (Deliverable 3)
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower($request->email);
        $user = User::where('email', $email)->first();

        if ($user) {
            $token = Str::random(64);
            $tokenHash = hash('sha256', $token);

            if (Schema::hasTable('password_reset_tokens')) {
                DB::table('password_reset_tokens')->updateOrInsert(
                    ['email' => $user->email],
                    [
                        'token' => $tokenHash,
                        'token_hash' => $tokenHash,
                        'created_at' => now(),
                        'expires_at' => now()->addMinutes(60),
                    ]
                );
            }

            $this->logAuthEvent($user->id, $user->default_organization_id, 'password_reset_requested', $request, [], $user->email);
        } else {
            $this->logAuthEvent(null, null, 'password_reset_requested', $request, ['not_found' => true], $email);
        }

        // Always return 200 without user enumeration
        return response()->json([
            'message' => 'If that email address exists in our system, a password reset link has been dispatched.',
        ]);
    }

    /**
     * Password Reset with Signed/Hashed Token and Session Invalidation (Deliverable 3)
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(12)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    ->uncompromised(),
            ],
        ]);

        $email = strtolower($request->email);
        $token = $request->token;

        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        if (!$record) {
            return response()->json([
                'message' => 'Invalid or expired password reset token.',
                'code' => 'AUTH_PASSWORD_RESET_INVALID',
            ], 422);
        }

        // Verify token hash
        $expectedHash = $record->token_hash ?? $record->token;
        $matches = hash_equals($expectedHash, hash('sha256', $token)) || hash_equals($expectedHash, $token);

        if (!$matches) {
            return response()->json([
                'message' => 'Invalid password reset token.',
                'code' => 'AUTH_PASSWORD_RESET_INVALID',
            ], 422);
        }

        // Check 60-minute expiration
        $expiresAt = $record->expires_at
            ? Carbon::parse($record->expires_at)
            : Carbon::parse($record->created_at)->addMinutes(60);

        if (now()->greaterThan($expiresAt)) {
            return response()->json([
                'message' => 'The password reset token has expired.',
                'code' => 'AUTH_PASSWORD_RESET_EXPIRED',
            ], 422);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json([
                'message' => 'User not found.',
                'code' => 'AUTH_USER_NOT_FOUND',
            ], 404);
        }

        DB::transaction(function () use ($user, $request, $email) {
            $user->password = Hash::make($request->password);
            $user->must_change_password = false;
            $user->failed_login_attempts = 0;
            $user->locked_until = null;
            $user->save();

            // Invalidate ALL sessions & tokens on password reset
            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->where('user_id', $user->id)->delete();
            }
            $user->tokens()->delete();

            DB::table('password_reset_tokens')->where('email', $email)->delete();

            $this->logAuthEvent($user->id, $user->default_organization_id, 'password_reset_completed', $request, [], $email);
        });

        return response()->json([
            'message' => 'Password reset successfully. Please log in with your new password.',
        ]);
    }

    /**
     * Email Verification via Signed URL (Deliverable 2)
     */
    public function verifyEmail(Request $request, string $id, string $hash): JsonResponse
    {
        $user = User::findOrFail($id);

        if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return response()->json([
                'message' => 'Invalid email verification link.',
                'code' => 'EMAIL_VERIFICATION_INVALID',
            ], 403);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email is already verified.',
                'code' => 'EMAIL_ALREADY_VERIFIED',
            ]);
        }

        if ($user->markEmailAsVerified()) {
            event(new \Illuminate\Auth\Events\Verified($user));
            $this->logAuthEvent($user->id, $user->default_organization_id, 'email_verified', $request, [], $user->email);
        }

        return response()->json([
            'message' => 'Email verified successfully.',
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Resend verification email (Deliverable 2)
     */
    public function resendVerification(Request $request): JsonResponse
    {
        $email = $request->input('email');
        $user = $email ? User::where('email', strtolower($email))->first() : $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'If that account exists, a verification email has been dispatched.',
            ]);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email is already verified.',
                'code' => 'EMAIL_ALREADY_VERIFIED',
            ]);
        }

        $user->sendEmailVerificationNotification();
        $this->logAuthEvent($user->id, $user->default_organization_id, 'verification_email_resent', $request, [], $user->email);

        return response()->json([
            'message' => 'A fresh verification link has been sent to your email address.',
        ]);
    }

    /**
     * Admin Auth Events Audit Trail (Deliverable 9)
     */
    public function adminAuthEvents(Request $request): JsonResponse
    {
        $query = AuthEvent::query();

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('email')) {
            $query->where('email_attempted', 'like', '%' . strtolower($request->email) . '%');
        }

        if ($request->filled('event')) {
            $eventVal = $request->event;
            $query->where(function ($q) use ($eventVal) {
                $q->where('event', $eventVal)->orWhere('event_type', $eventVal);
            });
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', Carbon::parse($request->from));
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', Carbon::parse($request->to));
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 25)));
        $events = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($events);
    }

    /**
     * Internal Auth Event Logger
     */
    protected function logAuthEvent(?string $userId, ?string $orgId, string $eventType, Request $request, array $payload = [], ?string $email = null): void
    {
        try {
            DB::table('auth_events')->insert([
                'id' => (string) Str::ulid(),
                'user_id' => $userId,
                'email_attempted' => $email ?: ($request->input('email') ? strtolower($request->input('email')) : null),
                'organization_id' => $orgId,
                'event_type' => $eventType,
                'event' => $eventType,
                'ip_address' => $request->ip() ?: '127.0.0.1',
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
                'geo_country' => $request->header('CF-IPCountry') ?: null,
                'payload' => !empty($payload) ? json_encode($payload) : null,
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Non-blocking telemetry
        }
    }

    /**
     * Check if client IP/agent has authenticated before; if not, send alert
     */
    protected function checkAndNotifyNewDevice(User $user, Request $request): void
    {
        try {
            $ip = $request->ip() ?: '127.0.0.1';
            $ua = substr((string) $request->userAgent(), 0, 255);

            $isKnown = DB::table('auth_events')
                ->where('user_id', $user->id)
                ->where('event_type', 'login_success')
                ->where(function ($q) use ($ip, $ua) {
                    $q->where('ip_address', $ip)->orWhere('user_agent', $ua);
                })
                ->exists();

            if (!$isKnown) {
                $user->notify(new NewDeviceLoginNotification($ip, $ua, now()));
            }
        } catch (\Throwable) {
            // Non-blocking notification
        }
    }

    /**
     * Record device info into sessions table
     */
    protected function recordSessionDeviceInfo(string $sessionId, string $userId, Request $request): void
    {
        if (Schema::hasTable('sessions')) {
            $uaInfo = $this->parseUserAgent($request->userAgent());
            DB::table('sessions')->where('id', $sessionId)->update([
                'device_type' => $uaInfo['device_type'],
                'browser' => $uaInfo['browser'],
                'platform' => $uaInfo['platform'],
                'last_active_at' => now(),
            ]);
        }
    }

    /**
     * Lightweight User Agent Parser
     */
    protected function parseUserAgent(?string $ua): array
    {
        if (empty($ua)) {
            return ['browser' => 'Unknown Browser', 'platform' => 'Unknown OS', 'device_type' => 'Desktop'];
        }

        $browser = 'Browser';
        if (str_contains($ua, 'Edg')) $browser = 'Edge';
        elseif (str_contains($ua, 'Chrome')) $browser = 'Chrome';
        elseif (str_contains($ua, 'Firefox')) $browser = 'Firefox';
        elseif (str_contains($ua, 'Safari')) $browser = 'Safari';
        elseif (str_contains($ua, 'Postman')) $browser = 'Postman';
        elseif (str_contains($ua, 'Curl')) $browser = 'cURL';

        $platform = 'Unknown OS';
        if (str_contains($ua, 'Windows')) $platform = 'Windows';
        elseif (str_contains($ua, 'Macintosh') || str_contains($ua, 'Mac OS')) $platform = 'macOS';
        elseif (str_contains($ua, 'Linux')) $platform = 'Linux';
        elseif (str_contains($ua, 'Android')) $platform = 'Android';
        elseif (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')) $platform = 'iOS';

        $deviceType = (str_contains($ua, 'Mobile') || str_contains($ua, 'Android') || str_contains($ua, 'iPhone'))
            ? 'Mobile'
            : 'Desktop';

        return [
            'browser' => $browser,
            'platform' => $platform,
            'device_type' => $deviceType,
        ];
    }
}

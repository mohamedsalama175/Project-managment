<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Your account is currently inactive or on leave. Please contact an administrator.',
                'code' => 'ACCOUNT_INACTIVE',
            ], 403);
        }

        $token = $user->createToken('deliverops_token')->plainTextToken;
        $permissions = $user->getAllPermissions()->pluck('name')->values()->toArray();

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user->load('roles')),
            'permissions' => $permissions,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['roles', 'primaryTasks', 'reviewTasks']);
        $permissions = $user->getAllPermissions()->pluck('name')->values()->toArray();

        return response()->json([
            'user' => new UserResource($user),
            'permissions' => $permissions,
            'workloadSummary' => [
                'activeTasksCount' => $user->primaryTasks()->whereNotIn('status', ['Completed'])->count(),
                'weeklyCapacityHours' => (float) $user->weekly_capacity_hours,
            ],
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
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

        // Revoke other tokens except current
        $currentTokenId = $user->currentAccessToken()->id;
        $user->tokens()->where('id', '!=', $currentTokenId)->delete();

        return response()->json([
            'message' => 'Password updated successfully.',
            'user' => new UserResource($user),
        ]);
    }
}

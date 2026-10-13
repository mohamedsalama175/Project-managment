<?php

namespace App\Modules\Notifications\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Notifications\Models\PushToken;
use App\Modules\Notifications\Services\PushNotificationDispatcherService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushTokenController extends Controller
{
    public function __construct(
        protected PushNotificationDispatcherService $dispatcher,
        protected TenantManager $tenantManager
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'platform' => 'required|in:ios,android,web',
            'token' => 'required|string|max:512',
            'device_name' => 'nullable|string|max:100',
        ]);

        $orgId = $this->tenantManager->getTenantId();
        $user = auth()->user();

        $token = $this->dispatcher->registerToken(
            $orgId,
            $user->id,
            $validated['platform'],
            $validated['token'],
            $validated['device_name'] ?? null
        );

        return response()->json([
            'message' => 'Push token registered successfully.',
            'push_token' => $token,
        ], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $token = PushToken::findOrFail($id);
        $this->authorize('delete', $token);

        $token->delete();

        return response()->json(['message' => 'Push token revoked successfully.']);
    }
}

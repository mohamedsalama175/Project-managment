<?php

namespace App\Modules\Notifications\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Notifications\Models\NotificationPreference;
use App\Modules\Notifications\Requests\UpdateNotificationPreferencesRequest;
use App\Modules\Notifications\Resources\NotificationPreferenceResource;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = app(TenantManager::class)->getTenantId()
            ?? $request->user()->default_organization_id;

        $preferences = NotificationPreference::where('user_id', $request->user()->id)
            ->where('organization_id', $tenantId)
            ->get();

        return response()->json([
            'data' => NotificationPreferenceResource::collection($preferences),
        ]);
    }

    public function update(UpdateNotificationPreferencesRequest $request): JsonResponse
    {
        $tenantId = app(TenantManager::class)->getTenantId()
            ?? $request->user()->default_organization_id;

        $items = $request->validated('preferences');

        foreach ($items as $item) {
            NotificationPreference::updateOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'organization_id' => $tenantId,
                    'event_type' => $item['event_type'],
                    'channel' => $item['channel'],
                ],
                [
                    'enabled' => $item['enabled'],
                    'digest_frequency' => $item['digest_frequency'] ?? 'instant',
                    'quiet_hours_start' => $item['quiet_hours_start'] ?? null,
                    'quiet_hours_end' => $item['quiet_hours_end'] ?? null,
                ]
            );
        }

        $refreshed = NotificationPreference::where('user_id', $request->user()->id)
            ->where('organization_id', $tenantId)
            ->get();

        return response()->json([
            'message' => 'Notification preferences updated successfully.',
            'data' => NotificationPreferenceResource::collection($refreshed),
        ]);
    }
}

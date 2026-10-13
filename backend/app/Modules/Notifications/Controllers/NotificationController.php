<?php

namespace App\Modules\Notifications\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Notifications\Models\Notification;
use App\Modules\Notifications\Resources\NotificationResource;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = min(50, max(5, (int) $request->query('limit', 20)));
        $unreadOnly = $request->boolean('unread_only', false);

        $query = Notification::forUser($request->user()->id);

        if ($unreadOnly) {
            $query->unread();
        }

        $notifications = $query->orderBy('created_at', 'desc')->paginate($limit);

        return response()->json([
            'data' => NotificationResource::collection($notifications),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
                'unread_count' => Notification::forUser($request->user()->id)->unread()->count(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::forUser($request->user()->id)->unread()->count();

        return response()->json([
            'unread_count' => $count,
        ]);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403, 'Notification does not belong to the authenticated user.');
        }

        if (!$notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => new NotificationResource($notification),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $updatedCount = Notification::forUser($request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'All notifications marked as read.',
            'marked_count' => $updatedCount,
        ]);
    }
}

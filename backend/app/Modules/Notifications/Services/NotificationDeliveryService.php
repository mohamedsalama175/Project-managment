<?php

namespace App\Modules\Notifications\Services;

use App\Models\User;
use App\Modules\Collaboration\Models\TaskComment;
use App\Modules\Notifications\Mail\GenericDeliverOpsNotificationMail;
use App\Modules\Notifications\Models\Notification;
use App\Modules\Notifications\Models\NotificationPreference;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class NotificationDeliveryService
{
    /**
     * Dispatch notification with atomic 60-second deduplication and quiet-hours window checking
     */
    public function dispatch(
        User $recipient,
        string $eventType,
        string $title,
        string $body,
        ?string $actionUrl = null,
        ?string $taskId = null,
        ?string $projectId = null,
        array $extraData = []
    ): void {
        // 1. Atomic 60-Second Deduplication Key: recipient:event:task
        $targetScope = $taskId ?? $projectId ?? 'global';
        $dedupKey = "notif_dedup:{$recipient->id}:{$eventType}:{$targetScope}";
        if (!Cache::add($dedupKey, true, 60)) {
            return; // Duplicate within 60s suppressed atomically
        }

        $tenantId = app(TenantManager::class)->getTenantId()
            ?? $recipient->default_organization_id;

        // 2. Fetch User Channel Preferences
        $preferences = NotificationPreference::where('user_id', $recipient->id)
            ->where('organization_id', $tenantId)
            ->where('event_type', $eventType)
            ->get()
            ->keyBy('channel');

        $inAppEnabled = $preferences->get('in_app')?->enabled ?? true;
        $emailEnabled = $preferences->get('email')?->enabled ?? true;
        $quietStart = $preferences->first()?->quiet_hours_start;
        $quietEnd = $preferences->first()?->quiet_hours_end;
        $timezone = $recipient->timezone ?? config('app.timezone', 'UTC');

        $inQuietHours = $this->isWithinQuietHours($quietStart, $quietEnd, $timezone);

        // 3. In-App Notification (Always stored if enabled; quiet hours does not suppress inbox)
        if ($inAppEnabled && $tenantId) {
            Notification::create([
                'organization_id' => $tenantId,
                'user_id' => $recipient->id,
                'type' => $eventType,
                'title' => $title,
                'body' => $body,
                'action_url' => $actionUrl,
                'event_type' => $eventType,
                'task_id' => $taskId,
                'project_id' => $projectId,
                'data' => array_merge($extraData, [
                    'title' => $title,
                    'body' => $body,
                    'action_url' => $actionUrl,
                ]),
            ]);
        }

        // 4. Email Notification (Suppressed during quiet hours)
        if ($emailEnabled && !$inQuietHours && $recipient->email) {
            try {
                Mail::to($recipient->email)->queue(
                    new GenericDeliverOpsNotificationMail(
                        notificationTitle: $title,
                        notificationBody: $body,
                        actionUrl: $actionUrl,
                        eventType: $eventType,
                        recipient: $recipient
                    )
                );
            } catch (\Throwable) {
                // Email failure non-blocking for background queue
            }
        }
    }

    public function notifyCommentCreated(TaskComment $comment, array $mentionedUserIds): void
    {
        $task = $comment->task;
        $author = $comment->user;

        // A. Mention Notifications
        foreach ($mentionedUserIds as $userId) {
            if ($userId === $author?->id) {
                continue;
            }
            $recipient = User::find($userId);
            if ($recipient) {
                $authorName = $author ? $author->name : 'A team member';
                $this->dispatch(
                    recipient: $recipient,
                    eventType: 'mention',
                    title: "{$authorName} mentioned you",
                    body: "In task \"{$task->name}\": \"" . mb_substr($comment->content, 0, 100) . '…"',
                    actionUrl: "/planner?project={$task->project_id}&task={$task->id}",
                    taskId: $task->id,
                    projectId: $task->project_id
                );
            }
        }

        // B. Watcher Notifications (Excluding author and already mentioned users)
        $watchers = $task->watchers()
            ->whereNotIn('user_id', array_merge([$author?->id], $mentionedUserIds))
            ->get();

        foreach ($watchers as $watcher) {
            if ($watcher->user) {
                $authorName = $author ? $author->name : 'A team member';
                $this->dispatch(
                    recipient: $watcher->user,
                    eventType: 'comment_watched',
                    title: 'New comment on watched task',
                    body: "{$authorName} commented on \"{$task->name}\"",
                    actionUrl: "/planner?project={$task->project_id}&task={$task->id}",
                    taskId: $task->id,
                    projectId: $task->project_id
                );
            }
        }
    }

    public function isWithinQuietHours(?string $start, ?string $end, ?string $timezone = null): bool
    {
        if (!$start || !$end) {
            return false;
        }
        $tz = $timezone ?: config('app.timezone', 'UTC');
        try {
            $now = Carbon::now($tz)->format('H:i:s');
        } catch (\Throwable) {
            $now = Carbon::now('UTC')->format('H:i:s');
        }
        if ($start <= $end) {
            return $now >= $start && $now <= $end;
        }
        // Overnight window e.g. 22:00 to 08:00
        return $now >= $start || $now <= $end;
    }
}

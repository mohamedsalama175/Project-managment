<?php

namespace App\Modules\Collaboration\Services;

use App\Models\Task;
use App\Modules\Collaboration\Models\TaskComment;
use App\Models\User;
use App\Modules\Collaboration\Services\ActivityLoggerService;
use App\Modules\Notifications\Services\NotificationDeliveryService;
use App\Modules\Tenancy\Helpers\TenantAuthHelper;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TaskCommentService
{
    public function __construct(
        protected ActivityLoggerService $activityLogger,
        protected NotificationDeliveryService $notificationPipeline,
        protected MentionParserService $mentionParser
    ) {}

    public function createComment(Task $task, User $author, string $content, ?string $parentId = null): TaskComment
    {
        $sanitizedContent = strip_tags(trim($content), '<b><strong><i><em><code><pre><a><ul><ol><li><blockquote>');
        if (empty($sanitizedContent)) {
            throw new HttpException(422, 'Comment content cannot be empty.');
        }

        // 1. Thread validation (max 1 level depth)
        if ($parentId) {
            $parent = TaskComment::where('task_id', $task->id)->findOrFail($parentId);
            if ($parent->parent_comment_id !== null) {
                $parentId = $parent->parent_comment_id;
            }
        }

        // 2. Extract & validate @[Name](ULID) mentions against project roster
        $mentionUlids = $this->mentionParser->extract($content);
        $validMentionIds = [];

        if (!empty($mentionUlids)) {
            $validMentionIds = $task->project->members()
                ->whereIn('users.id', $mentionUlids)
                ->pluck('users.id')
                ->toArray();
        }

        return DB::transaction(function () use ($task, $author, $sanitizedContent, $parentId, $validMentionIds) {
            $comment = TaskComment::create([
                'task_id' => $task->id,
                'organization_id' => $task->organization_id,
                'user_id' => $author->id,
                'parent_comment_id' => $parentId,
                'content' => $sanitizedContent,
                'mentions' => !empty($validMentionIds) ? $validMentionIds : null,
            ]);

            // 3. Auto-enroll watchers: Author
            $task->watchers()->firstOrCreate([
                'organization_id' => $task->organization_id,
                'user_id' => $author->id,
            ]);

            // Auto-enroll: Mentioned project members
            foreach ($validMentionIds as $mentionedId) {
                $task->watchers()->firstOrCreate([
                    'organization_id' => $task->organization_id,
                    'user_id' => $mentionedId,
                ]);
            }

            // MED-03: Auto-enroll Primary Owner if not already author
            if ($task->primary_owner_id && $task->primary_owner_id !== $author->id) {
                $task->watchers()->firstOrCreate([
                    'organization_id' => $task->organization_id,
                    'user_id' => $task->primary_owner_id,
                ]);
            }

            // 4. Log immutable Activity Event and compliance AuditLog
            $this->activityLogger->log([
                'organization_id' => $task->organization_id,
                'project_id' => $task->project_id,
                'task_id' => $task->id,
                'actor_id' => $author->id,
                'action' => 'comment.created',
                'metadata' => [
                    'comment_id' => $comment->id,
                    'snippet' => mb_substr(strip_tags($sanitizedContent), 0, 120),
                    'is_reply' => $parentId !== null,
                    'mentions_count' => count($validMentionIds),
                ],
            ]);

            try {
                app(\App\Modules\Audit\Services\AuditLoggerService::class)->log(
                    action: 'comment.created',
                    auditableType: TaskComment::class,
                    auditableId: $comment->id,
                    projectId: $task->project_id,
                    organizationId: $task->organization_id,
                    actor: $author,
                    reason: 'User posted a task discussion comment'
                );
            } catch (\Throwable) {
                // Non-blocking for audit fallback
            }

            // 5. Dispatch Notifications
            $this->notificationPipeline->notifyCommentCreated($comment, $validMentionIds);

            return $comment->load(['user', 'reactions.user', 'replies.user', 'replies.reactions.user']);
        });
    }

    public function updateComment(TaskComment $comment, User $author, string $content): TaskComment
    {
        $sanitizedContent = strip_tags(trim($content), '<b><strong><i><em><code><pre><a><ul><ol><li><blockquote>');
        if (empty($sanitizedContent)) {
            throw new HttpException(422, 'Comment content cannot be empty.');
        }

        $comment->update([
            'content' => $sanitizedContent,
            'edited_at' => Carbon::now(),
        ]);

        return $comment;
    }

    public function deleteComment(TaskComment $comment, User $author): void
    {
        if (!TenantAuthHelper::canManageComments($author, $comment)) {
            throw new HttpException(403, 'You do not have permission to delete this comment.');
        }

        $comment->delete();
    }
}

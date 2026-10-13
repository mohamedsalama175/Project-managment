<?php

namespace App\Modules\Collaboration\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Modules\Collaboration\Models\TaskComment;
use App\Modules\Collaboration\Requests\StoreTaskCommentRequest;
use App\Modules\Collaboration\Requests\UpdateTaskCommentRequest;
use App\Modules\Collaboration\Resources\TaskCommentResource;
use App\Modules\Collaboration\Services\TaskCommentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaskCommentController extends Controller
{
    public function __construct(
        protected TaskCommentService $commentService
    ) {}

    public function index(Request $request, Project $project, Task $task): JsonResponse
    {
        Gate::authorize('viewAny', [TaskComment::class, $task]);

        // Only fetch top-level comments; replies are loaded through relationship
        $comments = $task->comments()
            ->whereNull('parent_comment_id')
            ->withTrashed()
            ->with([
                'user',
                'reactions.user',
                'replies' => fn($q) => $q->withTrashed()->with(['user', 'reactions.user']),
            ])
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'data' => TaskCommentResource::collection($comments),
        ]);
    }

    public function store(StoreTaskCommentRequest $request, Project $project, Task $task): JsonResponse
    {
        Gate::authorize('create', [TaskComment::class, $task]);

        $comment = $this->commentService->createComment(
            task: $task,
            author: $request->user(),
            content: $request->validated('content'),
            parentId: $request->validated('parent_comment_id')
        );

        return (new TaskCommentResource($comment))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        UpdateTaskCommentRequest $request,
        Project $project,
        Task $task,
        TaskComment $comment
    ): JsonResponse {
        Gate::authorize('update', $comment);

        $updated = $this->commentService->updateComment(
            comment: $comment,
            author: $request->user(),
            content: $request->validated('content')
        );

        return (new TaskCommentResource($updated->load(['user', 'reactions.user'])))
            ->response();
    }

    public function destroy(
        Request $request,
        Project $project,
        Task $task,
        TaskComment $comment
    ): JsonResponse {
        Gate::authorize('delete', $comment);

        $this->commentService->deleteComment($comment, $request->user());

        return response()->json([
            'message' => 'Comment deleted successfully.',
        ]);
    }
}

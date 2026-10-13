<?php

namespace App\Modules\Collaboration\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Collaboration\Models\CommentReaction;
use App\Modules\Collaboration\Models\TaskComment;
use App\Modules\Collaboration\Requests\ToggleReactionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentReactionController extends Controller
{
    public function store(ToggleReactionRequest $request, TaskComment $comment): JsonResponse
    {
        $emoji = $request->validated('emoji');
        $userId = $request->user()->id;

        $existing = CommentReaction::where('comment_id', $comment->id)
            ->where('user_id', $userId)
            ->where('emoji', $emoji)
            ->first();

        if ($existing) {
            $existing->delete();
            $action = 'removed';
        } else {
            CommentReaction::create([
                'organization_id' => $comment->organization_id,
                'comment_id' => $comment->id,
                'user_id' => $userId,
                'emoji' => $emoji,
                'created_at' => now(),
            ]);
            $action = 'added';
        }

        return response()->json([
            'action' => $action,
            'reactions' => $this->formatReactions($comment),
        ]);
    }

    public function destroy(Request $request, TaskComment $comment, string $emoji): JsonResponse
    {
        $userId = $request->user()->id;

        CommentReaction::where('comment_id', $comment->id)
            ->where('user_id', $userId)
            ->where('emoji', $emoji)
            ->delete();

        return response()->json([
            'action' => 'removed',
            'reactions' => $this->formatReactions($comment),
        ]);
    }

    protected function formatReactions(TaskComment $comment): array
    {
        $reactions = CommentReaction::where('comment_id', $comment->id)->with('user')->get();
        $grouped = $reactions->groupBy('emoji');

        $result = [];
        foreach ($grouped as $emoji => $items) {
            $result[$emoji] = [
                'count' => $items->count(),
                'has_reacted' => $items->contains('user_id', auth()->id()),
                'users' => $items->map(fn($r) => $r->user?->name)->filter()->values()->take(5),
            ];
        }

        return $result;
    }
}

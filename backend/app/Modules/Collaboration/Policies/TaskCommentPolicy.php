<?php

namespace App\Modules\Collaboration\Policies;

use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Helpers\TenantAuthHelper;
use Carbon\Carbon;
use Illuminate\Auth\Access\Response;

class TaskCommentPolicy
{
    public function viewAny(User $user, Task $task): bool
    {
        if (TenantAuthHelper::isOrgOwner($user, $task->organization_id)) {
            return true;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        return $task->project->members()->where('users.id', $user->id)->exists();
    }

    public function create(User $user, Task $task): bool
    {
        if (TenantAuthHelper::isOrgOwner($user, $task->organization_id)) {
            return true;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        return $task->project->members()->where('users.id', $user->id)->exists();
    }

    public function update(User $user, $comment): Response
    {
        if ($comment->user_id !== $user->id) {
            return Response::deny('You do not have permission to edit this comment.', 403);
        }

        if ($comment->created_at->diffInMinutes(Carbon::now()) > 15) {
            return Response::deny('Comments can only be edited within 15 minutes of posting.', 422);
        }

        return Response::allow();
    }

    public function delete(User $user, $comment): bool
    {
        return TenantAuthHelper::canManageComments($user, $comment);
    }
}

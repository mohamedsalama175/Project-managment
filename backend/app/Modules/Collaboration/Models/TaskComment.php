<?php

namespace App\Modules\Collaboration\Models;

use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TaskComment extends Model
{
    use HasFactory, HasUlids, SoftDeletes, TenantScoped;

    protected $table = 'task_comments';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'mentions' => 'array',
            'edited_at' => 'datetime',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(TaskComment::class, 'parent_comment_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(TaskComment::class, 'parent_comment_id')
            ->withTrashed()
            ->orderBy('created_at', 'asc');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(CommentReaction::class, 'comment_id');
    }

    public function getIsEditedAttribute(): bool
    {
        return $this->edited_at !== null;
    }

    public function getIsTombstoneAttribute(): bool
    {
        return $this->trashed();
    }
}

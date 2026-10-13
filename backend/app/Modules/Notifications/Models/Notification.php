<?php

namespace App\Modules\Notifications\Models;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'notifications';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Notification $notification) {
            if (empty($notification->notifiable_id) && !empty($notification->user_id)) {
                $notification->notifiable_id = $notification->user_id;
            }
            if (empty($notification->notifiable_type)) {
                $notification->notifiable_type = User::class;
            }
            if (empty($notification->data)) {
                $notification->data = [];
            }
            if (empty($notification->type) && !empty($notification->event_type)) {
                $notification->type = $notification->event_type;
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }
}

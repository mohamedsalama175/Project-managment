<?php

namespace App\Modules\Integrations\Models;

use App\Models\Task;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommitLink extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'commit_links';

    protected $guarded = [];

    protected static function booted(): void
    {
        static::creating(function (CommitLink $link) {
            if (empty($link->provider)) {
                $link->provider = 'github';
            }
        });
    }

    protected function casts(): array
    {
        return [
            'committed_at' => 'datetime',
        ];
    }

    public function getCommitHashAttribute(): string
    {
        return $this->attributes['commit_sha'] ?? '';
    }

    public function setCommitHashAttribute($value): void
    {
        $this->attributes['commit_sha'] = $value;
    }

    public function getCommitMessageAttribute(): string
    {
        return $this->attributes['message'] ?? '';
    }

    public function setCommitMessageAttribute($value): void
    {
        $this->attributes['message'] = $value;
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}

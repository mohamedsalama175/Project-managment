<?php

namespace App\Modules\AI\Models;

use App\Models\User;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiActionLog extends Model
{
    use HasUlids, TenantScoped;

    public $timestamps = false;
    protected $table = 'ai_action_logs';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'previous_state' => 'array',
            'new_state' => 'array',
            'is_reverted' => 'boolean',
            'reverted_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function revertedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reverted_by_id');
    }
}

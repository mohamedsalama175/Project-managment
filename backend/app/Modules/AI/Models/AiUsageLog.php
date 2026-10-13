<?php

namespace App\Modules\AI\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUsageLog extends Model
{
    use HasUlids, TenantScoped;

    public $timestamps = false;
    protected $table = 'ai_usage_log';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'tokens_in' => 'integer',
            'tokens_out' => 'integer',
            'cost_usd' => 'float',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

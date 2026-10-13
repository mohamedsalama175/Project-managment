<?php

namespace App\Modules\Onboarding\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class OnboardingProgress extends Model
{
    protected $table = 'onboarding_progress';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'user_id',
        'flow_type',
        'current_step',
        'completed_steps',
        'skipped_steps',
        'is_completed',
        'tour_completed',
        'completed_at',
    ];

    protected $casts = [
        'current_step' => 'integer',
        'completed_steps' => 'array',
        'skipped_steps' => 'array',
        'is_completed' => 'boolean',
        'tour_completed' => 'boolean',
        'completed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
            if (!isset($model->completed_steps)) {
                $model->completed_steps = [];
            }
            if (!isset($model->skipped_steps)) {
                $model->skipped_steps = [];
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }
}

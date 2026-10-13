<?php

namespace App\Modules\Templates\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ProjectTemplate extends Model
{
    use SoftDeletes;

    protected $table = 'project_templates';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'organization_id',
        'name',
        'slug',
        'description',
        'industry',
        'category',
        'is_system',
        'version',
        'template_data',
        'created_by_id',
    ];

    protected $casts = [
        'is_system' => 'boolean',
        'version' => 'integer',
        'template_data' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });

        static::addGlobalScope('hybrid_visibility', function (Builder $builder) {
            $tenantManager = app(TenantManager::class);
            if ($tenantManager->isBypassed()) {
                return;
            }

            $tenantId = $tenantManager->getTenantId();

            if ($tenantId) {
                $builder->where(function (Builder $query) use ($tenantId) {
                    $query->where('organization_id', $tenantId)
                        ->orWhere(function (Builder $sub) {
                            $sub->whereNull('organization_id')
                                ->where('is_system', true);
                        });
                });
            } else {
                $builder->whereNull('organization_id')
                    ->where('is_system', true);
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('organization_id', $tenantId);
    }

    public function scopeSystem(Builder $query): Builder
    {
        return $query->whereNull('organization_id')->where('is_system', true);
    }
}

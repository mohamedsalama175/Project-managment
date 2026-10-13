<?php

namespace App\Modules\Integrations\Models;

use App\Models\Project;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportBatch extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'import_batches';

    protected $guarded = [];

    protected $appends = [
        'tasks_count',
        'dependencies_count',
        'errors',
    ];

    protected static function booted(): void
    {
        static::creating(function (ImportBatch $batch) {
            if (empty($batch->created_by_id) && !empty($batch->user_id)) {
                $batch->created_by_id = $batch->user_id;
            }
            if (empty($batch->created_by_id)) {
                $batch->created_by_id = auth()->id() ?? User::first()?->id;
            }
            if (empty($batch->summary)) {
                $batch->summary = [
                    'tasks_count' => 0,
                    'dependencies_count' => 0,
                    'errors' => null,
                ];
            }
        });
    }

    protected function casts(): array
    {
        return [
            'summary' => 'array',
        ];
    }

    public function getUserIdAttribute(): ?string
    {
        return $this->attributes['created_by_id'] ?? null;
    }

    public function setUserIdAttribute($value): void
    {
        $this->attributes['created_by_id'] = $value;
    }

    public function getSourceToolAttribute(): ?string
    {
        return $this->attributes['provider'] ?? null;
    }

    public function setSourceToolAttribute($value): void
    {
        $this->attributes['provider'] = $value;
    }

    public function getTasksCountAttribute(): int
    {
        return (int) ($this->summary['tasks_count'] ?? 0);
    }

    public function setTasksCountAttribute($value): void
    {
        $sum = $this->summary ?? [];
        $sum['tasks_count'] = (int) $value;
        $this->summary = $sum;
    }

    public function getDependenciesCountAttribute(): int
    {
        return (int) ($this->summary['dependencies_count'] ?? 0);
    }

    public function setDependenciesCountAttribute($value): void
    {
        $sum = $this->summary ?? [];
        $sum['dependencies_count'] = (int) $value;
        $this->summary = $sum;
    }

    public function getErrorsAttribute(): ?array
    {
        return $this->summary['errors'] ?? null;
    }

    public function setErrorsAttribute($value): void
    {
        $sum = $this->summary ?? [];
        $sum['errors'] = $value;
        $this->summary = $sum;
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}

<?php

namespace App\Modules\Resources\Models;

use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Skill extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'skills';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function userSkills(): HasMany
    {
        return $this->hasMany(UserSkill::class, 'skill_id');
    }

    public function taskSkills(): HasMany
    {
        return $this->hasMany(TaskSkill::class, 'skill_id');
    }
}

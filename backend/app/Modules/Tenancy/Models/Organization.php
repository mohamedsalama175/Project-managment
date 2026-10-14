<?php

namespace App\Modules\Tenancy\Models;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Organization extends Model
{
    use HasFactory, HasUlids, SoftDeletes;

    protected $table = 'organizations';

    protected $fillable = [
        'id',
        'name',
        'slug',
        'domain',
        'industry',
        'region',
        'plan',
        'trial_ends_at',
        'billing_email',
        'timezone',
        'default_calendar',
        'logo_path',
        'settings',
        'plan_limits',
        'status',
        'sample_project_id',
        'sample_data_opted_in',
        'sample_data_opted_in_at',
        'default_cost_rate',
        'default_billable_rate',
        'base_currency',
        'ai_monthly_budget_usd',
        'ai_settings',
    ];

    protected $casts = [
        'settings' => 'array',
        'plan_limits' => 'array',
        'ai_settings' => 'array',
        'ai_monthly_budget_usd' => 'decimal:2',
        'trial_ends_at' => 'datetime',
        'sample_data_opted_in' => 'boolean',
        'sample_data_opted_in_at' => 'datetime',
        'default_cost_rate' => 'decimal:4',
        'default_billable_rate' => 'decimal:4',
    ];

    protected $appends = [
        'has_sample_data',
    ];

    protected static function booted(): void
    {
        parent::booted();

        static::updating(function (Organization $org) {
            if ($org->isDirty('region') && $org->getOriginal('region') !== null) {
                throw new \DomainException("Organization region is immutable and cannot be changed once established.");
            }
        });
    }

    public function getHasSampleDataAttribute(): bool
    {
        return $this->sample_project_id !== null;
    }

    public function sampleProject(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Project::class, 'sample_project_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(OrganizationUser::class, 'organization_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_users', 'organization_id', 'user_id')
            ->withPivot(['id', 'is_owner', 'joined_at'])
            ->withTimestamps();
    }

    public function ownerUser(): HasOne
    {
        return $this->hasOne(OrganizationUser::class, 'organization_id')->where('is_owner', true);
    }

    public function ownerMembership(): HasOne
    {
        return $this->ownerUser();
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(OrganizationInvitation::class, 'organization_id');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'organization_id');
    }

    /**
     * Billing Plan Limits
     * free: max 3 projects, max 5 users
     * pro / starter / trial: unlimited projects (-1), unlimited users (-1)
     * enterprise: unlimited (-1), unlimited (-1) + SSO + SLA
     */
    public function maxProjects(): int
    {
        $plan = strtolower($this->plan);
        if ($plan === 'free') {
            return 3;
        }
        return -1; // Unlimited
    }

    public function maxUsers(): int
    {
        $plan = strtolower($this->plan);
        if ($plan === 'free') {
            return 5;
        }
        return -1; // Unlimited
    }

    public function canCreateProject(): bool
    {
        $max = $this->maxProjects();
        if ($max === -1) {
            return true;
        }
        return $this->projects()->count() < $max;
    }

    public function canAddUser(): bool
    {
        $max = $this->maxUsers();
        if ($max === -1) {
            return true;
        }
        return $this->users()->count() < $max;
    }
}

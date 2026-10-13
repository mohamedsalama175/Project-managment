<?php

namespace App\Models;

use App\Modules\Collaboration\Models\TaskWatcher;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasUlids, Notifiable, SoftDeletes;

    protected $guarded = [];

    protected string $guard_name = 'web';

    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'skills' => 'array',
            'weekly_capacity_hours' => 'float',
            'must_change_password' => 'boolean',
            'mfa_enabled' => 'boolean',
            'locked_until' => 'datetime',
            'mfa_confirmed_at' => 'datetime',
            'mfa_enabled_at' => 'datetime',
            'last_login_at' => 'datetime',
            'failed_login_attempts' => 'integer',
        ];
    }

    public function defaultOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'default_organization_id');
    }

    public function organization(): BelongsTo
    {
        return $this->defaultOrganization();
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_users', 'user_id', 'organization_id')
            ->withPivot(['id', 'is_owner', 'joined_at'])
            ->withTimestamps();
    }

    public function organizationUsers(): HasMany
    {
        return $this->hasMany(\App\Modules\Tenancy\Models\OrganizationUser::class, 'user_id');
    }

    public function isOwnerOf(Organization $org): bool
    {
        return \App\Modules\Tenancy\Models\OrganizationUser::where('organization_id', $org->id)
            ->where('user_id', $this->id)
            ->where('is_owner', true)
            ->exists();
    }

    public function managedProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'project_manager_id');
    }

    public function primaryTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'primary_owner_id');
    }

    public function reviewTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'reviewer_id');
    }

    public function ownedRisks(): HasMany
    {
        return $this->hasMany(ProjectRisk::class, 'owner_id');
    }

    public function contributingAllocations(): HasMany
    {
        return $this->hasMany(TaskEffortAllocation::class, 'user_id');
    }

    public function mfaSecret(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(\App\Modules\Identity\Models\MfaSecret::class, 'user_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id')->orderBy('created_at', 'desc');
    }

    public function notificationPreferences(): HasMany
    {
        return $this->hasMany(NotificationPreference::class, 'user_id');
    }

    public function watchedTasks(): HasMany
    {
        return $this->hasMany(TaskWatcher::class, 'user_id');
    }

    public function mfaBackupCodes(): HasMany
    {
        return $this->hasMany(\App\Modules\Identity\Models\MfaBackupCode::class, 'user_id');
    }

    public function authEvents(): HasMany
    {
        return $this->hasMany(\App\Modules\Identity\Models\AuthEvent::class, 'user_id');
    }

    public function timeOffRequests(): HasMany
    {
        return $this->hasMany(\App\Modules\Resources\Models\TimeOffRequest::class, 'user_id');
    }

    public function userSkills(): HasMany
    {
        return $this->hasMany(\App\Modules\Resources\Models\UserSkill::class, 'user_id');
    }

    public function skills(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            \App\Modules\Resources\Models\Skill::class,
            'user_skills',
            'user_id',
            'skill_id'
        )->withPivot(['proficiency', 'years_experience'])->withTimestamps();
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(\App\Modules\Resources\Models\TimeEntry::class, 'user_id');
    }
}

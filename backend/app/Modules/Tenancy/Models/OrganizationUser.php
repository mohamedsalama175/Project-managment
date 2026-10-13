<?php

namespace App\Modules\Tenancy\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationUser extends Model
{
    use HasUlids;

    protected $table = 'organization_users';

    protected $fillable = [
        'id',
        'organization_id',
        'user_id',
        'is_owner',
        'joined_at',
    ];

    protected $casts = [
        'is_owner' => 'boolean',
        'joined_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

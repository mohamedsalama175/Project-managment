<?php

namespace App\Modules\Compliance\Models;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LegalHold extends Model
{
    use HasUlids, TenantScoped;

    public $timestamps = false;

    protected $fillable = [
        'id',
        'organization_id',
        'entity_type',
        'entity_id',
        'reason',
        'case_number',
        'created_by_id',
        'created_at',
        'released_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'released_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}

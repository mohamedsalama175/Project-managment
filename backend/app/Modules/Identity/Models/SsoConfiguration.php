<?php

namespace App\Modules\Identity\Models;

use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SsoConfiguration extends Model
{
    use HasUlids, TenantScoped;

    protected $fillable = [
        'id',
        'organization_id',
        'provider',
        'idp_entity_id',
        'sso_url',
        'metadata_url',
        'certificate',
        'client_id',
        'client_secret',
        'attribute_mapping',
        'role_mapping',
        'domain_verification_token',
        'domain_verified_at',
        'enabled',
    ];

    protected function casts(): array
    {
        return [
            'certificate' => 'encrypted',
            'client_secret' => 'encrypted',
            'attribute_mapping' => 'array',
            'role_mapping' => 'array',
            'enabled' => 'boolean',
            'domain_verified_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}

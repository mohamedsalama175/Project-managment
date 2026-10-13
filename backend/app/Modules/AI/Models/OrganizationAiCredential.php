<?php

namespace App\Modules\AI\Models;

use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class OrganizationAiCredential extends Model
{
    use HasUlids, TenantScoped;

    protected $table = 'organization_ai_credentials';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'openai_key' => 'encrypted',
            'anthropic_key' => 'encrypted',
            'gemini_key' => 'encrypted',
        ];
    }
}

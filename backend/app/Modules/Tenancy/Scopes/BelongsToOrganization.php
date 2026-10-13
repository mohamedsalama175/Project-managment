<?php

namespace App\Modules\Tenancy\Scopes;

use App\Modules\Tenancy\Exceptions\TenantContextMissingException;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class BelongsToOrganization implements Scope
{
    public const EXCLUDED_MODELS = [
        \App\Models\User::class,
        \App\Modules\Tenancy\Models\Organization::class,
        \App\Modules\Tenancy\Models\OrganizationInvitation::class,
        \App\Modules\Tenancy\Models\OrganizationMember::class,
        \App\Modules\Tenancy\Models\OrganizationUser::class,
        \App\Modules\Templates\Models\ProjectTemplate::class,
        \App\Modules\Financials\Models\Widget::class,
        \App\Modules\Financials\Models\CurrencyRate::class,
        \App\Modules\Integrations\Models\ApiKey::class,
        \App\Modules\Integrations\Models\OAuthClient::class,
        \App\Modules\Integrations\Models\OAuthAuthCode::class,
        \App\Modules\Integrations\Models\OAuthAccessToken::class,
        \App\Modules\Integrations\Models\OAuthRefreshToken::class,
        \App\Modules\AI\Models\OrganizationAiCredential::class,
        \App\Modules\Identity\Models\SsoConfiguration::class,
        \App\Modules\Identity\Models\ScimToken::class,
        \App\Modules\Compliance\Models\LegalHold::class,
        \App\Modules\Compliance\Models\ComplianceDsarRequest::class,
    ];

    public function apply(Builder $builder, Model $model): void
    {
        // 1. Exclude system/global models
        if (in_array(get_class($model), static::EXCLUDED_MODELS, true)) {
            return;
        }

        $tenantManager = app(TenantManager::class);

        // 2. Allow administrative / background bypass
        if ($tenantManager->isBypassed()) {
            return;
        }

        $tenantId = $tenantManager->getTenantId();

        // 3. Fail-closed: throw exception when tenant context is absent
        if (!$tenantId) {
            throw new TenantContextMissingException(
                "Tenant context is missing for scoped model [" . get_class($model) . "]."
            );
        }

        $builder->where($model->getTable() . '.organization_id', $tenantId);
    }
}

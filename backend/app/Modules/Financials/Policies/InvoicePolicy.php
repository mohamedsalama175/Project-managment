<?php

namespace App\Modules\Financials\Policies;

use App\Models\User;
use App\Modules\Financials\Models\Invoice;
use App\Modules\Tenancy\Services\TenantManager;

class InvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('invoices.view');
    }

    public function view(User $user, Invoice $invoice): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($invoice->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('invoices.view');
    }

    public function create(User $user): bool
    {
        return $user->can('invoices.manage');
    }

    public function update(User $user, Invoice $invoice): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($invoice->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('invoices.manage');
    }

    public function delete(User $user, Invoice $invoice): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($invoice->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('invoices.manage');
    }

    public function send(User $user, Invoice $invoice): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($invoice->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('invoices.manage');
    }

    public function markPaid(User $user, Invoice $invoice): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($invoice->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('invoices.manage');
    }

    public function void(User $user, Invoice $invoice): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($invoice->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('invoices.manage');
    }
}

<?php

namespace App\Modules\Financials\Policies;

use App\Models\User;
use App\Modules\Financials\Models\Expense;
use App\Modules\Tenancy\Services\TenantManager;

class ExpensePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('expenses.view') || $user->can('expenses.create');
    }

    public function view(User $user, Expense $expense): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($expense->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('expenses.view') || $expense->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->can('expenses.create');
    }

    public function update(User $user, Expense $expense): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($expense->organization_id !== $tenantId) {
            return false;
        }

        return $expense->user_id === $user->id || $user->hasRole('admin');
    }

    public function delete(User $user, Expense $expense): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($expense->organization_id !== $tenantId) {
            return false;
        }

        return $expense->user_id === $user->id || $user->hasRole('admin');
    }

    public function approve(User $user, Expense $expense): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($expense->organization_id !== $tenantId) {
            return false;
        }

        // Anti-self-approval rule: claimant cannot approve their own expense
        if ($expense->user_id === $user->id) {
            return false;
        }

        return $user->can('expenses.approve');
    }

    public function reimburse(User $user, Expense $expense): bool
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        if ($expense->organization_id !== $tenantId) {
            return false;
        }

        return $user->can('expenses.reimburse') && $expense->status === 'approved';
    }
}

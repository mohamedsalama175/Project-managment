<?php

namespace App\Modules\Financials\Services;

use App\Models\Project;
use App\Models\User;
use App\Modules\Financials\Models\Expense;
use App\Modules\Financials\Models\ProjectCostSnapshot;
use App\Modules\Financials\Models\UserRateHistory;
use App\Modules\Resources\Models\TimeEntry;
use App\Modules\Tenancy\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CostCalculationService
{
    public function __construct(
        protected CurrencyConversionService $currencyService
    ) {}

    /**
     * Resolve effective cost and billable rate for a user at a specific date.
     */
    public function resolveUserRates(string $userId, string $organizationId, ?string $projectId = null, ?string $date = null): array
    {
        $date = $date ? Carbon::parse($date)->toDateString() : Carbon::today()->toDateString();

        // 1. Project-specific user rate history
        if ($projectId) {
            $projectHist = UserRateHistory::where('organization_id', $organizationId)
                ->where('user_id', $userId)
                ->where('project_id', $projectId)
                ->where('effective_from', '<=', $date)
                ->where(function ($q) use ($date) {
                    $q->whereNull('effective_to')->orWhere('effective_to', '>=', $date);
                })
                ->orderByDesc('effective_from')
                ->first();

            if ($projectHist) {
                return [
                    'cost_rate' => (float) $projectHist->cost_rate,
                    'billable_rate' => (float) $projectHist->billable_rate,
                    'currency' => $projectHist->currency ?? 'USD',
                    'source' => 'project_rate_history',
                ];
            }
        }

        // 2. Global user rate history
        $globalHist = UserRateHistory::where('organization_id', $organizationId)
            ->where('user_id', $userId)
            ->whereNull('project_id')
            ->where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')->orWhere('effective_to', '>=', $date);
            })
            ->orderByDesc('effective_from')
            ->first();

        if ($globalHist) {
            return [
                'cost_rate' => (float) $globalHist->cost_rate,
                'billable_rate' => (float) $globalHist->billable_rate,
                'currency' => $globalHist->currency ?? 'USD',
                'source' => 'global_rate_history',
            ];
        }

        // 3. Project user pivot
        if ($projectId) {
            $pivot = DB::table('project_users')
                ->where('organization_id', $organizationId)
                ->where('project_id', $projectId)
                ->where('user_id', $userId)
                ->first();

            if ($pivot && ((float) ($pivot->cost_rate ?? 0) > 0 || (float) ($pivot->billable_rate ?? 0) > 0)) {
                return [
                    'cost_rate' => (float) ($pivot->cost_rate ?? 0.0),
                    'billable_rate' => (float) ($pivot->billable_rate ?? 0.0),
                    'currency' => $pivot->billable_currency ?? 'USD',
                    'source' => 'project_user_pivot',
                ];
            }
        }

        // 4. Organization defaults
        $org = Organization::find($organizationId);
        return [
            'cost_rate' => (float) ($org?->default_cost_rate ?? 0.0),
            'billable_rate' => (float) ($org?->default_billable_rate ?? 0.0),
            'currency' => $org?->base_currency ?? 'USD',
            'source' => 'organization_default',
        ];
    }

    /**
     * Compute costs for a single time entry.
     */
    public function computeTimeEntryCost(TimeEntry $entry): array
    {
        $rates = $this->resolveUserRates(
            $entry->user_id,
            $entry->organization_id,
            $entry->project_id,
            $entry->date?->toDateString()
        );

        $hours = (float) $entry->hours;
        $cost = round($hours * $rates['cost_rate'], 4);
        $billableAmount = $entry->billable ? round($hours * $rates['billable_rate'], 4) : 0.0;

        return [
            'hours' => $hours,
            'cost_rate' => $rates['cost_rate'],
            'billable_rate' => $rates['billable_rate'],
            'currency' => $rates['currency'],
            'cost' => $cost,
            'billable_amount' => $billableAmount,
        ];
    }

    /**
     * Calculate comprehensive costs for a project within an optional date range.
     */
    public function calculateProjectCosts(Project $project, ?string $from = null, ?string $to = null): array
    {
        $query = TimeEntry::with(['user', 'task'])
            ->where('project_id', $project->id)
            ->whereNotNull('approved_at'); // Costs count approved time entries

        if ($from) {
            $query->where('date', '>=', $from);
        }
        if ($to) {
            $query->where('date', '<=', $to);
        }

        $timeEntries = $query->get();

        $totalHours = 0.0;
        $laborCost = 0.0;
        $billableAmount = 0.0;

        $byUser = [];
        $byTask = [];
        $byWeek = [];
        $calculatedEntries = [];

        $projectCurrency = $project->budget_currency ?? 'USD';

        foreach ($timeEntries as $entry) {
            $calc = $this->computeTimeEntryCost($entry);

            // Convert if rates are in different currency
            $entryCost = $this->currencyService->convert($calc['cost'], $calc['currency'], $projectCurrency, $entry->date?->toDateString());
            $entryBillable = $this->currencyService->convert($calc['billable_amount'], $calc['currency'], $projectCurrency, $entry->date?->toDateString());

            $totalHours += $calc['hours'];
            $laborCost += $entryCost;
            $billableAmount += $entryBillable;

            // Group by User
            $uid = $entry->user_id;
            if (!isset($byUser[$uid])) {
                $byUser[$uid] = [
                    'user_id' => $uid,
                    'name' => $entry->user?->name ?? 'Unknown',
                    'hours' => 0.0,
                    'cost' => 0.0,
                    'billable_amount' => 0.0,
                ];
            }
            $byUser[$uid]['hours'] += $calc['hours'];
            $byUser[$uid]['cost'] += $entryCost;
            $byUser[$uid]['billable_amount'] += $entryBillable;

            // Group by Task
            $tid = $entry->task_id ?? 'general';
            $tname = $entry->task?->name ?? 'General Work';
            if (!isset($byTask[$tid])) {
                $byTask[$tid] = [
                    'task_id' => $tid,
                    'name' => $tname,
                    'hours' => 0.0,
                    'cost' => 0.0,
                    'billable_amount' => 0.0,
                ];
            }
            $byTask[$tid]['hours'] += $calc['hours'];
            $byTask[$tid]['cost'] += $entryCost;
            $byTask[$tid]['billable_amount'] += $entryBillable;

            // Group by Week
            $carbonDate = Carbon::parse($entry->date);
            $weekKey = $carbonDate->isoFormat('YYYY-[W]WW');
            if (!isset($byWeek[$weekKey])) {
                $byWeek[$weekKey] = [
                    'week' => $weekKey,
                    'start_date' => $carbonDate->startOfWeek()->toDateString(),
                    'hours' => 0.0,
                    'cost' => 0.0,
                    'billable_amount' => 0.0,
                ];
            }
            $byWeek[$weekKey]['hours'] += $calc['hours'];
            $byWeek[$weekKey]['cost'] += $entryCost;
            $byWeek[$weekKey]['billable_amount'] += $entryBillable;

            $calculatedEntries[] = [
                'id' => $entry->id,
                'date' => $entry->date?->toDateString(),
                'user' => [
                    'id' => $entry->user_id,
                    'name' => $entry->user?->name,
                ],
                'task' => [
                    'id' => $entry->task_id,
                    'name' => $entry->task?->name,
                ],
                'hours' => $calc['hours'],
                'cost_rate' => $calc['cost_rate'],
                'billable_rate' => $calc['billable_rate'],
                'cost' => $entryCost,
                'billable_amount' => $entryBillable,
                'billable' => $entry->billable,
            ];
        }

        // Expenses
        $expenseQuery = Expense::where('project_id', $project->id)
            ->where('status', 'approved');

        if ($from) {
            $expenseQuery->where('expense_date', '>=', $from);
        }
        if ($to) {
            $expenseQuery->where('expense_date', '<=', $to);
        }

        $expenses = $expenseQuery->get();
        $expenseCost = 0.0;
        foreach ($expenses as $expense) {
            $convAmount = $this->currencyService->convert((float) $expense->amount, $expense->currency, $projectCurrency, $expense->expense_date);
            $expenseCost += $convAmount;
            if ($expense->billable) {
                $billableAmount += $convAmount;
            }
        }

        $totalCost = $laborCost + $expenseCost;

        return [
            'summary' => [
                'total_hours' => round($totalHours, 2),
                'labor_cost' => round($laborCost, 2),
                'expense_cost' => round($expenseCost, 2),
                'total_cost' => round($totalCost, 2),
                'billable_amount' => round($billableAmount, 2),
                'currency' => $projectCurrency,
            ],
            'by_user' => array_values(array_map(function ($u) {
                $u['hours'] = round($u['hours'], 2);
                $u['cost'] = round($u['cost'], 2);
                $u['billable_amount'] = round($u['billable_amount'], 2);
                return $u;
            }, $byUser)),
            'by_task' => array_values(array_map(function ($t) {
                $t['hours'] = round($t['hours'], 2);
                $t['cost'] = round($t['cost'], 2);
                $t['billable_amount'] = round($t['billable_amount'], 2);
                return $t;
            }, $byTask)),
            'by_week' => array_values(array_map(function ($w) {
                $w['hours'] = round($w['hours'], 2);
                $w['cost'] = round($w['cost'], 2);
                $w['billable_amount'] = round($w['billable_amount'], 2);
                return $w;
            }, $byWeek)),
            'entries' => $calculatedEntries,
        ];
    }

    /**
     * Create or update a project cost snapshot.
     */
    public function createCostSnapshot(Project $project, ?string $snapshotDate = null): ProjectCostSnapshot
    {
        $snapshotDate = $snapshotDate ? Carbon::parse($snapshotDate)->toDateString() : Carbon::today()->toDateString();
        $costs = $this->calculateProjectCosts($project, null, $snapshotDate);

        return ProjectCostSnapshot::updateOrCreate(
            [
                'organization_id' => $project->organization_id,
                'project_id' => $project->id,
                'snapshot_date' => $snapshotDate,
            ],
            [
                'id' => (string) Str::ulid(),
                'labor_cost' => $costs['summary']['labor_cost'],
                'expense_cost' => $costs['summary']['expense_cost'],
                'total_cost' => $costs['summary']['total_cost'],
                'billable_amount' => $costs['summary']['billable_amount'],
                'hours_logged' => $costs['summary']['total_hours'],
                'currency' => $costs['summary']['currency'],
                'details' => [
                    'by_user' => $costs['by_user'],
                    'by_task' => $costs['by_task'],
                ],
            ]
        );
    }
}

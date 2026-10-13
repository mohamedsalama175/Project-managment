<?php

namespace App\Modules\Financials\Services;

use App\Models\Project;
use App\Models\User;
use App\Modules\Financials\Models\Expense;
use App\Modules\Financials\Models\Invoice;
use App\Modules\Resources\Models\TimeEntry;
use App\Modules\Tenancy\Services\TenantManager;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportGeneratorService
{
    public function __construct(
        protected CostCalculationService $costService,
        protected EvmCalculationService $evmService
    ) {}

    /**
     * Get the catalog of supported reports.
     */
    public function getCatalog(): array
    {
        return [
            [
                'type' => 'project_budget',
                'name' => 'Project Budget Report',
                'description' => 'Budget breakdown, budget revision history, and variance analysis.',
                'parameters' => [
                    'project_id' => ['type' => 'string', 'required' => true],
                ],
                'formats' => ['json', 'markdown', 'csv', 'pdf'],
            ],
            [
                'type' => 'project_costs',
                'name' => 'Project Cost Breakdown',
                'description' => 'Labor and expense costs categorized by user, task, and week.',
                'parameters' => [
                    'project_id' => ['type' => 'string', 'required' => true],
                    'from' => ['type' => 'date', 'required' => false],
                    'to' => ['type' => 'date', 'required' => false],
                ],
                'formats' => ['json', 'markdown', 'csv', 'pdf'],
            ],
            [
                'type' => 'evm_summary',
                'name' => 'Earned Value Management (EVM)',
                'description' => 'Complete EVM matrix including PV, EV, AC, CPI, SPI, EAC, and TCPI.',
                'parameters' => [
                    'project_id' => ['type' => 'string', 'required' => true],
                    'status_date' => ['type' => 'date', 'required' => false],
                ],
                'formats' => ['json', 'markdown', 'csv', 'pdf'],
            ],
            [
                'type' => 'expense_summary',
                'name' => 'Expense Claims Summary',
                'description' => 'Detailed expense claims grouped by category, billing status, and approval.',
                'parameters' => [
                    'project_id' => ['type' => 'string', 'required' => false],
                    'from' => ['type' => 'date', 'required' => false],
                    'to' => ['type' => 'date', 'required' => false],
                ],
                'formats' => ['json', 'markdown', 'csv', 'pdf'],
            ],
            [
                'type' => 'invoice_aging',
                'name' => 'Invoice Aging & Accounts Receivable',
                'description' => 'Status breakdown of customer invoices, aging buckets, and outstanding balances.',
                'parameters' => [
                    'status' => ['type' => 'string', 'required' => false],
                ],
                'formats' => ['json', 'markdown', 'csv', 'pdf'],
            ],
            [
                'type' => 'resource_utilization',
                'name' => 'Resource Utilization',
                'description' => 'Team hours logged, billable utilization percentages, and cost contribution.',
                'parameters' => [
                    'from' => ['type' => 'date', 'required' => false],
                    'to' => ['type' => 'date', 'required' => false],
                ],
                'formats' => ['json', 'markdown', 'csv', 'pdf'],
            ],
            [
                'type' => 'timesheet_summary',
                'name' => 'Timesheet Summary',
                'description' => 'Approved and pending timesheet hours grouped by employee and project.',
                'parameters' => [
                    'from' => ['type' => 'date', 'required' => false],
                    'to' => ['type' => 'date', 'required' => false],
                ],
                'formats' => ['json', 'markdown', 'csv', 'pdf'],
            ],
            [
                'type' => 'project_profitability',
                'name' => 'Project Profitability',
                'description' => 'Billed revenue vs incurred costs, gross margin, and profit percentages.',
                'parameters' => [
                    'project_id' => ['type' => 'string', 'required' => true],
                ],
                'formats' => ['json', 'markdown', 'csv', 'pdf'],
            ],
        ];
    }

    /**
     * Generate report data and formatted output.
     */
    public function generate(string $reportType, array $parameters, string $format = 'json'): array
    {
        $data = $this->collectData($reportType, $parameters);

        $output = match ($format) {
            'csv' => $this->formatCsv($reportType, $data),
            'markdown' => $this->formatMarkdown($reportType, $data),
            'pdf' => $this->formatPdf($reportType, $data),
            default => $data,
        };

        return [
            'report_type' => $reportType,
            'format' => $format,
            'generated_at' => Carbon::now()->toIso8601String(),
            'data' => $format === 'json' ? $output : null,
            'content' => $format !== 'json' ? $output : null,
        ];
    }

    protected function collectData(string $reportType, array $parameters): array
    {
        $tenantId = app(TenantManager::class)->getTenantId();

        return match ($reportType) {
            'project_budget' => $this->getProjectBudgetData($parameters['project_id'] ?? null),
            'project_costs' => $this->getProjectCostsData($parameters['project_id'] ?? null, $parameters['from'] ?? null, $parameters['to'] ?? null),
            'evm_summary' => $this->getEvmData($parameters['project_id'] ?? null, $parameters['status_date'] ?? null),
            'expense_summary' => $this->getExpenseData($parameters['project_id'] ?? null, $parameters['from'] ?? null, $parameters['to'] ?? null),
            'invoice_aging' => $this->getInvoiceAgingData($parameters['status'] ?? null),
            'resource_utilization' => $this->getResourceUtilizationData($parameters['from'] ?? null, $parameters['to'] ?? null),
            'timesheet_summary' => $this->getTimesheetData($parameters['from'] ?? null, $parameters['to'] ?? null),
            'project_profitability' => $this->getProfitabilityData($parameters['project_id'] ?? null),
            default => throw new \InvalidArgumentException("Unsupported report type: {$reportType}"),
        };
    }

    protected function getProjectBudgetData(?string $projectId): array
    {
        $project = Project::with('budgetRevisions.user')->findOrFail($projectId);
        $costs = $this->costService->calculateProjectCosts($project);

        return [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'budget_amount' => (float) $project->budget_amount,
                'budget_currency' => $project->budget_currency,
                'budget_type' => $project->budget_type,
            ],
            'actual_cost' => $costs['summary']['total_cost'],
            'variance' => round((float) $project->budget_amount - $costs['summary']['total_cost'], 2),
            'revisions' => $project->budgetRevisions->map(fn($r) => [
                'date' => $r->created_at?->toIso8601String(),
                'user' => $r->user?->name,
                'previous' => (float) $r->previous_budget,
                'new' => (float) $r->new_budget,
                'reason' => $r->reason,
            ])->toArray(),
        ];
    }

    protected function getProjectCostsData(?string $projectId, ?string $from, ?string $to): array
    {
        $project = Project::findOrFail($projectId);
        return $this->costService->calculateProjectCosts($project, $from, $to);
    }

    protected function getEvmData(?string $projectId, ?string $statusDate): array
    {
        $project = Project::findOrFail($projectId);
        return $this->evmService->calculate($project, $statusDate);
    }

    protected function getExpenseData(?string $projectId, ?string $from, ?string $to): array
    {
        $query = Expense::with(['user', 'project']);
        if ($projectId) {
            $query->where('project_id', $projectId);
        }
        if ($from) {
            $query->where('expense_date', '>=', $from);
        }
        if ($to) {
            $query->where('expense_date', '<=', $to);
        }

        $expenses = $query->orderByDesc('expense_date')->get();
        $totalAmount = $expenses->sum('amount');

        return [
            'count' => $expenses->count(),
            'total_amount' => round($totalAmount, 2),
            'items' => $expenses->map(fn($e) => [
                'id' => $e->id,
                'date' => $e->expense_date,
                'category' => $e->category,
                'title' => $e->title,
                'amount' => (float) $e->amount,
                'currency' => $e->currency,
                'status' => $e->status,
                'user' => $e->user?->name,
            ])->toArray(),
        ];
    }

    protected function getInvoiceAgingData(?string $status): array
    {
        $query = Invoice::with('project');
        if ($status) {
            $query->where('status', $status);
        }

        $invoices = $query->orderBy('due_date')->get();

        $agingBuckets = [
            'current' => 0.0,
            '1_30' => 0.0,
            '31_60' => 0.0,
            '61_90' => 0.0,
            'over_90' => 0.0,
        ];

        $today = Carbon::today();

        foreach ($invoices as $inv) {
            if ($inv->status === 'paid' || $inv->status === 'void') {
                continue;
            }
            $due = Carbon::parse($inv->due_date);
            $amount = (float) $inv->total_amount;

            if ($due->isFuture() || $due->isToday()) {
                $agingBuckets['current'] += $amount;
            } else {
                $daysOverdue = $due->diffInDays($today);
                if ($daysOverdue <= 30) {
                    $agingBuckets['1_30'] += $amount;
                } elseif ($daysOverdue <= 60) {
                    $agingBuckets['31_60'] += $amount;
                } elseif ($daysOverdue <= 90) {
                    $agingBuckets['61_90'] += $amount;
                } else {
                    $agingBuckets['over_90'] += $amount;
                }
            }
        }

        return [
            'total_invoices' => $invoices->count(),
            'aging_summary' => $agingBuckets,
            'invoices' => $invoices->map(fn($i) => [
                'id' => $i->id,
                'invoice_number' => $i->invoice_number,
                'client_name' => $i->client_name,
                'status' => $i->status,
                'due_date' => $i->due_date,
                'total_amount' => (float) $i->total_amount,
            ])->toArray(),
        ];
    }

    protected function getResourceUtilizationData(?string $from, ?string $to): array
    {
        $query = TimeEntry::with('user');
        if ($from) $query->where('date', '>=', $from);
        if ($to) $query->where('date', '<=', $to);

        $entries = $query->get();
        $userSummary = [];

        foreach ($entries as $e) {
            $uid = $e->user_id;
            if (!isset($userSummary[$uid])) {
                $userSummary[$uid] = [
                    'user_id' => $uid,
                    'name' => $e->user?->name ?? 'User',
                    'total_hours' => 0.0,
                    'billable_hours' => 0.0,
                ];
            }
            $hours = (float) $e->hours;
            $userSummary[$uid]['total_hours'] += $hours;
            if ($e->billable) {
                $userSummary[$uid]['billable_hours'] += $hours;
            }
        }

        return [
            'users' => array_values(array_map(function ($u) {
                $u['utilization_rate'] = $u['total_hours'] > 0 ? round(($u['billable_hours'] / $u['total_hours']) * 100, 2) : 0;
                return $u;
            }, $userSummary)),
        ];
    }

    protected function getTimesheetData(?string $from, ?string $to): array
    {
        $query = TimeEntry::with(['user', 'project']);
        if ($from) $query->where('date', '>=', $from);
        if ($to) $query->where('date', '<=', $to);

        $entries = $query->orderByDesc('date')->get();

        return [
            'total_hours' => round($entries->sum('hours'), 2),
            'entries' => $entries->map(fn($e) => [
                'id' => $e->id,
                'date' => $e->date?->toDateString(),
                'user' => $e->user?->name,
                'project' => $e->project?->name,
                'hours' => (float) $e->hours,
                'billable' => $e->billable,
                'status' => $e->status,
            ])->toArray(),
        ];
    }

    protected function getProfitabilityData(?string $projectId): array
    {
        $project = Project::findOrFail($projectId);
        $costs = $this->costService->calculateProjectCosts($project);

        $invoicedAmount = Invoice::where('project_id', $project->id)
            ->whereIn('status', ['sent', 'paid'])
            ->sum('total_amount');

        $totalCost = $costs['summary']['total_cost'];
        $grossMargin = round((float) $invoicedAmount - $totalCost, 2);
        $marginPercent = (float) $invoicedAmount > 0 ? round(($grossMargin / (float) $invoicedAmount) * 100, 2) : 0.0;

        return [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'total_invoiced' => round((float) $invoicedAmount, 2),
            'total_incurred_cost' => round($totalCost, 2),
            'gross_margin' => $grossMargin,
            'margin_percentage' => $marginPercent,
            'currency' => $project->budget_currency ?? 'USD',
        ];
    }

    protected function formatMarkdown(string $type, array $data): string
    {
        return "# DeliverOps Financial Report: " . ucwords(str_replace('_', ' ', $type)) . "\n\n"
            . "Generated: " . Carbon::now()->toFormattedDateString() . "\n\n"
            . "```json\n" . json_encode($data, JSON_PRETTY_PRINT) . "\n```\n";
    }

    protected function formatCsv(string $type, array $data): string
    {
        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, ['Key', 'Value']);
        foreach ($data as $k => $v) {
            fputcsv($handle, [$k, is_array($v) ? json_encode($v) : $v]);
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);
        return $csv;
    }

    protected function formatPdf(string $type, array $data): string
    {
        $title = ucwords(str_replace('_', ' ', $type));
        $date = Carbon::now()->toFormattedDateString();
        $json = htmlspecialchars(json_encode($data, JSON_PRETTY_PRINT));

        $html = "<html><head><style>body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; }</style></head><body>"
            . "<h1>DeliverOps - {$title}</h1>"
            . "<p>Report generated on: {$date}</p>"
            . "<pre style='background:#f4f4f4;padding:10px;'>{$json}</pre>"
            . "</body></html>";

        return Pdf::loadHTML($html)->output();
    }
}

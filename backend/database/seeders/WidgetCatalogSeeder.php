<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WidgetCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $widgets = [
            [
                'key' => 'evm_summary',
                'name' => 'Earned Value Summary',
                'description' => 'Displays PV, EV, AC, and CPI/SPI performance indices',
                'category' => 'evm',
                'default_width' => 6,
                'default_height' => 4,
                'is_system' => true,
            ],
            [
                'key' => 'budget_vs_actual',
                'name' => 'Budget vs Actual',
                'description' => 'Comparison bar chart of budgeted versus actual incurred costs',
                'category' => 'financial',
                'default_width' => 6,
                'default_height' => 4,
                'is_system' => true,
            ],
            [
                'key' => 'burn_rate_chart',
                'name' => 'Cost Burn Rate & Forecast',
                'description' => 'Historical weekly burn rate and projected completion date',
                'category' => 'forecasting',
                'default_width' => 8,
                'default_height' => 4,
                'is_system' => true,
            ],
            [
                'key' => 'project_health',
                'name' => 'Project Health Overview',
                'description' => 'High-level status, schedule variance, and cost variance summary',
                'category' => 'project',
                'default_width' => 4,
                'default_height' => 3,
                'is_system' => true,
            ],
            [
                'key' => 'pending_expenses',
                'name' => 'Pending Expense Approvals',
                'description' => 'Actionable list of submitted expense claims pending review',
                'category' => 'expenses',
                'default_width' => 6,
                'default_height' => 4,
                'is_system' => true,
            ],
            [
                'key' => 'invoice_status',
                'name' => 'Invoice Aging & Status',
                'description' => 'Breakdown of draft, sent, paid, and overdue invoices',
                'category' => 'invoicing',
                'default_width' => 6,
                'default_height' => 4,
                'is_system' => true,
            ],
            [
                'key' => 'hours_by_role',
                'name' => 'Hours by Project Role',
                'description' => 'Resource utilization breakdown grouped by project role',
                'category' => 'resources',
                'default_width' => 6,
                'default_height' => 4,
                'is_system' => true,
            ],
            [
                'key' => 'task_progress_distribution',
                'name' => 'Task Progress Distribution',
                'description' => 'Breakdown of tasks across completion status categories',
                'category' => 'tasks',
                'default_width' => 4,
                'default_height' => 3,
                'is_system' => true,
            ],
        ];

        foreach ($widgets as $widget) {
            $existing = DB::table('widgets')->where('key', $widget['key'])->first();
            if (!$existing) {
                DB::table('widgets')->insert(array_merge($widget, [
                    'id' => (string) Str::ulid(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }
    }
}

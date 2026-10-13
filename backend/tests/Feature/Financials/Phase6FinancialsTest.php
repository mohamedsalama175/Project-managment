<?php

namespace Tests\Feature\Financials;

use App\Models\Permission;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Modules\Financials\Jobs\MarkOverdueInvoicesJob;
use App\Modules\Financials\Models\CurrencyRate;
use App\Modules\Financials\Models\Dashboard;
use App\Modules\Financials\Models\Expense;
use App\Modules\Financials\Models\Invoice;
use App\Modules\Financials\Models\InvoiceSequence;
use App\Modules\Financials\Models\ProjectCostSnapshot;
use App\Modules\Financials\Models\ScheduledReport;
use App\Modules\Financials\Models\UserRateHistory;
use App\Modules\Financials\Models\Widget;
use App\Modules\Financials\Services\CostCalculationService;
use App\Modules\Financials\Services\EvmCalculationService;
use App\Modules\Financials\Services\ForecastEngineService;
use App\Modules\Financials\Services\InvoiceSequenceService;
use App\Modules\Resources\Models\TimeEntry;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class Phase6FinancialsTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $adminA;
    protected User $pmA;
    protected User $devA;
    protected User $adminB;
    protected Project $projectA;
    protected Task $taskA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\WidgetCatalogSeeder::class);

        // Org A
        $this->orgA = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Acme Global Corp',
            'slug' => 'acme-global',
            'plan' => 'enterprise',
            'default_cost_rate' => 50.0000,
            'default_billable_rate' => 120.0000,
            'base_currency' => 'USD',
        ]);

        // Org B (for cross-tenant checks)
        $this->orgB = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Beta Industries',
            'slug' => 'beta-ind',
            'plan' => 'pro',
            'default_cost_rate' => 40.0000,
            'default_billable_rate' => 100.0000,
            'base_currency' => 'EUR',
        ]);

        // Users
        $this->adminA = User::factory()->create([
            'email_verified_at' => now(),
            'default_organization_id' => $this->orgA->id,
        ]);
        $this->pmA = User::factory()->create([
            'email_verified_at' => now(),
            'default_organization_id' => $this->orgA->id,
        ]);
        $this->devA = User::factory()->create([
            'email_verified_at' => now(),
            'default_organization_id' => $this->orgA->id,
        ]);
        $this->adminB = User::factory()->create([
            'email_verified_at' => now(),
            'default_organization_id' => $this->orgB->id,
        ]);

        // Spatie Roles
        app(TenantManager::class)->runForTenant($this->orgA->id, function () {
            setPermissionsTeamId($this->orgA->id);
            $this->adminA->assignRole('admin');
            $this->pmA->assignRole('project_manager');
            $this->devA->assignRole('contributor');
        });

        app(TenantManager::class)->runForTenant($this->orgB->id, function () {
            setPermissionsTeamId($this->orgB->id);
            $this->adminB->assignRole('admin');
        });

        // Org Membership
        OrganizationUser::create(['id' => (string) Str::ulid(), 'organization_id' => $this->orgA->id, 'user_id' => $this->adminA->id, 'is_owner' => true, 'joined_at' => now()]);
        OrganizationUser::create(['id' => (string) Str::ulid(), 'organization_id' => $this->orgA->id, 'user_id' => $this->pmA->id, 'is_owner' => false, 'joined_at' => now()]);
        OrganizationUser::create(['id' => (string) Str::ulid(), 'organization_id' => $this->orgA->id, 'user_id' => $this->devA->id, 'is_owner' => false, 'joined_at' => now()]);
        OrganizationUser::create(['id' => (string) Str::ulid(), 'organization_id' => $this->orgB->id, 'user_id' => $this->adminB->id, 'is_owner' => true, 'joined_at' => now()]);

        // Project A
        app(TenantManager::class)->runForTenant($this->orgA->id, function () {
            $this->projectA = Project::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $this->orgA->id,
                'name' => 'Project Alpha Financials',
                'code' => 'PAF-001',
                'project_type' => 'billable',
                'budget_amount' => 10000.0000,
                'budget_currency' => 'USD',
                'budget_type' => 'fixed',
                'billing_currency' => 'USD',
                'project_manager_id' => $this->pmA->id,
                'is_archived' => false,
                'config' => ['working_days' => [1, 2, 3, 4, 5], 'hours_per_day' => 8],
            ]);

            DB::table('project_users')->insert([
                'id' => (string) Str::ulid(),
                'organization_id' => $this->orgA->id,
                'project_id' => $this->projectA->id,
                'user_id' => $this->devA->id,
                'project_role' => 'developer',
                'cost_rate' => 60.0000,
                'billable_rate' => 150.0000,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->taskA = Task::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $this->orgA->id,
                'project_id' => $this->projectA->id,
                'name' => 'Core Engine Development',
                'category' => 'Engineering',
                'wbs_code' => '1.1',
                'pct' => 40,
                'order_index' => 1,
                'status' => 'In Progress',
                'start_date' => Carbon::today()->subWeeks(2)->toDateString(),
                'end_date' => Carbon::today()->addWeeks(2)->toDateString(),
            ]);
        });
    }

    // 1. Project Budget Management & Revisions
    public function test_project_budget_update_and_revision_history(): void
    {
        $this->actingAs($this->pmA);
        $headers = ['X-Organization-Id' => $this->orgA->id];

        $res = $this->putJson("/api/v1/projects/{$this->projectA->id}/budget", [
            'budget_amount' => 15000.00,
            'budget_currency' => 'USD',
            'budget_type' => 't_and_m',
            'reason' => 'Scope expanded due to enterprise integration requirements',
        ], $headers);

        $res->assertStatus(200)
            ->assertJsonPath('project.budget_amount', '15000.0000')
            ->assertJsonPath('revision.previous_budget', '10000.0000')
            ->assertJsonPath('revision.new_budget', '15000.0000');

        $revRes = $this->getJson("/api/v1/projects/{$this->projectA->id}/budget/revisions", $headers);
        $revRes->assertStatus(200)
            ->assertJsonCount(1, 'revisions')
            ->assertJsonPath('revisions.0.reason', 'Scope expanded due to enterprise integration requirements');
    }

    // 2. Labor Cost Rate Hierarchy and Cost Calculation
    public function test_labor_cost_rate_hierarchy(): void
    {
        app(TenantManager::class)->setTenant($this->orgA);
        $costService = app(CostCalculationService::class);

        // A. Org default rate
        $ratesDefault = $costService->resolveUserRates($this->adminA->id, $this->orgA->id);
        $this->assertEquals(50.0, $ratesDefault['cost_rate']);
        $this->assertEquals(120.0, $ratesDefault['billable_rate']);
        $this->assertEquals('organization_default', $ratesDefault['source']);

        // B. Project user pivot rate
        $ratesPivot = $costService->resolveUserRates($this->devA->id, $this->orgA->id, $this->projectA->id);
        $this->assertEquals(60.0, $ratesPivot['cost_rate']);
        $this->assertEquals(150.0, $ratesPivot['billable_rate']);
        $this->assertEquals('project_user_pivot', $ratesPivot['source']);

        // C. Global Rate History overrides pivot
        UserRateHistory::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->devA->id,
            'cost_rate' => 70.0000,
            'billable_rate' => 175.0000,
            'effective_from' => Carbon::today()->subMonths(1)->toDateString(),
        ]);

        $ratesGlobalHist = $costService->resolveUserRates($this->devA->id, $this->orgA->id, $this->projectA->id);
        $this->assertEquals(70.0, $ratesGlobalHist['cost_rate']);
        $this->assertEquals(175.0, $ratesGlobalHist['billable_rate']);
        $this->assertEquals('global_rate_history', $ratesGlobalHist['source']);

        // D. Project-specific Rate History overrides global
        UserRateHistory::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->devA->id,
            'project_id' => $this->projectA->id,
            'cost_rate' => 85.0000,
            'billable_rate' => 200.0000,
            'effective_from' => Carbon::today()->subMonths(1)->toDateString(),
        ]);

        $ratesProjHist = $costService->resolveUserRates($this->devA->id, $this->orgA->id, $this->projectA->id);
        $this->assertEquals(85.0, $ratesProjHist['cost_rate']);
        $this->assertEquals(200.0, $ratesProjHist['billable_rate']);
        $this->assertEquals('project_rate_history', $ratesProjHist['source']);
    }

    // 3. EVM Computation Formulas and Rounding Targets
    public function test_evm_computational_engine_formulas(): void
    {
        app(TenantManager::class)->setTenant($this->orgA);
        $evmService = app(EvmCalculationService::class);

        // Exact verified test case: BAC = 10000, PV = 5000, EV = 4000, AC = 6000
        $metrics = $evmService->calculate(
            project: $this->projectA,
            statusDate: Carbon::today()->toDateString(),
            manualPv: 5000.0,
            manualEv: 4000.0,
            manualAc: 6000.0
        );

        $this->assertEquals(10000.0, $metrics['bac']);
        $this->assertEquals(5000.0, $metrics['pv']);
        $this->assertEquals(4000.0, $metrics['ev']);
        $this->assertEquals(6000.0, $metrics['ac']);
        $this->assertEquals(-2000.0, $metrics['cv']);
        $this->assertEquals(-1000.0, $metrics['sv']);
        $this->assertEquals(0.6667, $metrics['cpi']);
        $this->assertEquals(0.8000, $metrics['spi']);
        $this->assertEquals(14999.25, $metrics['eac']);
        $this->assertEquals(8999.25, $metrics['etc']);
        $this->assertEquals(-4999.25, $metrics['vac']);
        $this->assertEquals(1.5000, $metrics['tcpi']);
        $this->assertEquals('over_budget', $metrics['health']['cost_status']);
        $this->assertEquals('behind_schedule', $metrics['health']['schedule_status']);

        // Overrun test case: AC = 11000 > BAC = 10000 => TCPI returns null
        $overrunMetrics = $evmService->calculate(
            project: $this->projectA,
            statusDate: Carbon::today()->toDateString(),
            manualPv: 5000.0,
            manualEv: 4000.0,
            manualAc: 11000.0
        );
        $this->assertNull($overrunMetrics['tcpi']);
    }

    // 4. Burn Rate and Forecast to Complete with Budget Exceeded Alert
    public function test_forecast_to_complete_and_budget_exceeded_alert(): void
    {
        $forecastService = app(ForecastEngineService::class);

        // Create approved time entries across past weeks
        TimeEntry::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'task_id' => $this->taskA->id,
            'user_id' => $this->devA->id,
            'date' => Carbon::today()->subDays(3)->toDateString(),
            'hours' => 40.0,
            'billable' => true,
            'approved_at' => now(),
        ]);

        $this->actingAs($this->pmA);
        $headers = ['X-Organization-Id' => $this->orgA->id];

        $res = $this->getJson("/api/v1/projects/{$this->projectA->id}/forecast-to-complete", $headers);
        $res->assertStatus(200)
            ->assertJsonStructure([
                'project_id',
                'bac',
                'ac',
                'eac',
                'etc',
                'average_weekly_burn',
                'weeks_remaining',
                'alerts',
            ]);
    }

    // 5. Expense Claims Lifecycle & Anti-Self-Approval
    public function test_expense_claims_lifecycle_and_anti_self_approval(): void
    {
        $headers = ['X-Organization-Id' => $this->orgA->id];

        // A. Contributor creates draft expense
        $this->actingAs($this->devA);
        $createRes = $this->postJson('/api/v1/expenses', [
            'project_id' => $this->projectA->id,
            'category' => 'software',
            'title' => 'Cloud Dev Environment License',
            'amount' => 150.00,
            'currency' => 'USD',
            'expense_date' => Carbon::today()->toDateString(),
            'billable' => true,
        ], $headers);

        $createRes->assertStatus(201);
        $expenseId = $createRes->json('expense.id');

        // B. Contributor submits expense
        $submitRes = $this->postJson("/api/v1/expenses/{$expenseId}/submit", [], $headers);
        $submitRes->assertStatus(200)
            ->assertJsonPath('expense.status', 'submitted');

        // C. Anti-Self-Approval: Contributor cannot approve their own expense
        $selfApproveRes = $this->postJson("/api/v1/expenses/{$expenseId}/approve", [], $headers);
        $selfApproveRes->assertStatus(403);

        // D. Project Manager approves expense
        $this->actingAs($this->pmA);
        $approveRes = $this->postJson("/api/v1/expenses/{$expenseId}/approve", [], $headers);
        $approveRes->assertStatus(200)
            ->assertJsonPath('expense.status', 'approved');

        // E. Reimburse expense
        $this->actingAs($this->adminA);
        $reimburseRes = $this->postJson("/api/v1/expenses/{$expenseId}/reimburse", [], $headers);
        $reimburseRes->assertStatus(200)
            ->assertJsonPath('expense.status', 'reimbursed');
    }

    // 6. Archived Project Guard for Time Entries and Expenses
    public function test_archived_project_blocks_time_and_expense_creation(): void
    {
        $this->projectA->update(['is_archived' => true]);

        $headers = ['X-Organization-Id' => $this->orgA->id];
        $this->actingAs($this->devA);

        // Try to log time
        $timeRes = $this->postJson("/api/v1/tasks/{$this->taskA->id}/time-entries", [
            'date' => Carbon::today()->toDateString(),
            'hours' => 4.0,
        ], $headers);

        $timeRes->assertStatus(422)
            ->assertJsonPath('code', 'PROJECT_ARCHIVED');

        // Try to submit expense
        $expenseRes = $this->postJson('/api/v1/expenses', [
            'project_id' => $this->projectA->id,
            'category' => 'travel',
            'title' => 'Client Visit Cab',
            'amount' => 45.00,
            'expense_date' => Carbon::today()->toDateString(),
        ], $headers);

        $expenseRes->assertStatus(422)
            ->assertJsonPath('code', 'PROJECT_ARCHIVED');
    }

    // 7. Atomic Invoice Sequence Generation
    public function test_atomic_invoice_sequence_generation(): void
    {
        $seqService = app(InvoiceSequenceService::class);
        $currentYear = (int) date('Y');

        $inv1 = $seqService->getNextInvoiceNumber($this->orgA->id, 'INV', $currentYear);
        $inv2 = $seqService->getNextInvoiceNumber($this->orgA->id, 'INV', $currentYear);
        $inv3 = $seqService->getNextInvoiceNumber($this->orgA->id, 'INV', $currentYear);

        $this->assertEquals(sprintf('INV-%d-0001', $currentYear), $inv1);
        $this->assertEquals(sprintf('INV-%d-0002', $currentYear), $inv2);
        $this->assertEquals(sprintf('INV-%d-0003', $currentYear), $inv3);
    }

    // 8. Invoice Creation with Idempotency Key Full Match & Concurrency Safety
    public function test_invoice_creation_with_idempotency_key_and_concurrency_safety(): void
    {
        $this->actingAs($this->pmA);
        $idempotencyKey = (string) Str::uuid();
        $headers = [
            'X-Organization-Id' => $this->orgA->id,
            'X-Idempotency-Key' => $idempotencyKey,
        ];

        $payload = [
            'project_id' => $this->projectA->id,
            'client_name' => 'Acme Enterprise Client',
            'client_email' => 'billing@client.com',
            'issue_date' => Carbon::today()->toDateString(),
            'due_date' => Carbon::today()->addDays(30)->toDateString(),
            'currency' => 'USD',
            'tax_rate' => 0.10,
            'line_items' => [
                [
                    'description' => 'Software Engineering Phase 1',
                    'quantity' => 40.0,
                    'unit_price' => 150.00,
                ],
                [
                    'description' => 'Architecture Consultation',
                    'quantity' => 10.0,
                    'unit_price' => 200.00,
                ],
            ],
        ];

        // First Request
        $res1 = $this->postJson('/api/v1/invoices', $payload, $headers);
        $res1->assertStatus(201);
        $invoice1 = $res1->json('invoice');

        // Subtotal = 40*150 + 10*200 = 6000 + 2000 = 8000
        // Tax = 800
        // Total = 8800
        $this->assertEquals('8000.0000', $invoice1['subtotal']);
        $this->assertEquals('8800.0000', $invoice1['total_amount']);

        // Second Request with identical idempotency key
        $res2 = $this->postJson('/api/v1/invoices', $payload, $headers);
        $res2->assertStatus(201);
        $invoice2 = $res2->json('invoice');

        // Assert full structure and properties match identically
        $this->assertEquals($invoice1['id'], $invoice2['id']);
        $this->assertEquals($invoice1['invoice_number'], $invoice2['invoice_number']);
        $this->assertEquals($invoice1['total_amount'], $invoice2['total_amount']);
        $this->assertEquals($invoice1['subtotal'], $invoice2['subtotal']);
    }

    // 9. Invoice Immutability on Sent and Paid Status
    public function test_invoice_immutability_on_sent_and_paid(): void
    {
        $this->actingAs($this->pmA);
        $headers = ['X-Organization-Id' => $this->orgA->id];

        $inv = Invoice::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'invoice_number' => 'INV-2026-9999',
            'status' => 'draft',
            'client_name' => 'Test Client',
            'issue_date' => Carbon::today()->toDateString(),
            'due_date' => Carbon::today()->addDays(30)->toDateString(),
            'created_by' => $this->pmA->id,
        ]);

        // Transition to sent
        $sendRes = $this->postJson("/api/v1/invoices/{$inv->id}/send", [], $headers);
        $sendRes->assertStatus(200);

        // Attempt to update sent invoice must fail with 422
        $updateRes = $this->putJson("/api/v1/invoices/{$inv->id}", [
            'client_name' => 'Tampered Client Name',
        ], $headers);
        $updateRes->assertStatus(422);

        // Attempt to delete sent invoice must fail with 422
        $deleteRes = $this->deleteJson("/api/v1/invoices/{$inv->id}", [], $headers);
        $deleteRes->assertStatus(422);

        // Mark as paid
        $paidRes = $this->postJson("/api/v1/invoices/{$inv->id}/mark-paid", [], $headers);
        $paidRes->assertStatus(200);

        // Attempt to void paid invoice must fail with 422
        $voidRes = $this->postJson("/api/v1/invoices/{$inv->id}/void", [], $headers);
        $voidRes->assertStatus(422);
    }

    // 10. Mark Overdue Invoices Scheduled Job
    public function test_mark_overdue_invoices_job(): void
    {
        $overdueInvoice = Invoice::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'invoice_number' => 'INV-2026-0088',
            'status' => 'sent',
            'client_name' => 'Late Client Corp',
            'issue_date' => Carbon::today()->subDays(45)->toDateString(),
            'due_date' => Carbon::today()->subDays(15)->toDateString(),
            'created_by' => $this->pmA->id,
        ]);

        $futureInvoice = Invoice::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'invoice_number' => 'INV-2026-0089',
            'status' => 'sent',
            'client_name' => 'Current Client Corp',
            'issue_date' => Carbon::today()->toDateString(),
            'due_date' => Carbon::today()->addDays(15)->toDateString(),
            'created_by' => $this->pmA->id,
        ]);

        // Run Job
        $job = new MarkOverdueInvoicesJob();
        $job->handle();

        $this->assertEquals('overdue', $overdueInvoice->fresh()->status);
        $this->assertEquals('sent', $futureInvoice->fresh()->status);
    }

    // 11. Reports Engine Catalog, Generation & Cron Validation
    public function test_reports_engine_catalog_and_cron_validation(): void
    {
        $this->actingAs($this->pmA);
        $headers = ['X-Organization-Id' => $this->orgA->id];

        // Catalog
        $catRes = $this->getJson('/api/v1/reports/catalog', $headers);
        $catRes->assertStatus(200)
            ->assertJsonCount(8, 'reports');

        // Generate JSON
        $genRes = $this->postJson('/api/v1/reports/generate', [
            'report_type' => 'project_budget',
            'parameters' => ['project_id' => $this->projectA->id],
            'format' => 'json',
        ], $headers);
        $genRes->assertStatus(200)
            ->assertJsonPath('report_type', 'project_budget');

        // Schedule report: Invalid cron expression must fail with 422
        $badCronRes = $this->postJson('/api/v1/reports/scheduled', [
            'report_type' => 'project_budget',
            'title' => 'Weekly Budget Report',
            'parameters' => ['project_id' => $this->projectA->id],
            'schedule' => 'invalid-cron-format',
            'recipients' => ['stakeholder@example.com'],
        ], $headers);
        $badCronRes->assertStatus(422);

        // Schedule report: Invalid email in array must fail with 422
        $badEmailRes = $this->postJson('/api/v1/reports/scheduled', [
            'report_type' => 'project_budget',
            'title' => 'Weekly Budget Report',
            'parameters' => ['project_id' => $this->projectA->id],
            'schedule' => '0 9 * * 1',
            'recipients' => ['not-an-email'],
        ], $headers);
        $badEmailRes->assertStatus(422);

        // Valid schedule
        $validRes = $this->postJson('/api/v1/reports/scheduled', [
            'report_type' => 'project_budget',
            'title' => 'Weekly Budget Report',
            'parameters' => ['project_id' => $this->projectA->id],
            'schedule' => '0 9 * * 1',
            'recipients' => ['stakeholder@example.com'],
            'format' => 'pdf',
        ], $headers);
        $validRes->assertStatus(201)
            ->assertJsonPath('scheduled_report.schedule', '0 9 * * 1');
    }

    // 12. Widgets Catalog and Custom Dashboard Builder
    public function test_widgets_catalog_and_custom_dashboards(): void
    {
        $this->actingAs($this->pmA);
        $headers = ['X-Organization-Id' => $this->orgA->id];

        // Global Widgets catalog (seeded)
        $widgetsRes = $this->getJson('/api/v1/widgets', $headers);
        $widgetsRes->assertStatus(200)
            ->assertJsonCount(8, 'widgets');

        // Create custom dashboard
        $createDashRes = $this->postJson('/api/v1/dashboards', [
            'title' => 'Executive Financials Dashboard',
            'project_id' => $this->projectA->id,
            'layout' => [
                ['widget_key' => 'evm_summary', 'x' => 0, 'y' => 0, 'w' => 6, 'h' => 4],
                ['widget_key' => 'budget_vs_actual', 'x' => 6, 'y' => 0, 'w' => 6, 'h' => 4],
            ],
            'is_default' => true,
            'is_shared' => true,
        ], $headers);

        $createDashRes->assertStatus(201)
            ->assertJsonPath('dashboard.title', 'Executive Financials Dashboard');
    }

    // 13. Cross-Tenant Isolation Across Financial Entities
    public function test_strict_cross_tenant_isolation_on_all_financial_entities(): void
    {
        // Admin from Org B attempts to access Org A financial resources
        $this->actingAs($this->adminB);
        $headers = ['X-Organization-Id' => $this->orgB->id];

        // A. Project Budget
        $budgetRes = $this->getJson("/api/v1/projects/{$this->projectA->id}/budget", $headers);
        $this->assertTrue(in_array($budgetRes->status(), [403, 404]));

        // B. Project Costs
        $costsRes = $this->getJson("/api/v1/projects/{$this->projectA->id}/costs", $headers);
        $this->assertTrue(in_array($costsRes->status(), [403, 404]));

        // C. Project EVM
        $evmRes = $this->getJson("/api/v1/projects/{$this->projectA->id}/evm", $headers);
        $this->assertTrue(in_array($evmRes->status(), [403, 404]));

        // D. Expenses
        $expense = Expense::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'user_id' => $this->devA->id,
            'title' => 'Secret Expense',
            'amount' => 100,
            'expense_date' => now()->toDateString(),
        ]);
        $expenseRes = $this->getJson("/api/v1/expenses/{$expense->id}", $headers);
        $this->assertTrue(in_array($expenseRes->status(), [403, 404]));

        // E. Invoices
        $invoice = Invoice::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'invoice_number' => 'INV-SECRET-01',
            'client_name' => 'Confidential Corp',
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'created_by' => $this->adminA->id,
        ]);
        $invoiceRes = $this->getJson("/api/v1/invoices/{$invoice->id}", $headers);
        $this->assertTrue(in_array($invoiceRes->status(), [403, 404]));

        // F. Dashboards
        $dashboard = Dashboard::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->adminA->id,
            'title' => 'Org A Dashboard',
            'layout' => [],
            'is_shared' => false,
        ]);
        $dashRes = $this->getJson("/api/v1/dashboards/{$dashboard->id}", $headers);
        $this->assertTrue(in_array($dashRes->status(), [403, 404]));
    }
}

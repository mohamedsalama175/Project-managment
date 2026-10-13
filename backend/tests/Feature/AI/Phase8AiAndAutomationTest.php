<?php

namespace Tests\Feature\AI;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Models\User;
use App\Modules\AI\Jobs\DetectProjectAnomaliesJob;
use App\Modules\AI\Models\AiActionLog;
use App\Modules\AI\Models\AiUsageLog;
use App\Modules\AI\Models\OrganizationAiCredential;
use App\Modules\AI\Models\ProjectAnomaly;
use App\Modules\AI\Services\AiManagerService;
use App\Modules\Automation\Jobs\ExecuteAutomationRuleJob;
use App\Modules\Automation\Models\AutomationRule;
use App\Modules\Automation\Models\AutomationRun;
use App\Modules\Automation\Services\AutomationConditionEvaluatorService;
use App\Modules\Automation\Services\AutomationEngineService;
use App\Modules\Automation\Services\TemplateResolver;
use App\Modules\Financials\Models\ProjectCostSnapshot;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase8AiAndAutomationTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected Organization $orgB;
    protected User $userA;
    protected User $userB;
    protected Project $projectA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PermissionSeeder::class);

        $this->orgA = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Acme Technologies',
            'slug' => 'acme-tech',
            'plan' => 'enterprise',
            'status' => 'active',
            'ai_monthly_budget_usd' => 100.00,
            'ai_settings' => ['provider' => 'mock'],
        ]);

        $this->orgB = Organization::create([
            'id' => (string) Str::ulid(),
            'name' => 'Beta Global',
            'slug' => 'beta-global',
            'plan' => 'pro',
            'status' => 'active',
            'ai_monthly_budget_usd' => 50.00,
            'ai_settings' => ['provider' => 'mock'],
        ]);

        $this->userA = User::factory()->create([
            'default_organization_id' => $this->orgA->id,
            'email_verified_at' => now(),
        ]);

        $this->userB = User::factory()->create([
            'default_organization_id' => $this->orgB->id,
            'email_verified_at' => now(),
        ]);

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgA->id,
            'user_id' => $this->userA->id,
            'is_owner' => true,
            'joined_at' => now(),
        ]);

        OrganizationUser::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $this->orgB->id,
            'user_id' => $this->userB->id,
            'is_owner' => true,
            'joined_at' => now(),
        ]);

        setPermissionsTeamId($this->orgA->id);
        $this->userA->assignRole('admin');

        setPermissionsTeamId($this->orgB->id);
        $this->userB->assignRole('admin');

        app(TenantManager::class)->runForTenant($this->orgA->id, function () {
            $this->projectA = Project::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $this->orgA->id,
                'name' => 'Alpha Core Delivery',
                'code' => 'ACD-01',
                'project_type' => 'client',
                'project_manager_id' => $this->userA->id,
                'is_archived' => false,
                'config' => ['working_days' => [1, 2, 3, 4, 5], 'hours_per_day' => 8],
            ]);
        });

        Cache::flush();
    }

    public function test_ai_credentials_are_encrypted_at_rest(): void
    {
        $rawSecret = 'sk-live-super-secret-key-1234567890';

        $cred = OrganizationAiCredential::create([
            'organization_id' => $this->orgA->id,
            'openai_key' => $rawSecret,
            'anthropic_key' => 'anthropic-secret-xyz',
        ]);

        // Raw database check
        $rawRow = DB::table('organization_ai_credentials')->where('id', $cred->id)->first();
        $this->assertNotNull($rawRow);
        $this->assertNotEquals($rawSecret, $rawRow->openai_key);

        // Model attribute decryption check
        $fresh = OrganizationAiCredential::find($cred->id);
        $this->assertEquals($rawSecret, $fresh->openai_key);
        $this->assertEquals('anthropic-secret-xyz', $fresh->anthropic_key);
    }

    public function test_template_resolver_resolves_nested_tokens(): void
    {
        /** @var TemplateResolver $resolver */
        $resolver = app(TemplateResolver::class);

        $context = [
            'task' => [
                'id' => '01JABC123',
                'name' => 'Implement API Gateway',
                'pct' => 75,
            ],
            'project' => [
                'name' => 'Phoenix Project',
                'code' => 'PHX-01',
            ],
            'user' => [
                'name' => 'Jane Developer',
            ],
            'days_overdue' => 4,
        ];

        // 1. String resolution
        $template = "Task '{{task.name}}' in [{{project.code}}] is assigned to {{user.name}} and is {{days_overdue}} days overdue.";
        $resolved = $resolver->resolve($template, $context);
        $this->assertEquals("Task 'Implement API Gateway' in [PHX-01] is assigned to Jane Developer and is 4 days overdue.", $resolved);

        // 2. Exact token type preservation
        $this->assertSame(75, $resolver->resolve('{{task.pct}}', $context));

        // 3. Nested array resolution
        $arrayTemplate = [
            'title' => 'Alert: {{task.name}}',
            'meta' => [
                'code' => '{{project.code}}',
                'progress' => '{{task.pct}}%',
            ],
        ];
        $resolvedArray = $resolver->resolve($arrayTemplate, $context);
        $this->assertEquals('Alert: Implement API Gateway', $resolvedArray['title']);
        $this->assertEquals('PHX-01', $resolvedArray['meta']['code']);
        $this->assertEquals('75%', $resolvedArray['meta']['progress']);
    }

    public function test_automation_condition_evaluator_operators(): void
    {
        /** @var AutomationConditionEvaluatorService $evaluator */
        $evaluator = app(AutomationConditionEvaluatorService::class);

        $payload = [
            'task' => [
                'status' => 'Blocked',
                'pct' => 100,
                'priority' => 'High',
            ],
            'is_overdue' => true,
        ];

        // Equals match
        $this->assertTrue($evaluator->evaluateAll([
            ['field' => 'task.status', 'operator' => 'equals', 'value' => 'Blocked'],
            ['field' => 'task.pct', 'operator' => 'gte', 'value' => 90],
            ['field' => 'is_overdue', 'operator' => 'eq', 'value' => true],
        ], $payload));

        // Failed condition
        $this->assertFalse($evaluator->evaluateAll([
            ['field' => 'task.status', 'operator' => 'equals', 'value' => 'Completed'],
        ], $payload));
    }

    public function test_ai_task_estimation_endpoint(): void
    {
        Sanctum::actingAs($this->userA, ['*']);

        $response = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->postJson('/api/v1/ai/estimate-task', [
                'name' => 'Develop OAuth2 Authentication Broker',
                'description' => 'Build PKCE-compliant authorization server endpoints and unit tests.',
                'category' => 'Engineering',
                'project_id' => $this->projectA->id,
            ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'estimated_hours',
            'confidence',
            'reasoning',
            'suggested_breakdown',
        ]);
        $this->assertGreaterThan(0, $response->json('estimated_hours'));
    }

    public function test_ai_risk_score_calculation_endpoint(): void
    {
        Sanctum::actingAs($this->userA, ['*']);

        // Create tasks to simulate risk (overdue, blocked)
        Task::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'name' => 'Database Cluster Setup',
            'status' => 'Blocked',
            'pct' => 20,
            'start_date' => now()->subDays(10)->toDateString(),
            'end_date' => now()->subDays(2)->toDateString(),
        ]);

        ProjectRisk::create([
            'organization_id' => $this->orgA->id,
            'project_id' => $this->projectA->id,
            'title' => 'Third-party vendor API latency',
            'description' => 'Vendor latency impacting downstream delivery.',
            'type' => 'risk',
            'severity' => 'critical',
            'likelihood' => 'high',
            'impact' => 'high',
            'status' => 'open',
            'identified_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
        ]);

        $response = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->getJson("/api/v1/projects/{$this->projectA->id}/ai/risk-score");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'project_id',
            'risk_score',
            'risk_level',
            'top_factors',
        ]);

        $this->assertNotEmpty($response->json('top_factors'));
        $this->assertContains($response->json('risk_level'), ['moderate', 'high', 'critical']);
    }

    public function test_ai_summarization_endpoint(): void
    {
        Sanctum::actingAs($this->userA, ['*']);

        $response = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->postJson('/api/v1/ai/summarize', [
                'scope' => 'project',
                'target_id' => $this->projectA->id,
                'time_range' => '7d',
            ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'headline',
            'progress_summary',
            'key_risks',
            'blockers',
            'recommended_actions',
            'generated_at',
        ]);
    }

    public function test_natural_language_task_parser_endpoint(): void
    {
        Sanctum::actingAs($this->userA, ['*']);

        $response = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->postJson('/api/v1/ai/parse-task', [
                'text' => 'Create a high-priority task for Jane to review security posture due next Friday',
                'project_id' => $this->projectA->id,
            ]);

        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('name'));
        $this->assertNotNull($response->json('due_date'));
    }

    public function test_ai_chat_and_action_rollback_lifecycle(): void
    {
        Sanctum::actingAs($this->userA, ['*']);

        // 1. Send chat message to create a task
        $response = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->postJson('/api/v1/ai/chat', [
                'messages' => [
                    ['role' => 'user', 'content' => 'Please create a task named "Setup S3 Backup" for this project'],
                ],
                'project_id' => $this->projectA->id,
            ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['reply', 'actions_taken', 'tool_executions']);

        $actions = $response->json('actions_taken');
        $this->assertNotEmpty($actions);
        $actionLogId = $actions[0]['action_log_id'];
        $createdTaskId = $actions[0]['target_id'];

        // Verify task exists in DB
        $this->assertDatabaseHas('tasks', ['id' => $createdTaskId, 'name' => 'Setup S3 Backup']);

        // 2. Rollback the created action
        $rollbackResponse = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->postJson("/api/v1/ai/actions/{$actionLogId}/rollback");

        $rollbackResponse->assertStatus(200);
        $rollbackResponse->assertJson(['reverted' => true]);

        // Verify task was deleted by rollback
        $this->assertDatabaseMissing('tasks', ['id' => $createdTaskId]);
    }

    public function test_ai_budget_limit_rejection(): void
    {
        Sanctum::actingAs($this->userA, ['*']);

        // Set org budget to $5.00
        $this->orgA->update(['ai_monthly_budget_usd' => 5.00]);

        // Record usage of $6.00
        app(TenantManager::class)->runForTenant($this->orgA->id, function () {
            AiUsageLog::create([
                'organization_id' => $this->orgA->id,
                'user_id' => $this->userA->id,
                'feature' => 'estimation',
                'provider' => 'mock',
                'model' => 'mock-v1',
                'tokens_in' => 5000,
                'tokens_out' => 5000,
                'cost_usd' => 6.00,
                'created_at' => now(),
            ]);
        });

        $response = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->postJson('/api/v1/ai/estimate-task', [
                'name' => 'Over-budget task estimation test',
                'project_id' => $this->projectA->id,
            ]);

        $response->assertStatus(402);
        $this->assertStringContainsString('budget', strtolower($response->json('message')));
    }

    public function test_daily_rate_limit_and_ttl_persistence(): void
    {
        $tenantId = $this->orgA->id;
        $user = $this->userA;
        $today = Carbon::today()->toDateString();
        $cacheKey = "ai_user_daily_req:{$tenantId}:{$user->id}:{$today}";

        Cache::forget($cacheKey);

        /** @var AiManagerService $manager */
        $manager = app(AiManagerService::class);

        // Pre-fill cache with limit (100)
        Cache::put($cacheKey, 100, Carbon::now()->endOfDay());

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        $this->expectExceptionMessage('Daily AI request limit');

        app(TenantManager::class)->runForTenant($tenantId, function () use ($manager, $tenantId, $user) {
            $manager->checkBudgetAndAuthorize($tenantId, $user, 'estimation');
        });
    }

    public function test_detect_project_anomalies_job_and_endpoint(): void
    {
        Sanctum::actingAs($this->userA, ['*']);

        app(TenantManager::class)->runForTenant($this->orgA->id, function () {
            // Seed 10 baseline snapshots with mean ~$1000 weekly burn rate
            for ($i = 15; $i >= 1; $i--) {
                ProjectCostSnapshot::create([
                    'id' => (string) Str::ulid(),
                    'organization_id' => $this->orgA->id,
                    'project_id' => $this->projectA->id,
                    'snapshot_date' => now()->subDays($i)->toDateString(),
                    'weekly_burn_rate' => 1000.00 + ($i % 3 * 20),
                ]);
            }

            // Add a massive outlier snapshot (> 3σ from mean)
            ProjectCostSnapshot::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $this->orgA->id,
                'project_id' => $this->projectA->id,
                'snapshot_date' => now()->toDateString(),
                'weekly_burn_rate' => 15000.00,
            ]);
        });

        // Dispatch detector job
        DetectProjectAnomaliesJob::dispatchSync($this->orgA->id, $this->projectA->id);

        // Check endpoint
        $response = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->getJson("/api/v1/projects/{$this->projectA->id}/ai/anomalies");

        $response->assertStatus(200);
        $anomalies = $response->json('anomalies');
        $this->assertNotEmpty($anomalies);
        $this->assertEquals('weekly_burn_rate', $anomalies[0]['metric']);
        $this->assertGreaterThanOrEqual(3.0, abs($anomalies[0]['z_score']));

        // Acknowledge anomaly
        $ackResponse = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->postJson("/api/v1/ai/anomalies/{$anomalies[0]['id']}/acknowledge");

        $ackResponse->assertStatus(200);
        $this->assertNotNull($ackResponse->json('anomaly.acknowledged_at'));
    }

    public function test_automation_rule_crud_and_templates(): void
    {
        Sanctum::actingAs($this->userA, ['*']);

        // 1. Get template catalog
        $templatesRes = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->getJson('/api/v1/automation/templates');

        $templatesRes->assertStatus(200);
        $this->assertNotEmpty($templatesRes->json('templates'));

        $templateId = $templatesRes->json('templates.0.id');

        // 2. Instantiate template #1
        $instantiateRes = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->postJson("/api/v1/automation/templates/{$templateId}/instantiate", [
                'project_id' => $this->projectA->id,
            ]);

        $instantiateRes->assertStatus(201);
        $ruleId = $instantiateRes->json('rule.id');

        // 3. Toggle rule
        $toggleRes = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->patchJson("/api/v1/automation/rules/{$ruleId}/toggle");

        $toggleRes->assertStatus(200);
        $this->assertFalse($toggleRes->json('rule.enabled'));

        // 4. Soft delete rule
        $deleteRes = $this->withHeader('X-Organization-Id', $this->orgA->id)
            ->deleteJson("/api/v1/automation/rules/{$ruleId}");

        $deleteRes->assertStatus(200);
        $this->assertSoftDeleted('automation_rules', ['id' => $ruleId]);
    }

    public function test_automation_execution_job_success(): void
    {
        app(TenantManager::class)->runForTenant($this->orgA->id, function () {
            $rule = AutomationRule::create([
                'organization_id' => $this->orgA->id,
                'project_id' => $this->projectA->id,
                'name' => 'Auto-Update Status',
                'trigger' => ['event' => 'task.progress_updated'],
                'conditions' => [
                    ['field' => 'task.pct', 'operator' => 'gte', 'value' => 100],
                ],
                'actions' => [
                    ['type' => 'log', 'params' => ['message' => 'Task completed at 100%']],
                ],
                'enabled' => true,
            ]);

            $payload = [
                'task' => [
                    'id' => '01JXYZ999',
                    'name' => 'Final QA Review',
                    'pct' => 100,
                ],
                'project' => ['id' => $this->projectA->id],
            ];

            ExecuteAutomationRuleJob::dispatchSync($this->orgA->id, $rule->id, $payload, 1);

            $run = AutomationRun::where('rule_id', $rule->id)->first();
            $this->assertNotNull($run);
            $this->assertEquals('success', $run->status);
            $this->assertEquals(1, $run->depth);
        });
    }

    public function test_automation_recursion_depth_limit_cycle_prevention(): void
    {
        app(TenantManager::class)->runForTenant($this->orgA->id, function () {
            $rule = AutomationRule::create([
                'organization_id' => $this->orgA->id,
                'name' => 'Recursive Looper Rule',
                'trigger' => ['event' => 'task.loop'],
                'conditions' => [],
                'actions' => [
                    ['type' => 'log', 'params' => ['message' => 'Infinite loop test']],
                ],
                'enabled' => true,
            ]);

            // Depth 6 exceeds MAX_DEPTH = 5
            ExecuteAutomationRuleJob::dispatchSync($this->orgA->id, $rule->id, [], 6);

            $run = AutomationRun::where('rule_id', $rule->id)->first();
            $this->assertNotNull($run);
            $this->assertEquals('skipped', $run->status);
            $this->assertStringContainsString('depth limit exceeded', strtolower($run->error_message));
        });
    }

    public function test_automation_deduplication_60s(): void
    {
        app(TenantManager::class)->runForTenant($this->orgA->id, function () {
            $rule = AutomationRule::create([
                'organization_id' => $this->orgA->id,
                'name' => 'Single Trigger Rule',
                'trigger' => ['event' => 'review.approved'],
                'conditions' => [],
                'actions' => [
                    ['type' => 'log', 'params' => ['message' => 'Single execution']],
                ],
                'enabled' => true,
            ]);

            /** @var AutomationEngineService $engine */
            $engine = app(AutomationEngineService::class);

            $payload = ['review_id' => 'REV-01', 'project_id' => $this->projectA->id];

            // 1st dispatch succeeds
            $dispatchedFirst = $engine->trigger($this->orgA->id, 'review.approved', $payload);
            $this->assertCount(1, $dispatchedFirst);

            // 2nd dispatch within 60s is deduplicated and suppressed
            $dispatchedSecond = $engine->trigger($this->orgA->id, 'review.approved', $payload);
            $this->assertCount(0, $dispatchedSecond);
        });
    }

    public function test_cross_tenant_isolation_automation_and_ai(): void
    {
        $ruleA = null;
        app(TenantManager::class)->runForTenant($this->orgA->id, function () use (&$ruleA) {
            $ruleA = AutomationRule::create([
                'organization_id' => $this->orgA->id,
                'name' => 'Org A Confidential Rule',
                'trigger' => ['event' => 'payroll.run'],
                'conditions' => [],
                'actions' => [],
                'enabled' => true,
            ]);
        });

        Sanctum::actingAs($this->userB, ['*']);

        // User B cannot access Org A rule
        $response = $this->withHeader('X-Organization-Id', $this->orgB->id)
            ->getJson("/api/v1/automation/rules/{$ruleA->id}");

        $response->assertStatus(404);
    }
}

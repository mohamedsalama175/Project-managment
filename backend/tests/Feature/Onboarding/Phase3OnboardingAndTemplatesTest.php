<?php

namespace Tests\Feature\Onboarding;

use App\Models\InstallState;
use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Task;
use App\Models\User;
use App\Modules\Onboarding\Models\OnboardingProgress;
use App\Modules\Onboarding\Services\SampleProjectService;
use App\Modules\Templates\Models\ProjectTemplate;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class Phase3OnboardingAndTemplatesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed standard permissions and system templates (no users)
        $this->seed();
    }

    public function test_install_status_and_web_installation_flow(): void
    {
        // 1. Initial status before install
        $statusRes = $this->getJson('/api/v1/system/install/status');
        $statusRes->assertStatus(200)
            ->assertJson([
                'is_installed' => false,
            ]);

        // 2. Perform installation via API
        $installPayload = [
            'name' => 'Alice Founder',
            'email' => 'alice@founder.local',
            'password' => 'SecurePass#2026!Master',
            'organization_name' => 'Founder Corp',
            'industry' => 'Technology',
            'region' => 'EMEA',
        ];

        $res = $this->postJson('/api/v1/system/install', $installPayload);
        $res->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'admin_user' => ['id', 'name', 'email'],
                'organization' => ['id', 'name', 'slug'],
            ]);

        // 3. Confirm install_state singleton exists
        $this->assertTrue(InstallState::isInstalled());
        $installRecord = InstallState::where('id', InstallState::SINGLETON_ID)->first();
        $this->assertNotNull($installRecord);
        $this->assertSame('alice@founder.local', $installRecord->adminUser->email);

        // 4. Repeated install attempts fail with 409 conflict
        $secondRes = $this->postJson('/api/v1/system/install', $installPayload);
        $secondRes->assertStatus(409)
            ->assertJsonPath('code', 'SYSTEM_ALREADY_INSTALLED');

        // 5. Status endpoint now reports installed
        $statusAfter = $this->getJson('/api/v1/system/install/status');
        $statusAfter->assertStatus(200)
            ->assertJson([
                'is_installed' => true,
            ]);
    }

    public function test_onboarding_sequence_prerequisites_and_monotonicity(): void
    {
        // Setup installed system
        $installResult = (new \App\Modules\System\Services\InstallationOrchestrator())->install([
            'email' => 'owner@startup.io',
            'password' => 'OwnerPass#2026!Str',
            'organization_name' => 'Startup HQ',
        ]);

        $owner = $installResult['user'];
        $org = $installResult['organization'];
        app(TenantManager::class)->setTenant($org);
        setPermissionsTeamId($org->id);

        // 1. Fetch progress
        $res = $this->actingAs($owner, 'sanctum')->getJson('/api/v1/onboarding/progress');
        $res->assertStatus(200)
            ->assertJson([
                'data' => [
                    'flow_type' => 'owner',
                    'current_step' => 1,
                    'total_steps' => 7,
                    'is_completed' => false,
                ],
            ]);

        // 2. Skipping Step 1 is prohibited
        $skip1 = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/step/1/skip');
        $skip1->assertStatus(422)
            ->assertJsonPath('message', 'ONBOARDING_STEP_NOT_SKIPPABLE');

        // 3. Advancing out of order (attempting step 3 when current is 1) is rejected
        $outOfOrder = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/step/3', [
            'invitations' => [['email' => 'colleague@startup.io']],
        ]);
        $outOfOrder->assertStatus(422)
            ->assertJsonPath('message', 'ONBOARDING_STEP_OUT_OF_ORDER');

        // 4. Complete Step 1 (Profile)
        $step1Res = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/step/1', [
            'name' => 'Owner Updated',
            'job_title' => 'Chief Technology Officer',
            'department' => 'Executive',
            'color' => '#3b82f6',
        ]);
        $step1Res->assertStatus(200)
            ->assertJsonPath('data.current_step', 2)
            ->assertJsonPath('data.completed_steps', [1]);

        $this->assertSame('Chief Technology Officer', $owner->fresh()->job_title);

        // 5. Skip Step 2 (Workspace Preferences)
        $skip2 = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/step/2/skip');
        $skip2->assertStatus(200)
            ->assertJsonPath('data.current_step', 3)
            ->assertJsonPath('data.skipped_steps', [2]);

        // 6. Complete Step 3 (Invitations)
        $step3 = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/step/3', [
            'invitations' => [
                ['email' => 'dev1@startup.io', 'role' => 'contributor'],
                ['email' => 'dev2@startup.io', 'role' => 'project_manager'],
            ],
        ]);
        $step3->assertStatus(200)
            ->assertJsonPath('data.current_step', 4);

        $this->assertDatabaseHas('organization_invitations', ['email' => 'dev1@startup.io']);
        $this->assertDatabaseHas('organization_invitations', ['email' => 'dev2@startup.io']);

        // 7. Step 4 (Organization Details) is non-skippable
        $skip4 = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/step/4/skip');
        $skip4->assertStatus(422)
            ->assertJsonPath('message', 'ONBOARDING_STEP_NOT_SKIPPABLE');

        // Complete Step 4
        $step4 = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/step/4', [
            'organization_name' => 'Startup Global Holdings',
            'industry' => 'Finance',
            'region' => 'NA',
        ]);
        $step4->assertStatus(200)
            ->assertJsonPath('data.current_step', 5);

        $this->assertSame('Startup Global Holdings', $org->fresh()->name);

        // 8. Complete Step 5 (Project Blank Creation)
        $step5 = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/step/5', [
            'create_blank' => true,
            'project_name' => 'Project Alpha Launch',
        ]);
        $step5->assertStatus(200)
            ->assertJsonPath('data.current_step', 6);

        $this->assertDatabaseHas('projects', ['name' => 'Project Alpha Launch', 'organization_id' => $org->id]);

        // 9. Skip Step 6 (Sample Data)
        $step6 = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/step/6/skip');
        $step6->assertStatus(200)
            ->assertJsonPath('data.current_step', 7);

        // 10. Complete Step 7 (Finalize)
        $step7 = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/step/7', []);
        $step7->assertStatus(200)
            ->assertJsonPath('data.is_completed', true);

        // 11. Complete Tour
        $tourRes = $this->actingAs($owner, 'sanctum')->postJson('/api/v1/onboarding/tour/complete');
        $tourRes->assertStatus(200)
            ->assertJsonPath('data.tour_completed', true);
    }

    public function test_sample_data_opt_in_and_cascade_purge(): void
    {
        $installResult = (new \App\Modules\System\Services\InstallationOrchestrator())->install([
            'email' => 'sample_user@corp.local',
            'password' => 'SamplePass#2026!Str',
            'organization_name' => 'Sample Testing Org',
        ]);

        $user = $installResult['user'];
        $org = $installResult['organization'];
        app(TenantManager::class)->setTenant($org);
        setPermissionsTeamId($org->id);

        // 1. Opt-in to sample project
        $res = $this->actingAs($user, 'sanctum')->postJson('/api/v1/sample-data/opt-in');
        $res->assertStatus(201)
            ->assertJsonPath('project.is_sample', true);

        $sampleProjectId = $res->json('project.id');
        $org->refresh();

        $this->assertTrue($org->has_sample_data);
        $this->assertSame($sampleProjectId, $org->sample_project_id);

        // Verify 10 tasks and 2 risks were created
        $this->assertEquals(10, Task::withoutGlobalScopes()->where('project_id', $sampleProjectId)->count());
        $this->assertEquals(2, ProjectRisk::withoutGlobalScopes()->where('project_id', $sampleProjectId)->count());

        // 2. Purge sample project
        $purgeRes = $this->actingAs($user, 'sanctum')->deleteJson('/api/v1/sample-data/purge');
        $purgeRes->assertStatus(200)
            ->assertJsonPath('message', 'Sample project purged successfully.');

        $org->refresh();
        $this->assertFalse($org->has_sample_data);
        $this->assertNull($org->sample_project_id);

        // Confirm cascaded deletion
        $this->assertEquals(0, Project::withoutGlobalScopes()->where('id', $sampleProjectId)->count());
        $this->assertEquals(0, Task::withoutGlobalScopes()->where('project_id', $sampleProjectId)->count());
        $this->assertEquals(0, ProjectRisk::withoutGlobalScopes()->where('project_id', $sampleProjectId)->count());
    }

    public function test_project_templates_hybrid_visibility_and_instantiation(): void
    {
        $installResult = (new \App\Modules\System\Services\InstallationOrchestrator())->install([
            'email' => 'pm_templates@org.local',
            'password' => 'TemplatePass#2026!Str',
            'organization_name' => 'Template Testing Org',
        ]);

        $user = $installResult['user'];
        $org = $installResult['organization'];
        app(TenantManager::class)->setTenant($org);
        setPermissionsTeamId($org->id);

        // 1. All 6 system templates are visible
        $listRes = $this->actingAs($user, 'sanctum')->getJson('/api/v1/templates');
        $listRes->assertStatus(200)
            ->assertJsonCount(6, 'data');

        $systemTemplate = ProjectTemplate::where('slug', 'agile-software-development')->first();
        $this->assertNotNull($systemTemplate);
        $this->assertTrue($systemTemplate->is_system);

        // 2. Instantiate project from template
        $instantiateRes = $this->actingAs($user, 'sanctum')->postJson("/api/v1/templates/{$systemTemplate->id}/instantiate", [
            'name' => 'Custom Mobile App Launch',
            'code' => 'APP-2026',
        ]);

        $instantiateRes->assertStatus(201)
            ->assertJsonPath('project.name', 'Custom Mobile App Launch')
            ->assertJsonPath('project.code', 'APP-2026');

        $projectId = $instantiateRes->json('project.id');
        $createdProject = Project::withoutGlobalScopes()->find($projectId);

        $this->assertEquals(5, $createdProject->tasks()->count());
        $this->assertEquals(2, $createdProject->risks()->count());

        // 3. Save as template
        $saveTemplateRes = $this->actingAs($user, 'sanctum')->postJson("/api/v1/projects/{$projectId}/save-as-template", [
            'name' => 'Proprietary Mobile Flow Template',
            'industry' => 'Technology',
        ]);

        $saveTemplateRes->assertStatus(201)
            ->assertJsonPath('data.name', 'Proprietary Mobile Flow Template')
            ->assertJsonPath('data.is_system', false);

        // 4. Listing now includes 6 system templates + 1 custom tenant template = 7
        $listAfter = $this->actingAs($user, 'sanctum')->getJson('/api/v1/templates');
        $listAfter->assertStatus(200)
            ->assertJsonCount(7, 'data');

        // 5. System template cannot be deleted
        $delSystem = $this->actingAs($user, 'sanctum')->deleteJson("/api/v1/templates/{$systemTemplate->id}");
        $delSystem->assertStatus(403);
    }

    public function test_task_bulk_import_with_dry_run_and_execution(): void
    {
        $installResult = (new \App\Modules\System\Services\InstallationOrchestrator())->install([
            'email' => 'import_user@data.local',
            'password' => 'ImportPass#2026!Str',
            'organization_name' => 'Data Importers Inc',
        ]);

        $user = $installResult['user'];
        $org = $installResult['organization'];
        app(TenantManager::class)->setTenant($org);
        setPermissionsTeamId($org->id);

        $project = Project::withoutGlobalScopes()->create([
            'id' => (string) Str::ulid(),
            'organization_id' => $org->id,
            'name' => 'Import Target Project',
            'code' => 'IMP-001',
            'project_manager_id' => $user->id,
            'config' => ['calendar' => 'standard_5d_40h'],
            'is_sample' => false,
        ]);

        $csvContent = implode("\n", [
            'wbs_code,name,duration_days,parent_wbs_code,predecessors',
            '1.0,Discovery & Scoping,5,,',
            '1.1,User Research Interviews,3,1.0,',
            '2.0,Prototyping & Validation,4,,1.0',
        ]);

        $file = UploadedFile::fake()->createWithContent('tasks.csv', $csvContent);

        // 1. Dry-run mode
        $dryRunRes = $this->actingAs($user, 'sanctum')->postJson("/api/v1/projects/{$project->id}/tasks/import", [
            'file' => $file,
            'dry_run' => true,
        ]);

        $dryRunRes->assertStatus(200)
            ->assertJson([
                'dry_run' => true,
                'code' => 'IMPORT_DRY_RUN_PASSED',
                'summary' => [
                    'tasks_count' => 3,
                    'dependencies_count' => 1,
                ],
            ]);

        // Verify zero tasks persisted during dry-run
        $this->assertEquals(0, Task::withoutGlobalScopes()->where('project_id', $project->id)->count());

        // 2. Live execution mode
        $fileExecution = UploadedFile::fake()->createWithContent('tasks_live.csv', $csvContent);
        $liveRes = $this->actingAs($user, 'sanctum')->postJson("/api/v1/projects/{$project->id}/tasks/import", [
            'file' => $fileExecution,
            'dry_run' => false,
        ]);

        $liveRes->assertStatus(201)
            ->assertJson([
                'dry_run' => false,
                'summary' => [
                    'tasks_count' => 3,
                    'dependencies_count' => 1,
                ],
            ]);

        // Verify tasks and hierarchy persisted
        $this->assertEquals(3, Task::withoutGlobalScopes()->where('project_id', $project->id)->count());
        $parent = Task::withoutGlobalScopes()->where('project_id', $project->id)->where('wbs_code', '1.0')->first();
        $child = Task::withoutGlobalScopes()->where('project_id', $project->id)->where('wbs_code', '1.1')->first();
        $this->assertSame($parent->id, $child->parent_id);
    }
}

<?php

namespace Tests\Feature\Automation;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TemplateCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        (new \App\Modules\System\Services\InstallationOrchestrator())->install([]);
        setPermissionsTeamId('01HZX000000000000000000000');
    }

    public function test_template_catalog_returns_all_eight_templates(): void
    {
        $admin = User::where('email', 'admin@deliverops.com')->first();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/automation/templates');

        $response->assertOk();
        $response->assertJsonStructure(['templates']);

        $templates = $response->json('templates');
        $this->assertCount(8, $templates, 'Expected exactly 8 automation recipes in template catalog');

        $criticalPathTpl = collect($templates)->firstWhere('id', 'tpl_critical_path_delay_alert');
        $this->assertNotNull($criticalPathTpl, 'Template tpl_critical_path_delay_alert must be present in catalog');
        $this->assertSame('task.schedule_slipped', $criticalPathTpl['trigger']['event']);
    }

    public function test_template_catalog_config_has_critical_path_recipe(): void
    {
        $templates = config('deliverops.automation_templates', []);
        $this->assertCount(8, $templates);

        $ids = collect($templates)->pluck('id')->all();
        $this->assertContains('tpl_critical_path_delay_alert', $ids);
    }
}

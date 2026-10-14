<?php

namespace Tests\Unit\Requests;

use App\Modules\Projects\Requests\StoreProjectRequest;
use App\Modules\Risks\Requests\StoreProjectRiskRequest;
use App\Modules\Tasks\Requests\StoreTaskRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class FormRequestValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_store_project_request_rules(): void
    {
        $rules = (new StoreProjectRequest())->rules();

        // Valid data
        $v1 = Validator::make([
            'name' => 'Project Alpha',
            'code' => 'PA-01',
            'project_type' => 'client',
        ], $rules);
        $this->assertTrue($v1->passes());

        // Missing required name
        $v2 = Validator::make([
            'code' => 'PA-01',
        ], $rules);
        $this->assertTrue($v2->fails());
        $this->assertArrayHasKey('name', $v2->errors()->toArray());

        // Invalid project_type
        $v3 = Validator::make([
            'name' => 'Valid Name',
            'project_type' => 'unknown_type',
        ], $rules);
        $this->assertTrue($v3->fails());
        $this->assertArrayHasKey('project_type', $v3->errors()->toArray());
    }

    public function test_store_task_request_rules(): void
    {
        $rules = (new StoreTaskRequest())->rules();

        // Valid data
        $v1 = Validator::make([
            'name' => 'Install Transformers',
            'category' => 'Electrical',
            'start_date' => '2026-10-15',
            'end_date' => '2026-10-25',
            'priority' => 'High',
            'pct' => 50,
        ], $rules);
        $this->assertTrue($v1->passes());

        // Missing category and start_date
        $v2 = Validator::make([
            'name' => 'Task Without Required Fields',
            'end_date' => '2026-10-25',
        ], $rules);
        $this->assertTrue($v2->fails());
        $this->assertArrayHasKey('category', $v2->errors()->toArray());
        $this->assertArrayHasKey('start_date', $v2->errors()->toArray());

        // End date before start date
        $v3 = Validator::make([
            'name' => 'Inverted Dates Task',
            'category' => 'General',
            'start_date' => '2026-10-25',
            'end_date' => '2026-10-20',
        ], $rules);
        $this->assertTrue($v3->fails());
        $this->assertArrayHasKey('end_date', $v3->errors()->toArray());

        // Percentage out of range (greater than 100)
        $v4 = Validator::make([
            'name' => 'Super Progress',
            'category' => 'General',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-10',
            'pct' => 150,
        ], $rules);
        $this->assertTrue($v4->fails());
        $this->assertArrayHasKey('pct', $v4->errors()->toArray());
    }

    public function test_store_risk_request_rules(): void
    {
        $rules = (new StoreProjectRiskRequest())->rules();

        // Valid data
        $v1 = Validator::make([
            'title' => 'Severe Weather Alert',
            'type' => 'risk',
            'severity' => 'critical',
            'likelihood' => 'high',
            'status' => 'open',
        ], $rules);
        $this->assertTrue($v1->passes());

        // Missing title, type, and severity
        $v2 = Validator::make([
            'description' => 'Missing essential fields',
        ], $rules);
        $this->assertTrue($v2->fails());
        $this->assertArrayHasKey('title', $v2->errors()->toArray());
        $this->assertArrayHasKey('type', $v2->errors()->toArray());
        $this->assertArrayHasKey('severity', $v2->errors()->toArray());

        // Invalid enum severity
        $v3 = Validator::make([
            'title' => 'Test Risk',
            'type' => 'risk',
            'severity' => 'super_ultra_high',
        ], $rules);
        $this->assertTrue($v3->fails());
        $this->assertArrayHasKey('severity', $v3->errors()->toArray());
    }
}

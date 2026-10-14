<?php

namespace Tests\Unit\Models;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskDependency;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskDependencyTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $owner;
    protected Project $project;
    protected Task $taskA;
    protected Task $taskB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        [$this->org, $this->owner] = $this->createOrganizationWithOwner();
        app(TenantManager::class)->setTenant($this->org);

        $this->project = Project::create([
            'organization_id' => $this->org->id,
            'name' => 'Dep Test Project',
            'code' => 'DTP-01',
        ]);

        $this->taskA = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Task A (Predecessor)',
        ]);

        $this->taskB = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Task B (Successor)',
        ]);
    }

    public function test_can_create_finish_to_start_dependency(): void
    {
        $dep = TaskDependency::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'task_id' => $this->taskB->id,
            'predecessor_id' => $this->taskA->id,
            'dependency_type' => 'FS',
        ]);

        $this->assertDatabaseHas('task_dependencies', [
            'id' => $dep->id,
            'task_id' => $this->taskB->id,
            'predecessor_id' => $this->taskA->id,
            'dependency_type' => 'FS',
        ]);
    }

    public function test_self_dependency_throws_invalid_argument_exception(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Self-dependency invariant violation');

        TaskDependency::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'task_id' => $this->taskA->id,
            'predecessor_id' => $this->taskA->id,
            'dependency_type' => 'FS',
        ]);
    }

    public function test_task_predecessors_and_successors_relationships(): void
    {
        TaskDependency::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'task_id' => $this->taskB->id,
            'predecessor_id' => $this->taskA->id,
            'dependency_type' => 'FS',
        ]);

        $this->assertTrue($this->taskB->predecessors->contains($this->taskA));
        $this->assertTrue($this->taskA->successors->contains($this->taskB));
    }
}

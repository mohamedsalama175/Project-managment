<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskDependency;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskDependencyFactory extends Factory
{
    protected $model = TaskDependency::class;

    public function definition(): array
    {
        $project = Project::first() ?? Project::factory()->create();
        $task = Task::factory()->create(['project_id' => $project->id, 'organization_id' => $project->organization_id]);
        $predecessor = Task::factory()->create(['project_id' => $project->id, 'organization_id' => $project->organization_id]);

        return [
            'project_id' => $project->id,
            'organization_id' => $project->organization_id,
            'task_id' => $task->id,
            'predecessor_id' => $predecessor->id,
            'dependency_type' => 'FS',
        ];
    }
}

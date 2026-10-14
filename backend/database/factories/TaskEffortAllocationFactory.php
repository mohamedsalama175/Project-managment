<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskEffortAllocation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskEffortAllocationFactory extends Factory
{
    protected $model = TaskEffortAllocation::class;

    public function definition(): array
    {
        $project = Project::first() ?? Project::factory()->create();
        $task = Task::factory()->create(['project_id' => $project->id, 'organization_id' => $project->organization_id]);
        $user = User::first() ?? User::factory()->create();

        return [
            'task_id' => $task->id,
            'user_id' => $user->id,
            'organization_id' => $project->organization_id,
            'allocated_hours' => 20.0,
            'lock_version' => 1,
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        $project = Project::first() ?? Project::factory()->create();

        return [
            'project_id' => $project->id,
            'organization_id' => $project->organization_id,
            'name' => fake()->sentence(4),
            'category' => 'Engineering',
            'priority' => 'Medium',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(7)->toDateString(),
            'pct' => 0,
            'status' => 'Not Started',
            'estimated_hours' => 10,
            'primary_owner_hours' => 10,
        ];
    }
}

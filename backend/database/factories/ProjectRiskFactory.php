<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectRiskFactory extends Factory
{
    protected $model = ProjectRisk::class;

    public function definition(): array
    {
        $project = Project::first() ?? Project::factory()->create();

        return [
            'project_id' => $project->id,
            'organization_id' => $project->organization_id,
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'type' => 'risk',
            'severity' => 'medium',
            'likelihood' => 'medium',
            'impact' => 'medium',
            'status' => 'open',
            'owner_id' => User::first()?->id ?? User::factory()->create()->id,
            'mitigation_plan' => fake()->sentence(),
            'identified_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
            'lock_version' => 1,
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        $orgId = config('deliverops.system_org_id', '01HZX000000000000000000000');
        Organization::firstOrCreate(
            ['id' => $orgId],
            [
                'name' => 'DeliverOps System Organization',
                'slug' => 'system-default',
                'industry' => 'Platform Administration',
                'region' => 'EMEA',
                'plan' => 'enterprise',
                'timezone' => 'UTC',
                'status' => 'active',
            ]
        );

        return [
            'organization_id' => $orgId,
            'name' => fake()->sentence(3),
            'code' => strtoupper(fake()->unique()->lexify('???-##')),
            'config' => [
                'weekendDays' => [5, 6],
                'holidays' => [],
                'autoSchedule' => true,
                'durationMode' => 'working_days',
            ],
        ];
    }
}

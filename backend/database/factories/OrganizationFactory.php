<?php

namespace Database\Factories;

use App\Modules\Tenancy\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class OrganizationFactory extends Factory
{
    protected $model = Organization::class;

    public function definition(): array
    {
        $name = fake()->company();
        return [
            'name' => $name,
            'slug' => Str::slug($name) . '-' . Str::random(5),
            'industry' => fake()->randomElement(['Technology', 'Construction', 'Consulting', 'Aerospace', 'Healthcare']),
            'region' => 'EMEA',
            'plan' => 'free',
            'timezone' => 'UTC',
            'status' => 'active',
            'default_calendar' => 'standard_5d_40h',
            'base_currency' => 'USD',
        ];
    }

    public function enterprise(): static
    {
        return $this->state(fn () => [
            'plan' => 'enterprise',
        ]);
    }

    public function pro(): static
    {
        return $this->state(fn () => [
            'plan' => 'pro',
        ]);
    }
}

<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrganizationUserFactory extends Factory
{
    protected $model = OrganizationUser::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'user_id' => User::factory(),
            'is_owner' => false,
            'joined_at' => now(),
        ];
    }

    public function owner(): static
    {
        return $this->state(fn () => [
            'is_owner' => true,
        ]);
    }
}

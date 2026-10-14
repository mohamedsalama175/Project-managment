<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationInvitation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class OrganizationInvitationFactory extends Factory
{
    protected $model = OrganizationInvitation::class;

    public function definition(): array
    {
        $token = Str::random(40);
        return [
            'organization_id' => Organization::factory(),
            'email' => fake()->safeEmail(),
            'role' => 'project_manager',
            'token_hash' => hash('sha256', $token),
            'invited_by_id' => User::factory(),
            'invited_by_name' => fake()->name(),
            'invited_by_email' => fake()->safeEmail(),
            'expires_at' => now()->addDays(7),
            'accepted_at' => null,
        ];
    }

    public function accepted(): static
    {
        return $this->state(fn () => [
            'accepted_at' => now(),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn () => [
            'expires_at' => now()->subDay(),
        ]);
    }
}

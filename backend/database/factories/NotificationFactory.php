<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Notifications\Models\Notification;
use Illuminate\Database\Eloquent\Factories\Factory;

class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    public function definition(): array
    {
        $user = User::first() ?? User::factory()->create();
        $orgId = $user->default_organization_id ?? config('deliverops.system_org_id', '01HZX000000000000000000000');

        return [
            'organization_id' => $orgId,
            'user_id' => $user->id,
            'notifiable_id' => $user->id,
            'notifiable_type' => User::class,
            'type' => 'task.assigned',
            'event_type' => 'task.assigned',
            'title' => fake()->sentence(3),
            'message' => fake()->sentence(6),
            'data' => ['task_id' => (string) \Illuminate\Support\Str::ulid()],
            'read_at' => null,
        ];
    }

    public function read(): static
    {
        return $this->state(fn () => [
            'read_at' => now(),
        ]);
    }
}

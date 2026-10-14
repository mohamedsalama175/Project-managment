<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AuditLogFactory extends Factory
{
    protected $model = AuditLog::class;

    public function definition(): array
    {
        $orgId = config('deliverops.system_org_id', '01HZX000000000000000000000');
        return [
            'organization_id' => $orgId,
            'entity_type' => 'App\Models\Project',
            'entity_id' => (string) \Illuminate\Support\Str::ulid(),
            'actor_id' => User::first()?->id ?? User::factory()->create()->id,
            'actor_name' => fake()->name(),
            'actor_role' => 'admin',
            'action' => 'project.updated',
            'field_name' => 'status',
            'old_value' => ['status' => 'Planning'],
            'new_value' => ['status' => 'In Progress'],
            'reason' => 'Status changed',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'created_at' => now(),
        ];
    }
}

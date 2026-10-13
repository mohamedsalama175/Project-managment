<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        $systemOrgId = '01HZX000000000000000000000';

        // 1. Ensure DeliverOps System Organization exists
        DB::table('organizations')->updateOrInsert(
            ['id' => $systemOrgId],
            [
                'name' => 'DeliverOps System Organization',
                'slug' => 'system-default',
                'industry' => 'Platform Administration',
                'region' => 'EMEA',
                'plan' => 'enterprise',
                'timezone' => 'UTC',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Defensive check (Item 12)
        if (!DB::table('organizations')->where('id', $systemOrgId)->exists()) {
            throw new \RuntimeException("Critical Migration Failure: DeliverOps System Organization [{$systemOrgId}] does not exist.");
        }

        // 2. Associate Super Admin if exists
        $admin = DB::table('users')->where('email', 'admin@deliverops.com')->first();
        if ($admin) {
            DB::table('organization_users')->updateOrInsert(
                [
                    'organization_id' => $systemOrgId,
                    'user_id' => $admin->id,
                ],
                [
                    'id' => (string) Str::ulid(),
                    'is_owner' => 1,
                    'joined_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            DB::table('users')->where('id', $admin->id)->update([
                'default_organization_id' => $systemOrgId,
            ]);
        }

        // 3. Batching via chunkById(1000) for large tables (Item 19)
        $tables = [
            'projects',
            'tasks',
            'project_user',
            'project_users',
            'task_dependencies',
            'task_effort_allocations',
            'project_risks',
            'baseline_versions',
            'task_comments',
            'audit_logs',
            'idempotency_keys',
            'notifications',
            'attachments',
        ];

        foreach ($tables as $table) {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'organization_id')) {
                continue;
            }

            // Note: tables using ULID string primary keys or auto-increment
            DB::table($table)
                ->whereNull('organization_id')
                ->chunkById(1000, function ($rows) use ($table, $systemOrgId) {
                    $ids = $rows->pluck('id')->toArray();
                    DB::table($table)->whereIn('id', $ids)->update(['organization_id' => $systemOrgId]);
                });
        }

        // 4. Backfill Spatie pivot tables
        if (Schema::hasTable('model_has_roles') && Schema::hasColumn('model_has_roles', 'team_id')) {
            DB::table('model_has_roles')->whereNull('team_id')->update(['team_id' => $systemOrgId]);
        }

        if (Schema::hasTable('model_has_permissions') && Schema::hasColumn('model_has_permissions', 'team_id')) {
            DB::table('model_has_permissions')->whereNull('team_id')->update(['team_id' => $systemOrgId]);
        }
    }

    public function down(): void
    {
        // Data backfill is non-destructive and preserved in reverse
    }
};

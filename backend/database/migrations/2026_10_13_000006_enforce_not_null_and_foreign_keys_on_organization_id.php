<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    protected array $tables = [
        'projects' => 'idx_projects_org_status',
        'tasks' => 'idx_tasks_org_status',
        'project_user' => 'idx_proj_user_org',
        'project_users' => 'idx_proj_users_org',
        'task_dependencies' => 'idx_deps_org',
        'task_effort_allocations' => 'idx_effort_org',
        'project_risks' => 'idx_risks_org_status',
        'baseline_versions' => 'idx_baselines_org_project',
        'task_comments' => 'idx_comments_org_task',
        'audit_logs' => 'idx_audit_org_created',
        'idempotency_keys' => 'idx_idempotency_org_key',
        'notifications' => 'idx_notifs_org_user',
        'attachments' => 'idx_attach_org',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName => $indexName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'organization_id')) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName, $indexName) {
                    $table->char('organization_id', 26)->nullable(false)->change();

                    if (\Illuminate\Support\Facades\DB::getDriverName() !== 'sqlite') {
                        $table->foreign('organization_id', "fk_{$tableName}_organization")
                            ->references('id')
                            ->on('organizations')
                            ->onDelete('cascade');
                    }

                    $table->index('organization_id', $indexName);
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName => $indexName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'organization_id')) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName, $indexName) {
                    if (\Illuminate\Support\Facades\DB::getDriverName() !== 'sqlite') {
                        $table->dropForeign("fk_{$tableName}_organization");
                    }
                    $table->dropIndex($indexName);
                    $table->char('organization_id', 26)->nullable()->change();
                });
            }
        }
    }
};

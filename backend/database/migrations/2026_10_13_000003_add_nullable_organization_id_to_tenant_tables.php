<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    protected array $tables = [
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

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName) && !Schema::hasColumn($tableName, 'organization_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->char('organization_id', 26)->nullable()->after('id');
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'organization_id')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropColumn('organization_id');
                });
            }
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('wbs_code', 50)->nullable()->after('order_index');
            $table->text('description')->nullable()->after('name');
            $table->index(['project_id', 'wbs_code'], 'idx_tasks_project_wbs');
        });

        Schema::table('task_dependencies', function (Blueprint $table) {
            $table->string('dependency_type', 30)->default('finish_to_start')->change();
            $table->integer('lag_days')->default(0)->after('dependency_type');
        });
    }

    public function down(): void
    {
        Schema::table('task_dependencies', function (Blueprint $table) {
            $table->dropColumn('lag_days');
            $table->string('dependency_type', 10)->default('FS')->change();
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('idx_tasks_project_wbs');
            $table->dropColumn(['wbs_code', 'description']);
        });
    }
};

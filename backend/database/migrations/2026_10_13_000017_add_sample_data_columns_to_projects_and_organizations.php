<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->boolean('is_sample')->default(false)->after('is_archived');
            $table->index('is_sample', 'idx_projects_is_sample');
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->char('sample_project_id', 26)->nullable()->after('settings');
            $table->boolean('sample_data_opted_in')->default(false)->after('sample_project_id');
            $table->timestamp('sample_data_opted_in_at')->nullable()->after('sample_data_opted_in');

            $table->foreign('sample_project_id', 'fk_org_sample_project')
                ->references('id')
                ->on('projects')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropForeign('fk_org_sample_project');
            $table->dropColumn(['sample_project_id', 'sample_data_opted_in', 'sample_data_opted_in_at']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex('idx_projects_is_sample');
            $table->dropColumn('is_sample');
        });
    }
};

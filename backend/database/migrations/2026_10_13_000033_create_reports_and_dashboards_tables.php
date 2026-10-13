<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Scheduled reports
        Schema::create('scheduled_reports', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('user_id', 26);
            $table->string('report_type', 50);
            $table->string('title', 255);
            $table->json('parameters');
            $table->enum('format', ['json', 'markdown', 'csv', 'pdf'])->default('pdf');
            $table->string('schedule', 100);
            $table->json('recipients');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            $table->index(['organization_id', 'is_active'], 'idx_sched_reports_org_active');
        });

        // 2. Global widget catalog (excluded from tenant scope)
        Schema::create('widgets', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('key', 50)->unique();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();
            $table->string('category', 50);
            $table->integer('default_width')->default(6);
            $table->integer('default_height')->default(4);
            $table->boolean('is_system')->default(true);
            $table->timestamps();
        });

        // 3. User & project dashboards
        Schema::create('dashboards', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('user_id', 26);
            $table->char('project_id', 26)->nullable();
            $table->string('title', 100);
            $table->json('layout');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_shared')->default(false);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('set null');

            $table->index(['organization_id', 'user_id'], 'idx_dashboards_org_user');
            $table->index(['organization_id', 'is_default'], 'idx_dashboards_org_default');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboards');
        Schema::dropIfExists('widgets');
        Schema::dropIfExists('scheduled_reports');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. TIME OFF REQUESTS
        Schema::create('time_off_requests', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('user_id', 26);
            $table->enum('type', ['vacation', 'sick', 'personal', 'holiday'])->default('vacation');
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('hours_off', 4, 2)->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->char('approved_by_id', 26)->nullable();
            $table->char('approved_by_ulid_snapshot', 26)->nullable();
            $table->string('approved_by_name', 255)->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'start_date', 'end_date'], 'idx_time_off_org_dates');
            $table->index(['user_id', 'status'], 'idx_time_off_user_status');

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('approved_by_id')->references('id')->on('users')->onDelete('set null');
        });

        // 2. SKILLS CATALOG
        Schema::create('skills', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->string('name', 100);
            $table->string('category', 50);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'name'], 'uq_skills_org_name');
            $table->index(['organization_id', 'category'], 'idx_skills_category');
            $table->index(['organization_id', 'is_active'], 'idx_skills_active');

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
        });

        // 3. USER SKILLS
        Schema::create('user_skills', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('user_id', 26);
            $table->char('skill_id', 26);
            $table->unsignedTinyInteger('proficiency')->default(1);
            $table->decimal('years_experience', 4, 1)->default(0.0);
            $table->timestamps();

            $table->unique(['user_id', 'skill_id'], 'uq_user_skills');
            $table->index(['skill_id', 'proficiency'], 'idx_skill_proficiency');

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('skill_id')->references('id')->on('skills')->onDelete('cascade');
        });

        // 4. TASK SKILLS (Requirements)
        Schema::create('task_skills', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('task_id', 26);
            $table->char('skill_id', 26);
            $table->unsignedTinyInteger('min_proficiency')->default(1);
            $table->timestamps();

            $table->unique(['task_id', 'skill_id'], 'uq_task_skills');
            $table->index('organization_id', 'idx_task_skills_org');

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->foreign('skill_id')->references('id')->on('skills')->onDelete('cascade');
        });

        // 5. TIME ENTRIES
        Schema::create('time_entries', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('project_id', 26);
            $table->char('task_id', 26);
            $table->char('user_id', 26);
            $table->date('date');
            $table->decimal('hours', 5, 2);
            $table->text('description')->nullable();
            $table->boolean('billable')->default(false);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->char('approved_by_id', 26)->nullable();
            $table->char('approved_by_ulid_snapshot', 26)->nullable();
            $table->string('approved_by_name', 255)->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'date'], 'idx_time_entries_org_date');
            $table->index(['user_id', 'date'], 'idx_time_entries_user_date');
            $table->index(['organization_id', 'submitted_at', 'approved_at'], 'idx_time_entries_workflow');
            $table->index('task_id', 'idx_time_entries_task');
            $table->index('project_id', 'idx_time_entries_project');

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('approved_by_id')->references('id')->on('users')->onDelete('set null');
        });

        // 6. ALTER PROJECT_USERS TABLE
        Schema::table('project_users', function (Blueprint $table) {
            $table->decimal('billable_rate', 10, 2)->default(0.00)->after('project_role');
            $table->char('billable_currency', 3)->default('USD')->after('billable_rate');
        });
    }

    public function down(): void
    {
        Schema::table('project_users', function (Blueprint $table) {
            $table->dropColumn(['billable_rate', 'billable_currency']);
        });

        Schema::dropIfExists('time_entries');
        Schema::dropIfExists('task_skills');
        Schema::dropIfExists('user_skills');
        Schema::dropIfExists('skills');
        Schema::dropIfExists('time_off_requests');
    }
};

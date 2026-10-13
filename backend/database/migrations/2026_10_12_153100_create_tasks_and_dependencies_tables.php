<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->char('project_id', 26);
            $table->char('parent_id', 26)->nullable();
            $table->integer('order_index')->default(0);
            $table->string('name');
            $table->string('category', 100);
            $table->enum('priority', ['Low', 'Medium', 'High', 'Urgent'])->default('Medium');
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedTinyInteger('pct')->default(0);
            $table->boolean('is_milestone')->default(false);
            $table->date('baseline_start')->nullable();
            $table->date('baseline_end')->nullable();
            $table->enum('status', ['Not Started', 'In Progress', 'Blocked', 'In Review', 'Completed'])->default('Not Started');
            $table->text('block_reason')->nullable();
            $table->char('blocking_risk_id', 26)->nullable();

            $table->string('assignee_legacy')->nullable();
            $table->boolean('assignee_unresolved')->default(false);
            $table->char('primary_owner_id', 26)->nullable();
            $table->decimal('primary_owner_hours', 7, 2)->nullable();
            $table->char('reviewer_id', 26)->nullable();
            $table->enum('review_status', ['none', 'pending_review', 'approved', 'changes_requested'])->default('none');
            $table->text('review_note')->nullable();

            $table->decimal('estimated_hours', 7, 2)->nullable();
            $table->decimal('logged_hours', 7, 2)->default(0.00);
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            // Composite Unique Key enables composite FKs for same-project guarantee
            $table->unique(['project_id', 'id']);

            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign(['project_id', 'parent_id'])->references(['project_id', 'id'])->on('tasks')->onDelete('cascade');
            $table->foreign('blocking_risk_id')->references('id')->on('project_risks')->onDelete('restrict');
            $table->foreign('primary_owner_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('reviewer_id')->references('id')->on('users')->onDelete('set null');

            $table->index(['project_id', 'order_index']);
        });

        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('project_id', 26);
            $table->char('task_id', 26);
            $table->char('predecessor_id', 26);
            $table->string('dependency_type', 10)->default('FS');
            $table->timestamps();

            $table->foreign(['project_id', 'task_id'])->references(['project_id', 'id'])->on('tasks')->onDelete('cascade');
            $table->foreign(['project_id', 'predecessor_id'])->references(['project_id', 'id'])->on('tasks')->onDelete('cascade');
            $table->unique(['task_id', 'predecessor_id']);
        });

        Schema::create('task_effort_allocations', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('task_id', 26);
            $table->char('user_id', 26);
            $table->decimal('allocated_hours', 7, 2)->default(0.00);
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('restrict');
            $table->unique(['task_id', 'user_id']);
        });

        Schema::create('task_comments', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('task_id', 26);
            $table->char('user_id', 26);
            $table->text('content');
            $table->timestamps();

            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_comments');
        Schema::dropIfExists('task_effort_allocations');
        Schema::dropIfExists('task_dependencies');
        Schema::dropIfExists('tasks');
    }
};

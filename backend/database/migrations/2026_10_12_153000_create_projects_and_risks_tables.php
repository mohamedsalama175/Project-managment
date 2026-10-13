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
        Schema::create('projects', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->string('client_name')->nullable();
            $table->enum('project_type', ['client', 'internal', 'unclassified'])->default('unclassified');
            $table->char('project_manager_id', 26)->nullable();
            $table->json('config');
            $table->boolean('has_locked_baseline')->default(false);
            $table->date('baseline_locked_date')->nullable();
            $table->unsignedInteger('tree_version')->default(1);
            $table->boolean('is_archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('project_manager_id')->references('id')->on('users')->onDelete('set null');
            $table->index('code');
        });

        Schema::create('project_users', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('project_id', 26);
            $table->char('user_id', 26);
            $table->enum('project_role', ['lead', 'member', 'observer'])->default('member');
            $table->timestamps();

            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('restrict');
            $table->unique(['project_id', 'user_id']);
        });

        Schema::create('project_risks', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->char('project_id', 26);
            $table->string('title');
            $table->text('description');
            $table->enum('type', ['risk', 'issue', 'blocker']);
            $table->enum('severity', ['low', 'medium', 'high', 'critical']);
            $table->enum('status', ['open', 'investigating', 'mitigating', 'mitigated', 'resolved', 'closed'])->default('open');
            $table->enum('likelihood', ['low', 'medium', 'high'])->nullable();
            $table->enum('impact', ['low', 'medium', 'high', 'critical']);
            $table->text('root_cause')->nullable();
            $table->char('owner_id', 26)->nullable();
            $table->date('identified_date');
            $table->date('due_date');
            $table->text('mitigation_plan');
            $table->text('resolution_summary')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes(); // Soft delete protects Blocked tasks from orphan references

            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('owner_id')->references('id')->on('users')->onDelete('set null');
            $table->unique(['project_id', 'id']);
            $table->index(['project_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_risks');
        Schema::dropIfExists('project_users');
        Schema::dropIfExists('projects');
    }
};

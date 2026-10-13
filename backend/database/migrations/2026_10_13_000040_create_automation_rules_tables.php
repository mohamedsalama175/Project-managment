<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Automation Rules (Event-Driven No-Code Workflow Rules)
        if (!Schema::hasTable('automation_rules')) {
            Schema::create('automation_rules', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('project_id', 26)->nullable();
                $table->string('name', 150);
                $table->string('description', 255)->nullable();
                $table->json('trigger');
                $table->json('conditions');
                $table->json('actions');
                $table->boolean('enabled')->default(true);
                $table->char('created_by_id', 26)->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->foreign('project_id')
                    ->references('id')
                    ->on('projects')
                    ->onDelete('cascade');

                $table->foreign('created_by_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');

                $table->index(['organization_id', 'enabled'], 'idx_automation_rules_org_enabled');
                $table->index(['organization_id', 'project_id'], 'idx_automation_rules_org_proj');
            });
        }

        // 2. Automation Runs (Audit Execution Log - ON DELETE RESTRICT on rule_id)
        if (!Schema::hasTable('automation_runs')) {
            Schema::create('automation_runs', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('rule_id', 26);
                $table->string('trigger_event_id', 100)->nullable();
                $table->enum('status', ['pending', 'success', 'failed', 'skipped'])->default('pending');
                $table->unsignedTinyInteger('depth')->default(1);
                $table->json('output')->nullable();
                $table->text('error_message')->nullable();
                $table->unsignedInteger('duration_ms')->default(0);
                $table->timestamp('executed_at')->useCurrent();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->foreign('rule_id')
                    ->references('id')
                    ->on('automation_rules')
                    ->onDelete('restrict');

                $table->index(['organization_id', 'rule_id', 'executed_at'], 'idx_automation_runs_org_rule');
                $table->index(['organization_id', 'status'], 'idx_automation_runs_status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_runs');
        Schema::dropIfExists('automation_rules');
    }
};

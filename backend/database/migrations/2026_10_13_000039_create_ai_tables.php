<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. AI Usage & Cost Log (Infinite Forensic Retention)
        if (!Schema::hasTable('ai_usage_log')) {
            Schema::create('ai_usage_log', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('user_id', 26)->nullable();
                $table->string('feature', 50);
                $table->string('provider', 50);
                $table->string('model', 100);
                $table->unsignedInteger('tokens_in')->default(0);
                $table->unsignedInteger('tokens_out')->default(0);
                $table->decimal('cost_usd', 10, 6)->default(0.000000);
                $table->json('metadata')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('restrict');

                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');

                $table->index(['organization_id', 'created_at'], 'idx_ai_usage_org_created');
                $table->index(['organization_id', 'feature'], 'idx_ai_usage_org_feature');
            });
        }

        // 2. AI Reversible Action Logs (Infinite Forensic Retention)
        if (!Schema::hasTable('ai_action_logs')) {
            Schema::create('ai_action_logs', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('user_id', 26);
                $table->string('user_name_snapshot', 120);
                $table->string('action_type', 50);
                $table->string('target_type', 100);
                $table->char('target_id', 26)->nullable();
                $table->json('previous_state')->nullable();
                $table->json('new_state')->nullable();
                $table->boolean('is_reverted')->default(false);
                $table->timestamp('reverted_at')->nullable();
                $table->char('reverted_by_id', 26)->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('restrict');

                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('restrict');

                $table->foreign('reverted_by_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');

                $table->index(['organization_id', 'target_id'], 'idx_ai_actions_org_target');
                $table->index(['organization_id', 'created_at'], 'idx_ai_actions_org_created');
            });
        }

        // 3. Project Statistical Anomaly Detections (>3σ)
        if (!Schema::hasTable('project_anomalies')) {
            Schema::create('project_anomalies', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('project_id', 26);
                $table->string('metric', 50);
                $table->decimal('current_value', 14, 4);
                $table->decimal('baseline_mean', 14, 4);
                $table->decimal('baseline_stddev', 14, 4);
                $table->decimal('z_score', 6, 2);
                $table->enum('severity', ['warning', 'critical'])->default('warning');
                $table->text('explanation');
                $table->char('acknowledged_by_id', 26)->nullable();
                $table->timestamp('acknowledged_at')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->foreign('project_id')
                    ->references('id')
                    ->on('projects')
                    ->onDelete('cascade');

                $table->foreign('acknowledged_by_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');

                $table->index(['organization_id', 'project_id', 'created_at'], 'idx_project_anomalies_org_proj');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('project_anomalies');
        Schema::dropIfExists('ai_action_logs');
        Schema::dropIfExists('ai_usage_log');
    }
};

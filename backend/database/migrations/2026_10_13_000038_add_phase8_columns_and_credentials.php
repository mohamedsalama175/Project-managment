<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Add weekly_burn_rate to project_cost_snapshots
        Schema::table('project_cost_snapshots', function (Blueprint $table) {
            if (!Schema::hasColumn('project_cost_snapshots', 'weekly_burn_rate')) {
                $table->decimal('weekly_burn_rate', 14, 4)->default(0.0000)->after('hours_logged');
            }
        });

        // 2. Add AI monthly budget & settings to organizations
        Schema::table('organizations', function (Blueprint $table) {
            if (!Schema::hasColumn('organizations', 'ai_monthly_budget_usd')) {
                $table->decimal('ai_monthly_budget_usd', 10, 2)->default(50.00)->after('base_currency');
            }
            if (!Schema::hasColumn('organizations', 'ai_settings')) {
                $table->json('ai_settings')->nullable()->after('ai_monthly_budget_usd');
            }
        });

        // 3. Organization AI credentials (encrypted keys at rest)
        if (!Schema::hasTable('organization_ai_credentials')) {
            Schema::create('organization_ai_credentials', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26)->unique('uq_org_ai_credentials_org');
                $table->string('openai_key', 2048)->nullable();
                $table->string('anthropic_key', 2048)->nullable();
                $table->string('gemini_key', 2048)->nullable();
                $table->string('ollama_url', 255)->nullable();
                $table->timestamps();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_ai_credentials');

        Schema::table('organizations', function (Blueprint $table) {
            if (Schema::hasColumn('organizations', 'ai_settings')) {
                $table->dropColumn('ai_settings');
            }
            if (Schema::hasColumn('organizations', 'ai_monthly_budget_usd')) {
                $table->dropColumn('ai_monthly_budget_usd');
            }
        });

        Schema::table('project_cost_snapshots', function (Blueprint $table) {
            if (Schema::hasColumn('project_cost_snapshots', 'weekly_burn_rate')) {
                $table->dropColumn('weekly_burn_rate');
            }
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Projects financial columns
        Schema::table('projects', function (Blueprint $table) {
            $table->decimal('budget_amount', 14, 4)->default(0.0000)->after('description');
            $table->string('budget_currency', 3)->default('USD')->after('budget_amount');
            $table->enum('budget_type', ['fixed', 't_and_m', 'retainer'])->default('fixed')->after('budget_currency');
            $table->string('billing_currency', 3)->default('USD')->after('budget_type');
        });

        // 2. Organizations default rates and base currency
        Schema::table('organizations', function (Blueprint $table) {
            $table->decimal('default_cost_rate', 10, 4)->default(0.0000)->after('settings');
            $table->decimal('default_billable_rate', 10, 4)->default(0.0000)->after('default_cost_rate');
            $table->string('base_currency', 3)->default('USD')->after('default_billable_rate');
        });

        // 3. Project users cost rate (aligning with billable_rate)
        Schema::table('project_users', function (Blueprint $table) {
            if (!Schema::hasColumn('project_users', 'cost_rate')) {
                $table->decimal('cost_rate', 10, 4)->default(0.0000)->after('billable_rate');
            }
        });

        // 4. Idempotency keys expiration
        Schema::table('idempotency_keys', function (Blueprint $table) {
            if (!Schema::hasColumn('idempotency_keys', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('created_at');
                $table->index('expires_at', 'idx_idempotency_expires_at');
            }
        });

        // 5. Project budget revisions history
        Schema::create('project_budget_revisions', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('project_id', 26);
            $table->char('user_id', 26);
            $table->decimal('previous_budget', 14, 4);
            $table->decimal('new_budget', 14, 4);
            $table->string('currency', 3)->default('USD');
            $table->string('reason', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            $table->index(['organization_id', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_budget_revisions');

        Schema::table('idempotency_keys', function (Blueprint $table) {
            if (Schema::hasColumn('idempotency_keys', 'expires_at')) {
                $table->dropIndex('idx_idempotency_expires_at');
                $table->dropColumn('expires_at');
            }
        });

        Schema::table('project_users', function (Blueprint $table) {
            if (Schema::hasColumn('project_users', 'cost_rate')) {
                $table->dropColumn('cost_rate');
            }
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['default_cost_rate', 'default_billable_rate', 'base_currency']);
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['budget_amount', 'budget_currency', 'budget_type', 'billing_currency']);
        });
    }
};

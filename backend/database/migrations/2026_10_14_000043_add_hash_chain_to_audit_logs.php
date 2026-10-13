<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Audit Chain State Table (Pessimistic lock synchronization per org)
        if (!Schema::hasTable('audit_chain_state')) {
            Schema::create('audit_chain_state', function (Blueprint $table) {
                $table->char('organization_id', 26)->primary();
                $table->string('head_hash', 64)->nullable();
                $table->char('head_log_id', 26)->nullable();
                $table->unsignedBigInteger('total_logs')->default(0);
                $table->timestamp('updated_at')->useCurrent();

                $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            });
        }

        // 2. Add Hash Chain Columns AFTER actor_id
        if (!Schema::hasColumn('audit_logs', 'previous_hash')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->string('previous_hash', 64)->nullable()->after('actor_id');
                $table->string('row_hash', 64)->nullable()->after('previous_hash');
                $table->index(['organization_id', 'created_at', 'id'], 'idx_audit_logs_chain');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('audit_logs', 'previous_hash')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->dropIndex('idx_audit_logs_chain');
                $table->dropColumn(['previous_hash', 'row_hash']);
            });
        }
        Schema::dropIfExists('audit_chain_state');
    }
};

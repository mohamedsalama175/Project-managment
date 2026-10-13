<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Legal Holds Table
        Schema::create('legal_holds', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->string('entity_type', 100);
            $table->char('entity_id', 26);
            $table->text('reason');
            $table->string('case_number', 100)->nullable();
            $table->char('created_by_id', 26);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('released_at')->nullable();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('restrict');
            $table->foreign('created_by_id')->references('id')->on('users')->onDelete('restrict');
            $table->index(['organization_id', 'entity_type', 'entity_id', 'released_at'], 'idx_legal_holds_lookup');
        });

        // 2. Compliance DSAR Requests Table
        Schema::create('compliance_dsar_requests', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('user_id', 26);
            $table->char('requested_by_id', 26);
            $table->enum('type', ['export', 'erasure']);
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->string('archive_path', 1024)->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('restrict');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('requested_by_id')->references('id')->on('users')->onDelete('restrict');
            $table->index(['organization_id', 'status'], 'idx_dsar_org_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compliance_dsar_requests');
        Schema::dropIfExists('legal_holds');
    }
};

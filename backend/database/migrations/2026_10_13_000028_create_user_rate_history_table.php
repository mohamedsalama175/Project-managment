<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_rate_history', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('user_id', 26);
            $table->char('project_id', 26)->nullable();
            $table->decimal('cost_rate', 10, 4)->default(0.0000);
            $table->decimal('billable_rate', 10, 4)->default(0.0000);
            $table->string('currency', 3)->default('USD');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('set null');

            $table->index(['organization_id', 'user_id', 'effective_from'], 'idx_user_rate_hist_lookup');
            $table->index(['organization_id', 'project_id'], 'idx_user_rate_hist_project');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_rate_history');
    }
};

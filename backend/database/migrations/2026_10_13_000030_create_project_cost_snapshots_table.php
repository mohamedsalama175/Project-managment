<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_cost_snapshots', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('project_id', 26);
            $table->date('snapshot_date');
            $table->decimal('labor_cost', 14, 4)->default(0.0000);
            $table->decimal('expense_cost', 14, 4)->default(0.0000);
            $table->decimal('total_cost', 14, 4)->default(0.0000);
            $table->decimal('billable_amount', 14, 4)->default(0.0000);
            $table->decimal('hours_logged', 10, 2)->default(0.00);
            $table->string('currency', 3)->default('USD');
            $table->json('details')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');

            $table->unique(['organization_id', 'project_id', 'snapshot_date'], 'uniq_proj_cost_snapshot');
            $table->index(['organization_id', 'snapshot_date'], 'idx_proj_cost_snapshot_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_cost_snapshots');
    }
};

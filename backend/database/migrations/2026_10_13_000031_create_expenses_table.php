<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('project_id', 26);
            $table->char('task_id', 26)->nullable();
            $table->char('user_id', 26);
            $table->enum('category', ['travel', 'equipment', 'software', 'subcontractor', 'materials', 'other'])->default('other');
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->decimal('amount', 14, 4);
            $table->string('currency', 3)->default('USD');
            $table->date('expense_date');
            $table->boolean('billable')->default(false);
            $table->enum('status', ['draft', 'submitted', 'approved', 'rejected', 'reimbursed'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->char('approved_by', 26)->nullable();
            $table->char('approved_by_ulid_snapshot', 26)->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->timestamp('reimbursed_at')->nullable();
            $table->char('receipt_attachment_id', 26)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('receipt_attachment_id')->references('id')->on('attachments')->onDelete('set null');

            $table->index(['organization_id', 'project_id'], 'idx_expenses_org_project');
            $table->index(['organization_id', 'user_id'], 'idx_expenses_org_user');
            $table->index(['organization_id', 'status'], 'idx_expenses_org_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};

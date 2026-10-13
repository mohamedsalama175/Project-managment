<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Invoice sequences for atomic numbering
        Schema::create('invoice_sequences', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->string('prefix', 20)->default('INV');
            $table->integer('year');
            $table->integer('last_number')->default(0);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->unique(['organization_id', 'prefix', 'year'], 'uniq_invoice_seq_org_pref_yr');
        });

        // 2. Invoices table
        Schema::create('invoices', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('project_id', 26);
            $table->string('invoice_number', 50);
            $table->enum('status', ['draft', 'sent', 'paid', 'overdue', 'void'])->default('draft');
            $table->string('client_name', 255);
            $table->string('client_email', 255)->nullable();
            $table->text('client_address')->nullable();
            $table->date('issue_date');
            $table->date('due_date');
            $table->timestamp('paid_at')->nullable();
            $table->string('currency', 3)->default('USD');
            $table->decimal('subtotal', 14, 4)->default(0.0000);
            $table->decimal('tax_rate', 6, 4)->default(0.0000);
            $table->decimal('tax_amount', 14, 4)->default(0.0000);
            $table->decimal('total_amount', 14, 4)->default(0.0000);
            $table->text('notes')->nullable();
            $table->char('created_by', 26);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');

            $table->unique(['organization_id', 'invoice_number'], 'uniq_invoices_org_number');
            $table->index(['organization_id', 'project_id'], 'idx_invoices_org_project');
            $table->index(['organization_id', 'status'], 'idx_invoices_org_status');
            $table->index(['organization_id', 'due_date'], 'idx_invoices_org_due_date');
        });

        // 3. Invoice line items
        Schema::create('invoice_line_items', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('invoice_id', 26);
            $table->char('time_entry_id', 26)->nullable();
            $table->char('expense_id', 26)->nullable();
            $table->string('description', 500);
            $table->decimal('quantity', 10, 2)->default(1.00);
            $table->decimal('unit_price', 14, 4)->default(0.0000);
            $table->decimal('amount', 14, 4)->default(0.0000);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            // Audited requirement: RESTRICT on delete of invoice
            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('restrict');
            $table->foreign('time_entry_id')->references('id')->on('time_entries')->onDelete('set null');
            $table->foreign('expense_id')->references('id')->on('expenses')->onDelete('set null');

            $table->index(['organization_id', 'invoice_id'], 'idx_line_items_org_invoice');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_line_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('invoice_sequences');
    }
};

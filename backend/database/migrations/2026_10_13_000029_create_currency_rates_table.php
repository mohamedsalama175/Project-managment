<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('currency_rates', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('base_currency', 3);
            $table->string('target_currency', 3);
            $table->decimal('rate', 16, 8);
            $table->date('rate_date');
            $table->string('source', 50)->default('manual');
            $table->timestamps();

            $table->unique(['base_currency', 'target_currency', 'rate_date'], 'uniq_currency_rates_pair_date');
            $table->index(['base_currency', 'rate_date'], 'idx_currency_rates_base_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('currency_rates');
    }
};

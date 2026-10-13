<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->char('user_id', 26);
            $table->string('idempotency_key', 100);
            $table->char('request_hash', 64);
            $table->integer('response_code');
            $table->json('response_body');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['user_id', 'idempotency_key']);
            $table->index('created_at');
        });

        Schema::create('legacy_import_records', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->string('import_batch_id', 100);
            $table->string('entity_type', 50);
            $table->string('legacy_id', 100);
            $table->char('created_ulid', 26);
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['entity_type', 'legacy_id']);
            $table->index(['import_batch_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('legacy_import_records');
        Schema::dropIfExists('idempotency_keys');
    }
};

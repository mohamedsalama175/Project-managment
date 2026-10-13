<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Webhook Endpoints
        Schema::create('webhook_endpoints', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->char('organization_id', 26);
            $table->char('created_by_id', 26);
            $table->string('url', 500);
            $table->string('secret', 255); // Encrypted via Crypt::encryptString
            $table->json('events');
            $table->string('description', 255)->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('consecutive_failed_attempts')->default(0);
            $table->timestamp('last_success_at')->nullable();
            $table->timestamp('disabled_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('created_by_id')->references('id')->on('users')->onDelete('restrict');

            $table->index(['organization_id', 'active'], 'idx_webhooks_org_active');
        });

        // 2. Webhook Deliveries (Delivery attempts & logs)
        Schema::create('webhook_deliveries', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->char('endpoint_id', 26);
            $table->string('event_id', 64);
            $table->string('event_type', 60);
            $table->json('payload');
            $table->integer('response_code')->nullable();
            $table->text('response_body')->nullable(); // Truncated to 65535 bytes max
            $table->unsignedInteger('attempt')->default(1);
            $table->unsignedInteger('duration_ms')->nullable();
            $table->string('error_message', 500)->nullable();
            $table->enum('status', ['pending', 'delivered', 'failed', 'retrying'])->default('pending');
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->foreign('endpoint_id')->references('id')->on('webhook_endpoints')->onDelete('cascade');

            $table->index(['endpoint_id', 'status', 'created_at'], 'idx_webhook_deliveries_ep_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_deliveries');
        Schema::dropIfExists('webhook_endpoints');
    }
};

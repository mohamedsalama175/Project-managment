<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Raw SLA Request Metrics (7-day TTL retention)
        Schema::create('sla_metrics', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->string('endpoint', 255);
            $table->string('method', 10);
            $table->unsignedSmallInteger('status_code');
            $table->decimal('duration_ms', 8, 2);
            $table->timestamp('timestamp')->useCurrent();

            $table->index('timestamp', 'idx_sla_timestamp');
            $table->index(['endpoint', 'timestamp'], 'idx_sla_endpoint_ts');
        });

        // 2. Hourly SLA Aggregations (Permanent retention)
        Schema::create('sla_metrics_hourly', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->timestamp('hour_bucket');
            $table->string('endpoint', 255);
            $table->unsignedInteger('total_requests');
            $table->unsignedInteger('error_count');
            $table->decimal('p50_ms', 8, 2);
            $table->decimal('p95_ms', 8, 2);
            $table->decimal('p99_ms', 8, 2);
            $table->timestamps();

            $table->unique(['hour_bucket', 'endpoint'], 'uq_sla_hour_endpoint');
            $table->index('hour_bucket', 'idx_sla_hour_bucket');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sla_metrics_hourly');
        Schema::dropIfExists('sla_metrics');
    }
};

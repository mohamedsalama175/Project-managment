<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_keys', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->char('organization_id', 26);
            $table->char('user_id', 26);
            $table->string('name', 120);
            $table->string('key_prefix', 20); // e.g. "dops_live_ab12cd34"
            $table->string('key_hash', 64)->unique(); // SHA-256 of plaintext token
            $table->json('scopes');
            $table->unsignedInteger('rate_limit_per_minute')->default(60);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            $table->index('organization_id');
            $table->index(['key_hash', 'revoked_at', 'expires_at'], 'idx_api_keys_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_keys');
    }
};

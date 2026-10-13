<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Push Tokens Table (Scoped by organization_id, user_id, token_hash)
        Schema::create('push_tokens', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('user_id', 26);
            $table->enum('platform', ['ios', 'android', 'web']);
            $table->string('token', 512);
            $table->string('token_hash', 64);
            $table->string('device_name', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['organization_id', 'user_id', 'token_hash'], 'uq_push_tokens_org_user_hash');
            $table->index(['organization_id', 'is_active'], 'idx_push_org_active');
        });

        // 2. SSO Configurations Table (renamed entity_id -> idp_entity_id, nullable attribute_mapping)
        Schema::create('sso_configurations', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26)->unique();
            $table->enum('provider', ['saml', 'oidc'])->default('oidc');
            $table->string('idp_entity_id', 512);
            $table->string('sso_url', 1024);
            $table->string('metadata_url', 1024)->nullable();
            $table->text('certificate')->nullable(); // encrypted cast
            $table->string('client_id', 255)->nullable();
            $table->string('client_secret', 2048)->nullable(); // encrypted cast
            $table->json('attribute_mapping')->nullable();
            $table->json('role_mapping')->nullable();
            $table->string('domain_verification_token', 64)->nullable();
            $table->timestamp('domain_verified_at')->nullable();
            $table->boolean('enabled')->default(false);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
        });

        // 3. SCIM API Tokens Table
        Schema::create('scim_tokens', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->string('name', 100);
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->index(['organization_id', 'expires_at'], 'idx_scim_tokens_org');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scim_tokens');
        Schema::dropIfExists('sso_configurations');
        Schema::dropIfExists('push_tokens');
    }
};

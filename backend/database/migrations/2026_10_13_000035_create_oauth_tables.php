<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. OAuth Clients
        Schema::create('oauth_clients', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->char('organization_id', 26);
            $table->char('user_id', 26)->nullable();
            $table->string('created_by_name', 120)->nullable();
            $table->string('created_by_email', 180)->nullable();
            $table->string('name', 120);
            $table->string('client_id', 64)->unique();
            $table->string('client_secret_hash', 64)->nullable();
            $table->boolean('is_confidential')->default(true);
            $table->boolean('is_active')->default(true);
            $table->json('redirect_uris');
            $table->json('scopes');
            $table->softDeletes();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });

        // 2. OAuth Authorization Codes (RFC 7636 PKCE)
        Schema::create('oauth_auth_codes', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('oauth_client_id', 26);
            $table->char('user_id', 26);
            $table->char('organization_id', 26);
            $table->json('scopes');
            $table->string('code_challenge', 128);
            $table->string('code_challenge_method', 10)->default('S256');
            $table->string('code_hash', 64)->unique();
            $table->string('redirect_uri', 500);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->foreign('oauth_client_id')->references('id')->on('oauth_clients')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            $table->index(['code_hash', 'used_at', 'expires_at'], 'idx_oauth_codes_lookup');
        });

        // 3. OAuth Access Tokens
        Schema::create('oauth_access_tokens', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('oauth_client_id', 26);
            $table->char('user_id', 26);
            $table->char('organization_id', 26);
            $table->string('token_hash', 64)->unique();
            $table->json('scopes');
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('oauth_client_id')->references('id')->on('oauth_clients')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            $table->index(['token_hash', 'revoked_at', 'expires_at'], 'idx_oauth_tokens_lookup');
        });

        // 4. OAuth Refresh Tokens (Decoupled with rotation chain)
        Schema::create('oauth_refresh_tokens', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('oauth_client_id', 26);
            $table->char('user_id', 26)->nullable();
            $table->string('user_name_snapshot', 120)->nullable();
            $table->char('organization_id', 26);
            $table->string('refresh_token_hash', 64)->unique();
            $table->char('rotated_to', 26)->nullable(); // Soft reference to next token in rotation chain
            $table->json('scopes');
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('oauth_client_id')->references('id')->on('oauth_clients')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');

            $table->index('rotated_to', 'idx_oauth_ref_rotated');
            $table->index(['refresh_token_hash', 'rotated_to', 'revoked_at', 'expires_at'], 'idx_oauth_ref_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_refresh_tokens');
        Schema::dropIfExists('oauth_access_tokens');
        Schema::dropIfExists('oauth_auth_codes');
        Schema::dropIfExists('oauth_clients');
    }
};

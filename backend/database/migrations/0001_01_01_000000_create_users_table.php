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
        Schema::create('users', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->string('name');
            $table->string('email');
            // NULL-safe active email uniqueness via virtual generated column
            $table->string('active_email')->virtualAs("CASE WHEN deleted_at IS NULL THEN email ELSE NULL END")->nullable()->unique();
            $table->string('password');
            $table->string('phone', 50)->nullable();
            $table->string('avatar_path')->nullable();
            $table->string('job_title', 150)->default('Team Member');
            $table->string('department', 100)->default('Engineering');
            $table->json('skills')->nullable();
            $table->decimal('weekly_capacity_hours', 5, 2)->default(40.00);
            $table->enum('status', ['active', 'on_leave', 'inactive'])->default('active');
            $table->string('color', 30)->default('#6366f1');
            $table->boolean('must_change_password')->default(false);
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['department', 'status']);
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->char('user_id', 26)->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};

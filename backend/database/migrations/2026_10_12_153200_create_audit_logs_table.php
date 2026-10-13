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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->char('project_id', 26)->nullable();
            $table->char('task_id', 26)->nullable();
            $table->string('entity_type', 100);
            $table->char('entity_id', 26);
            $table->char('actor_id', 26)->nullable();
            $table->string('actor_name', 255);
            $table->string('actor_role', 50);
            $table->string('action', 60);
            $table->string('field_name', 100)->nullable();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->text('reason')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['project_id', 'created_at']);
            $table->index(['entity_type', 'entity_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('task_watchers')) {
            Schema::create('task_watchers', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('task_id', 26);
                $table->char('user_id', 26);
                $table->timestamp('created_at')->nullable();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->foreign('task_id')
                    ->references('id')
                    ->on('tasks')
                    ->onDelete('cascade');

                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');

                $table->unique(['task_id', 'user_id'], 'idx_task_watchers_unique');
                $table->index(['user_id', 'task_id'], 'idx_user_task_watcher');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_watchers');
    }
};

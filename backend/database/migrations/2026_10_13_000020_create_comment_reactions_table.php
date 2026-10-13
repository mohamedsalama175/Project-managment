<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('comment_reactions')) {
            Schema::create('comment_reactions', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('comment_id', 26);
                $table->char('user_id', 26);
                $table->string('emoji', 32);
                $table->timestamp('created_at')->nullable();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->foreign('comment_id')
                    ->references('id')
                    ->on('task_comments')
                    ->onDelete('cascade');

                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');

                $table->unique(['comment_id', 'user_id', 'emoji'], 'idx_comment_user_emoji_unique');
                $table->index(['comment_id', 'emoji'], 'idx_comment_emoji');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_reactions');
    }
};

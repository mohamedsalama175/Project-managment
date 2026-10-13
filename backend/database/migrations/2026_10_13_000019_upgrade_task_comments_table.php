<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('task_comments', function (Blueprint $table) {
            if (!Schema::hasColumn('task_comments', 'parent_comment_id')) {
                $table->char('parent_comment_id', 26)->nullable()->after('user_id');
                $table->foreign('parent_comment_id')
                    ->references('id')
                    ->on('task_comments')
                    ->onDelete('cascade');
            }

            if (!Schema::hasColumn('task_comments', 'mentions')) {
                $table->json('mentions')->nullable()->after('content');
            }

            if (!Schema::hasColumn('task_comments', 'edited_at')) {
                $table->timestamp('edited_at')->nullable()->after('mentions');
            }

            if (!Schema::hasColumn('task_comments', 'deleted_at')) {
                $table->softDeletes();
            }

            $table->index(['task_id', 'created_at'], 'idx_task_comments_task_created');
        });
    }

    public function down(): void
    {
        Schema::table('task_comments', function (Blueprint $table) {
            $table->dropIndex('idx_task_comments_task_created');
            if (Schema::hasColumn('task_comments', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
            if (Schema::hasColumn('task_comments', 'edited_at')) {
                $table->dropColumn('edited_at');
            }
            if (Schema::hasColumn('task_comments', 'mentions')) {
                $table->dropColumn('mentions');
            }
            if (Schema::hasColumn('task_comments', 'parent_comment_id')) {
                $table->dropForeign(['parent_comment_id']);
                $table->dropColumn('parent_comment_id');
            }
        });
    }
};

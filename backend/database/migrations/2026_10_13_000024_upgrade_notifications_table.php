<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('notifications', 'user_id')) {
                $table->char('user_id', 26)->after('organization_id');
            }

            if (!Schema::hasColumn('notifications', 'title')) {
                $table->string('title', 255)->default('Notification')->after('type');
            }

            if (!Schema::hasColumn('notifications', 'body')) {
                $table->text('body')->after('title');
            }

            if (!Schema::hasColumn('notifications', 'action_url')) {
                $table->string('action_url', 500)->nullable()->after('body');
            }

            if (!Schema::hasColumn('notifications', 'event_type')) {
                $table->string('event_type', 100)->default('general')->after('action_url');
            }

            if (!Schema::hasColumn('notifications', 'task_id')) {
                $table->char('task_id', 26)->nullable()->after('event_type');
            }

            if (!Schema::hasColumn('notifications', 'project_id')) {
                $table->char('project_id', 26)->nullable()->after('task_id');
            }

            $table->index(['user_id', 'read_at', 'created_at'], 'idx_notifications_user_inbox');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('idx_notifications_user_inbox');
            if (Schema::hasColumn('notifications', 'project_id')) $table->dropColumn('project_id');
            if (Schema::hasColumn('notifications', 'task_id')) $table->dropColumn('task_id');
            if (Schema::hasColumn('notifications', 'event_type')) $table->dropColumn('event_type');
            if (Schema::hasColumn('notifications', 'action_url')) $table->dropColumn('action_url');
            if (Schema::hasColumn('notifications', 'body')) $table->dropColumn('body');
            if (Schema::hasColumn('notifications', 'title')) $table->dropColumn('title');
            if (Schema::hasColumn('notifications', 'user_id')) $table->dropColumn('user_id');
        });
    }
};

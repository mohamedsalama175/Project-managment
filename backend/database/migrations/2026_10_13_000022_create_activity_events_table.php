<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('activity_events')) {
            Schema::create('activity_events', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('project_id', 26)->nullable();
                $table->char('task_id', 26)->nullable();
                $table->char('actor_id', 26)->nullable();
                $table->string('action', 100);
                $table->json('metadata')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('restrict');

                $table->foreign('project_id')
                    ->references('id')
                    ->on('projects')
                    ->onDelete('restrict');

                $table->foreign('task_id')
                    ->references('id')
                    ->on('tasks')
                    ->onDelete('restrict');

                $table->foreign('actor_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('restrict');

                $table->index(['project_id', 'created_at'], 'idx_activity_events_project');
                $table->index(['task_id', 'created_at'], 'idx_activity_events_task');
                $table->index(['organization_id', 'created_at'], 'idx_activity_events_org');
            });

            if (DB::getDriverName() === 'mysql') {
                DB::unprepared("
                    CREATE TRIGGER trg_activity_events_prevent_delete
                    BEFORE DELETE ON activity_events
                    FOR EACH ROW
                    BEGIN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'ACTIVITY_EVENT_IMMUTABLE: Records in activity_events cannot be deleted.';
                    END;
                ");

                DB::unprepared("
                    CREATE TRIGGER trg_activity_events_prevent_update
                    BEFORE UPDATE ON activity_events
                    FOR EACH ROW
                    BEGIN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'ACTIVITY_EVENT_IMMUTABLE: Records in activity_events cannot be updated.';
                    END;
                ");
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::unprepared("DROP TRIGGER IF EXISTS trg_activity_events_prevent_delete;");
            DB::unprepared("DROP TRIGGER IF EXISTS trg_activity_events_prevent_update;");
        }
        Schema::dropIfExists('activity_events');
    }
};

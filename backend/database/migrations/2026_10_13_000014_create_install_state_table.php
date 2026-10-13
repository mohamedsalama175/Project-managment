<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('install_state', function (Blueprint $table) {
            $table->string('id', 50)->primary(); // Fixed singleton ID: 'deliverops_install_singleton'
            $table->timestamp('installed_at')->useCurrent();
            $table->enum('installed_via', ['cli', 'web', 'api'])->default('cli');
            $table->string('installed_by_ip', 45)->nullable();
            $table->char('admin_user_id', 26);
            $table->string('app_version', 20)->default('1.0.0');
            $table->timestamps();

            $table->foreign('admin_user_id', 'fk_install_state_admin')
                ->references('id')
                ->on('users')
                ->onDelete('restrict');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::unprepared("
                CREATE TRIGGER trg_install_state_prevent_delete
                BEFORE DELETE ON install_state
                FOR EACH ROW
                BEGIN
                    SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'INSTALL_STATE_IMMUTABLE: Records in install_state cannot be deleted.';
                END;
            ");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::unprepared("DROP TRIGGER IF EXISTS trg_install_state_prevent_delete;");
        }
        Schema::dropIfExists('install_state');
    }
};

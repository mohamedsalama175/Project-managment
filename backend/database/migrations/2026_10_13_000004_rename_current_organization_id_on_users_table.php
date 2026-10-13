<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (DB::getDriverName() !== 'sqlite') {
                $table->dropForeign('fk_users_current_org');
            }

            $table->renameColumn('current_organization_id', 'default_organization_id');

            if (DB::getDriverName() !== 'sqlite') {
                $table->foreign('default_organization_id', 'fk_users_default_org')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (DB::getDriverName() !== 'sqlite') {
                $table->dropForeign('fk_users_default_org');
            }

            $table->renameColumn('default_organization_id', 'current_organization_id');

            if (DB::getDriverName() !== 'sqlite') {
                $table->foreign('current_organization_id', 'fk_users_current_org')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('set null');
            }
        });
    }
};

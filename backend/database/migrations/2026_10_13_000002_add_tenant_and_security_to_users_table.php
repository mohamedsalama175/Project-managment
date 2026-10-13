<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->char('current_organization_id', 26)->nullable()->after('id');
            $table->unsignedInteger('failed_login_attempts')->default(0)->after('must_change_password');
            $table->timestamp('locked_until')->nullable()->after('failed_login_attempts');
            $table->boolean('mfa_enabled')->default(false)->after('locked_until');
            $table->string('mfa_secret', 255)->nullable()->after('mfa_enabled');
            $table->timestamp('mfa_confirmed_at')->nullable()->after('mfa_secret');

            $table->foreign('current_organization_id', 'fk_users_current_org')
                ->references('id')
                ->on('organizations')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign('fk_users_current_org');
            $table->dropColumn([
                'current_organization_id',
                'failed_login_attempts',
                'locked_until',
                'mfa_enabled',
                'mfa_secret',
                'mfa_confirmed_at',
            ]);
        });
    }
};

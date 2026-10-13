<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Users table additions for Phase 1
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'mfa_enabled_at')) {
                $table->timestamp('mfa_enabled_at')->nullable()->after('mfa_confirmed_at');
            }
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('mfa_enabled_at');
            }
            if (!Schema::hasColumn('users', 'last_login_ip')) {
                $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
            }
            if (!Schema::hasColumn('users', 'timezone')) {
                $table->string('timezone', 50)->default('UTC')->after('color');
            }
            if (!Schema::hasColumn('users', 'locale')) {
                $table->string('locale', 10)->default('en')->after('timezone');
            }
        });

        // 2. Auth events table additions
        if (Schema::hasTable('auth_events')) {
            Schema::table('auth_events', function (Blueprint $table) {
                if (!Schema::hasColumn('auth_events', 'email_attempted')) {
                    $table->string('email_attempted', 255)->nullable()->after('user_id');
                }
                if (!Schema::hasColumn('auth_events', 'event')) {
                    $table->string('event', 60)->nullable()->after('event_type');
                    $table->index('event', 'idx_auth_events_event');
                }
                if (!Schema::hasColumn('auth_events', 'geo_country')) {
                    $table->string('geo_country', 10)->nullable()->after('user_agent');
                }
            });
        }

        // 3. Sessions table enhancements for device information
        if (Schema::hasTable('sessions')) {
            Schema::table('sessions', function (Blueprint $table) {
                if (!Schema::hasColumn('sessions', 'device_type')) {
                    $table->string('device_type', 50)->nullable()->after('user_agent');
                }
                if (!Schema::hasColumn('sessions', 'browser')) {
                    $table->string('browser', 50)->nullable()->after('device_type');
                }
                if (!Schema::hasColumn('sessions', 'platform')) {
                    $table->string('platform', 50)->nullable()->after('browser');
                }
                if (!Schema::hasColumn('sessions', 'last_active_at')) {
                    $table->timestamp('last_active_at')->nullable()->after('platform');
                }
            });
        }

        // 4. Dedicated encrypted MFA secrets table
        if (!Schema::hasTable('mfa_secrets')) {
            Schema::create('mfa_secrets', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('user_id', 26)->unique('uq_mfa_secrets_user');
                $table->text('secret');
                $table->timestamps();

                $table->foreign('user_id', 'fk_mfa_secrets_user')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');
            });
        }

        // 5. Dedicated hashed single-use MFA backup codes table
        if (!Schema::hasTable('mfa_backup_codes')) {
            Schema::create('mfa_backup_codes', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('user_id', 26);
                $table->string('code_hash');
                $table->timestamp('used_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'used_at'], 'idx_mfa_backup_codes_lookup');

                $table->foreign('user_id', 'fk_mfa_backup_codes_user')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('mfa_backup_codes');
        Schema::dropIfExists('mfa_secrets');

        if (Schema::hasTable('sessions')) {
            Schema::table('sessions', function (Blueprint $table) {
                $columns = ['device_type', 'browser', 'platform', 'last_active_at'];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('sessions', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('auth_events')) {
            Schema::table('auth_events', function (Blueprint $table) {
                if (Schema::hasColumn('auth_events', 'event')) {
                    $table->dropIndex('idx_auth_events_event');
                    $table->dropColumn('event');
                }
                if (Schema::hasColumn('auth_events', 'email_attempted')) {
                    $table->dropColumn('email_attempted');
                }
                if (Schema::hasColumn('auth_events', 'geo_country')) {
                    $table->dropColumn('geo_country');
                }
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $columns = ['mfa_enabled_at', 'last_login_at', 'last_login_ip', 'timezone', 'locale'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

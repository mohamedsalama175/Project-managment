<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('notification_preferences')) {
            Schema::create('notification_preferences', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('user_id', 26);
                $table->string('event_type', 100);
                $table->string('channel', 50);
                $table->boolean('enabled')->default(true);
                $table->string('digest_frequency', 20)->default('instant');
                $table->time('quiet_hours_start')->nullable();
                $table->time('quiet_hours_end')->nullable();
                $table->timestamps();

                $table->foreign('organization_id')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');

                $table->unique(
                    ['user_id', 'organization_id', 'event_type', 'channel'],
                    'idx_user_org_event_channel_unique'
                );
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};

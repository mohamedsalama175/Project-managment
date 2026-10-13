<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('onboarding_progress', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('user_id', 26);
            $table->enum('flow_type', ['owner', 'invited_member'])->default('owner');
            $table->unsignedTinyInteger('current_step')->default(1);
            $table->json('completed_steps');
            $table->json('skipped_steps');
            $table->boolean('is_completed')->default(false);
            $table->boolean('tour_completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'organization_id'], 'uq_onboarding_user_org');
            $table->foreign('organization_id', 'fk_onboarding_org')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');
            $table->foreign('user_id', 'fk_onboarding_user')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
            $table->index(['organization_id', 'is_completed'], 'idx_onboarding_org_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_progress');
    }
};

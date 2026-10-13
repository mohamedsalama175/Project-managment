<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_templates', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26)->nullable();
            $table->string('name', 150);
            $table->string('slug', 160);
            $table->text('description')->nullable();
            $table->string('industry', 100)->default('General');
            $table->string('category', 50)->default('standard');
            $table->boolean('is_system')->default(false);
            $table->unsignedInteger('version')->default(1);
            $table->json('template_data');
            $table->char('created_by_id', 26)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'slug'], 'uq_templates_org_slug');
            $table->foreign('organization_id', 'fk_templates_organization')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');
            $table->foreign('created_by_id', 'fk_templates_creator')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
            $table->index(['organization_id', 'is_system', 'industry'], 'idx_templates_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_templates');
    }
};

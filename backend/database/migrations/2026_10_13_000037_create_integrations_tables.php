<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Third-Party Integration Connections (Slack, Teams, GitHub, Google Calendar)
        Schema::create('integration_connections', function (Blueprint $table) {
            $table->char('id', 26)->primary(); // ULID
            $table->char('organization_id', 26);
            $table->string('provider', 50); // Validated against config('deliverops.integrations.connectors')
            $table->string('name', 120);
            $table->string('external_account_id', 120);
            $table->string('access_token', 2048); // Encrypted via Crypt::encryptString
            $table->string('refresh_token', 2048)->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->json('settings');
            $table->boolean('is_active')->default(true);
            $table->integer('active_slot')->storedAs("CASE WHEN is_active = 1 THEN 1 ELSE NULL END");
            $table->char('created_by_id', 26);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('created_by_id')->references('id')->on('users')->onDelete('restrict');

            // Unique only when active, allowing clean reinstallation after disconnection
            $table->unique(['organization_id', 'provider', 'external_account_id', 'active_slot'], 'uq_integ_active_connection');
        });

        // 2. Commit Links (GitHub / GitLab tasks integration)
        Schema::create('commit_links', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('task_id', 26);
            $table->string('provider', 50);
            $table->string('repository', 200); // e.g. "acme/deliverops"
            $table->string('commit_sha', 64);
            $table->string('author_name', 120);
            $table->string('author_email', 180)->nullable();
            $table->text('message');
            $table->timestamp('committed_at');
            $table->string('url', 1000);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');

            $table->index('task_id');
            $table->unique(['organization_id', 'repository', 'commit_sha', 'task_id'], 'uq_commits_org_repo_sha');
        });

        // 3. Import Batches (Audit trail of competitor project imports)
        Schema::create('import_batches', function (Blueprint $table) {
            $table->char('id', 26)->primary();
            $table->char('organization_id', 26);
            $table->char('project_id', 26);
            $table->string('provider', 50); // jira, asana, monday, msproject
            $table->string('file_name', 255);
            $table->json('summary');
            $table->enum('status', ['completed', 'failed'])->default('completed');
            $table->char('created_by_id', 26);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('created_by_id')->references('id')->on('users')->onDelete('restrict');

            $table->index('project_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_batches');
        Schema::dropIfExists('commit_links');
        Schema::dropIfExists('integration_connections');
    }
};

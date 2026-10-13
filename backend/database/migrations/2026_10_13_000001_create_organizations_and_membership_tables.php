<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Organizations Table
        if (!Schema::hasTable('organizations')) {
            Schema::create('organizations', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->string('name');
                $table->string('slug', 100)->unique('uq_organizations_slug');
                $table->string('domain')->nullable();
                $table->string('industry', 100)->nullable();
                $table->string('region', 50)->default('MENA');
                $table->enum('plan', ['free', 'pro', 'enterprise'])->default('free');
                $table->timestamp('trial_ends_at')->nullable();
                $table->string('billing_email')->nullable();
                $table->string('timezone', 50)->default('UTC');
                $table->string('default_calendar', 50)->default('standard_5d_40h');
                $table->string('logo_path')->nullable();
                $table->json('settings')->nullable();
                $table->json('plan_limits')->nullable();
                $table->enum('status', ['active', 'trialing', 'suspended'])->default('active');
                $table->timestamps();
                $table->softDeletes();

                $table->index(['status', 'plan'], 'idx_organizations_status_plan');
                $table->index('domain', 'idx_organizations_domain');
            });

            if (DB::getDriverName() === 'mysql') {
                DB::statement("ALTER TABLE organizations ADD CONSTRAINT chk_org_region CHECK (region IN ('MENA', 'EMEA', 'NA', 'APAC', 'LATAM'))");
            }
        }

        // 2. Organization Users Table (Singular Ownership Virtual Index)
        if (!Schema::hasTable('organization_users')) {
            Schema::create('organization_users', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('user_id', 26);
                $table->boolean('is_owner')->default(false);
                $table->char('owner_org_id', 26)
                    ->virtualAs("CASE WHEN is_owner = 1 THEN organization_id ELSE NULL END")
                    ->nullable();
                $table->timestamp('joined_at')->useCurrent();
                $table->char('invited_by_id', 26)->nullable();
                $table->timestamps();

                $table->unique(['organization_id', 'user_id'], 'uq_org_user_membership');
                $table->unique('owner_org_id', 'uq_org_single_owner');
                $table->index('user_id', 'idx_org_user_user');

                $table->foreign('organization_id', 'fk_org_users_organization')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->foreign('user_id', 'fk_org_users_user')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');

                $table->foreign('invited_by_id', 'fk_org_users_inviter')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');
            });
        }

        // 3. Organization Invitations Table (token_hash only, no plain token column)
        if (!Schema::hasTable('organization_invitations')) {
            Schema::create('organization_invitations', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->string('email');
                $table->string('role', 50)->default('contributor');
                $table->string('token_hash', 64)->unique('uq_org_invites_token_hash');
                $table->char('invited_by_id', 26)->nullable();
                $table->string('invited_by_name')->nullable();
                $table->string('invited_by_email')->nullable();
                $table->timestamp('expires_at');
                $table->timestamp('accepted_at')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'email'], 'idx_org_invites_lookup');
                $table->index('expires_at', 'idx_org_invites_expires');

                $table->foreign('organization_id', 'fk_org_invites_organization')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->foreign('invited_by_id', 'fk_org_invites_invited_by')
                    ->references('id')
                    ->on('users')
                    ->onDelete('set null');
            });
        }

        // 4. Normalized MFA Recovery Codes Table
        if (!Schema::hasTable('mfa_recovery_codes')) {
            Schema::create('mfa_recovery_codes', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('user_id', 26);
                $table->string('code_hash');
                $table->timestamp('used_at')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['user_id', 'used_at'], 'idx_mfa_recovery_user');

                $table->foreign('user_id', 'fk_mfa_recovery_user')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');
            });
        }

        // 5. Auth Events Table (Forensic retention, no FK to organizations)
        if (!Schema::hasTable('auth_events')) {
            Schema::create('auth_events', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('user_id', 26)->nullable();
                $table->char('organization_id', 26)->nullable();
                $table->enum('event_type', [
                    'login_success',
                    'login_failed',
                    'lockout',
                    'logout',
                    'logout_all',
                    'mfa_prompted',
                    'mfa_passed',
                    'mfa_failed',
                    'password_reset_requested',
                    'password_reset_completed',
                    'session_revoked',
                    'session_revoked_all',
                    'invitation_dispatched',
                    'invitation_accepted',
                    'invitation_revoked',
                    'member_removed',
                    'role_updated',
                    'ownership_transferred'
                ]);
                $table->string('ip_address', 45);
                $table->string('user_agent', 255)->nullable();
                $table->json('payload')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['user_id', 'event_type'], 'idx_auth_events_user');
                $table->index(['organization_id', 'created_at'], 'idx_auth_events_org');
                $table->index(['event_type', 'created_at'], 'idx_auth_events_type_created');
            });
        }

        // 6. Update password_reset_tokens table with token_hash and expires_at
        if (Schema::hasTable('password_reset_tokens')) {
            Schema::table('password_reset_tokens', function (Blueprint $table) {
                if (!Schema::hasColumn('password_reset_tokens', 'token_hash')) {
                    $table->string('token_hash', 64)->nullable()->after('token');
                    $table->index('token_hash', 'idx_pwd_reset_token_hash');
                }
                if (!Schema::hasColumn('password_reset_tokens', 'expires_at')) {
                    $table->timestamp('expires_at')->nullable()->after('created_at');
                }
            });
        }

        // 7. Ensure Baseline Versions and Risk Task Blockers tables exist
        if (!Schema::hasTable('baseline_versions')) {
            Schema::create('baseline_versions', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('project_id', 26);
                $table->integer('version_number')->default(1);
                $table->json('snapshot_data')->nullable();
                $table->char('locked_by_id', 26)->nullable();
                $table->timestamp('locked_at')->nullable();
                $table->timestamps();

                $table->index('organization_id', 'idx_baseline_versions_org');
                $table->index(['project_id', 'version_number'], 'idx_baseline_versions_proj_ver');

                $table->foreign('organization_id', 'fk_baseline_versions_org')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->foreign('project_id', 'fk_baseline_versions_project')
                    ->references('id')
                    ->on('projects')
                    ->onDelete('cascade');
            });
        }

        if (!Schema::hasTable('risk_task_blockers')) {
            Schema::create('risk_task_blockers', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->char('organization_id', 26);
                $table->char('risk_id', 26);
                $table->char('task_id', 26);
                $table->timestamps();

                $table->unique(['risk_id', 'task_id'], 'uq_risk_task_blocker');
                $table->index('organization_id', 'idx_risk_task_blockers_org');

                $table->foreign('organization_id', 'fk_risk_task_blockers_org')
                    ->references('id')
                    ->on('organizations')
                    ->onDelete('cascade');

                $table->foreign('risk_id', 'fk_risk_task_blockers_risk')
                    ->references('id')
                    ->on('project_risks')
                    ->onDelete('cascade');

                $table->foreign('task_id', 'fk_risk_task_blockers_task')
                    ->references('id')
                    ->on('tasks')
                    ->onDelete('cascade');
            });
        }

        // 8. Ensure Notifications & Attachments tables exist for tenant scoping
        if (!Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->string('type');
                $table->char('notifiable_id', 26);
                $table->string('notifiable_type');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                $table->index(['notifiable_type', 'notifiable_id'], 'idx_notifiable');
            });
        }

        if (!Schema::hasTable('attachments')) {
            Schema::create('attachments', function (Blueprint $table) {
                $table->char('id', 26)->primary();
                $table->string('attachable_type');
                $table->char('attachable_id', 26);
                $table->string('filename');
                $table->string('file_path');
                $table->integer('file_size_bytes');
                $table->string('mime_type');
                $table->char('uploaded_by', 26)->nullable();
                $table->timestamps();

                $table->index(['attachable_type', 'attachable_id'], 'idx_attachable');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('risk_task_blockers');
        Schema::dropIfExists('baseline_versions');

        if (Schema::hasTable('password_reset_tokens')) {
            Schema::table('password_reset_tokens', function (Blueprint $table) {
                if (Schema::hasColumn('password_reset_tokens', 'token_hash')) {
                    $table->dropIndex('idx_pwd_reset_token_hash');
                    $table->dropColumn('token_hash');
                }
                if (Schema::hasColumn('password_reset_tokens', 'expires_at')) {
                    $table->dropColumn('expires_at');
                }
            });
        }

        Schema::dropIfExists('auth_events');
        Schema::dropIfExists('mfa_recovery_codes');
        Schema::dropIfExists('organization_invitations');
        Schema::dropIfExists('organization_users');
        Schema::dropIfExists('organizations');
    }
};

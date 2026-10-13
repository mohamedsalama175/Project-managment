<?php

use App\Modules\Audit\Controllers\AuditLogController;
use App\Modules\Audit\Controllers\ImportExportController;
use App\Modules\Baselines\Controllers\BaselineController;
use App\Modules\Collaboration\Controllers\ActivityEventController;
use App\Modules\Collaboration\Controllers\AttachmentController;
use App\Modules\Collaboration\Controllers\CommentReactionController;
use App\Modules\Collaboration\Controllers\TaskCommentController;
use App\Modules\Collaboration\Controllers\TaskReviewController;
use App\Modules\Collaboration\Controllers\TaskWatcherController;
use App\Modules\Notifications\Controllers\NotificationController;
use App\Modules\Notifications\Controllers\NotificationPreferenceController;
use App\Modules\Identity\Controllers\AuthController;
use App\Modules\Identity\Controllers\MfaController;
use App\Modules\Identity\Controllers\RolePermissionController;
use App\Modules\Identity\Controllers\UserController;
use App\Modules\Projects\Controllers\ProjectController;
use App\Modules\Risks\Controllers\ProjectRiskController;
use App\Modules\Tasks\Controllers\TaskController;
use App\Modules\Onboarding\Controllers\OnboardingController;
use App\Modules\System\Controllers\InstallController;
use App\Modules\System\Controllers\SystemStatusController;
use App\Modules\Tasks\Controllers\TaskImportController;
use App\Modules\Templates\Controllers\ProjectTemplateController;
use App\Modules\Tenancy\Controllers\OrganizationController;
use App\Modules\Tenancy\Controllers\OrganizationInvitationController;
use App\Modules\Tenancy\Controllers\OrganizationMemberController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // 1. Public Authentication & System Status Routes
    Route::get('/system/status', [SystemStatusController::class, 'status']);
    Route::get('/system/install/status', [InstallController::class, 'status']);
    Route::post('/system/install', [InstallController::class, 'install'])->middleware('throttle:install');
    Route::post('/auth/signup', [AuthController::class, 'signup'])->middleware('throttle:auth.signup');
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:guest.register');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/mfa/challenge', [MfaController::class, 'challenge'])->middleware('throttle:guest.mfa_challenge');
    Route::get('/auth/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify');
    Route::post('/auth/email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:auth.email_resend');
    Route::post('/auth/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth.forgot_password');
    Route::post('/auth/password/reset', [AuthController::class, 'resetPassword']);
    Route::post('/organizations/invitations/accept', [OrganizationInvitationController::class, 'accept']);
    Route::post('/invitations/{token}/accept', [OrganizationInvitationController::class, 'acceptWithToken']);

    // 2. Authenticated Routes
    Route::middleware('auth:sanctum')->group(function () {
        // Session & Profile
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/logout-all', [AuthController::class, 'logoutAll'])->middleware('throttle:user.logout_all');
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/me', [AuthController::class, 'updateProfile']);
        Route::put('/auth/password', [AuthController::class, 'changePassword'])->middleware('throttle:user.password_change');
        Route::post('/auth/password/change', [AuthController::class, 'changePassword'])->middleware('throttle:user.password_change');
        Route::post('/auth/switch-organization', [OrganizationController::class, 'switchAuthOrg']);

        // Session Management (Deliverable 6)
        Route::get('/auth/sessions', [AuthController::class, 'getSessions']);
        Route::delete('/auth/sessions/{id}', [AuthController::class, 'revokeSession']);
        Route::delete('/auth/sessions', [AuthController::class, 'revokeOtherSessions']);

        // Multi-Factor Authentication (Deliverable 5)
        Route::post('/auth/mfa/setup', [MfaController::class, 'setup']);
        Route::post('/auth/mfa/verify', [MfaController::class, 'verify'])->middleware('throttle:user.mfa_confirm');
        Route::post('/auth/mfa/confirm', [MfaController::class, 'confirm'])->middleware('throttle:user.mfa_confirm');
        Route::post('/auth/mfa/disable', [MfaController::class, 'disable']);
        Route::get('/auth/mfa/recovery-codes/status', [MfaController::class, 'recoveryCodesStatus']);
        Route::post('/auth/mfa/recovery-codes/regenerate', [MfaController::class, 'regenerateRecoveryCodes']);

        // Admin Audit Trail (Deliverable 9)
        Route::get('/admin/auth-events', [AuthController::class, 'adminAuthEvents']);

        // Organizations (Global Management & Switching)
        Route::post('/organizations', [OrganizationController::class, 'store']);
        Route::post('/organizations/switch', [OrganizationController::class, 'switch']);
        Route::post('/organizations/{id}/invitations', [OrganizationInvitationController::class, 'inviteByOrgId'])->middleware('throttle:org.invitations');

        // Users & Roles Domain
        Route::apiResource('users', UserController::class);
        Route::get('/permissions', [RolePermissionController::class, 'permissionsList']);
        Route::get('/roles', [RolePermissionController::class, 'index']);
        Route::post('/roles', [RolePermissionController::class, 'store']);
        Route::put('/roles/{role}', [RolePermissionController::class, 'update']);
        Route::delete('/roles/{role}', [RolePermissionController::class, 'destroy']);

        // Onboarding Wizard Domain (Steps 1-4 and Tour)
        Route::get('/onboarding/progress', [OnboardingController::class, 'progress']);
        Route::post('/onboarding/step/{step}', [OnboardingController::class, 'saveStep']);
        Route::post('/onboarding/step/{step}/skip', [OnboardingController::class, 'skipStep']);
        Route::post('/onboarding/tour/complete', [OnboardingController::class, 'completeTour']);

        // Tenant-Scoped Onboarding (Steps 5-7 & Sample Data)
        Route::middleware('tenant.onboarding')->group(function () {
            Route::post('/sample-data/opt-in', [OnboardingController::class, 'optInSampleData']);
            Route::delete('/sample-data/purge', [OnboardingController::class, 'purgeSampleData']);
        });

        // 3. Tenant-Scoped Domain Routes
        Route::middleware(['auth:sanctum', 'tenant', 'email.verified'])->group(function () {
            // Organization Current Context & Member Governance
            Route::get('/organizations/current', [OrganizationController::class, 'current']);
            Route::put('/organizations/current', [OrganizationController::class, 'update']);
            Route::post('/organizations/current/transfer-ownership', [OrganizationController::class, 'transferOwnership']);

            Route::get('/organizations/current/members', [OrganizationMemberController::class, 'index']);
            Route::get('/organizations/current/members/{user}', [OrganizationMemberController::class, 'show']);
            Route::put('/organizations/current/members/{user}', [OrganizationMemberController::class, 'update']);
            Route::delete('/organizations/current/members/{user}', [OrganizationMemberController::class, 'destroy']);

            Route::get('/organizations/invitations', [OrganizationInvitationController::class, 'index']);
            Route::post('/organizations/invitations', [OrganizationInvitationController::class, 'invite'])->middleware('throttle:user.invitations');
            Route::delete('/organizations/invitations/{invitation}', [OrganizationInvitationController::class, 'revoke']);
            Route::post('/organizations/invitations/{invitation}/resend', [OrganizationInvitationController::class, 'resend']);

            // Projects Domain
            Route::apiResource('projects', ProjectController::class);
            Route::post('/projects/{project}/restore', [ProjectController::class, 'restore']);
            Route::post('/projects/{project}/members', [ProjectController::class, 'addMember']);
            Route::delete('/projects/{project}/members/{user}', [ProjectController::class, 'removeMember']);

            // Tasks & WBS Hierarchy Domain
            Route::get('/projects/{project}/tasks', [TaskController::class, 'index']);
            Route::post('/projects/{project}/tasks', [TaskController::class, 'store']);
            Route::get('/projects/{project}/tasks/{task}', [TaskController::class, 'show']);
            Route::put('/projects/{project}/tasks/{task}', [TaskController::class, 'update']);
            Route::delete('/projects/{project}/tasks/{task}', [TaskController::class, 'destroy']);
            Route::post('/projects/{project}/tasks/reorder', [TaskController::class, 'reorder']);
            Route::get('/projects/{project}/critical-path', [TaskController::class, 'criticalPath']);

            // Risks Domain
            Route::get('/projects/{project}/risks', [ProjectRiskController::class, 'index']);
            Route::post('/projects/{project}/risks', [ProjectRiskController::class, 'store']);
            Route::get('/projects/{project}/risks/{risk}', [ProjectRiskController::class, 'show']);
            Route::put('/projects/{project}/risks/{risk}', [ProjectRiskController::class, 'update']);
            Route::delete('/projects/{project}/risks/{risk}', [ProjectRiskController::class, 'destroy']);

            // Baselines & Variance Domain
            Route::post('/projects/{project}/baselines/lock', [BaselineController::class, 'lock']);
            Route::post('/projects/{project}/baselines/clear', [BaselineController::class, 'clear']);
            Route::get('/projects/{project}/baselines/variance', [BaselineController::class, 'variance']);

            // Collaboration: Review Workflow Domain
            Route::post('/projects/{project}/tasks/{task}/review/request', [TaskReviewController::class, 'requestReview']);
            Route::post('/projects/{project}/tasks/{task}/review/approve', [TaskReviewController::class, 'approve']);
            Route::post('/projects/{project}/tasks/{task}/review/reject', [TaskReviewController::class, 'reject']);

            // Collaboration: Task Discussion / Comments Domain
            Route::get('/projects/{project}/tasks/{task}/comments', [TaskCommentController::class, 'index']);
            Route::post('/projects/{project}/tasks/{task}/comments', [TaskCommentController::class, 'store']);
            Route::put('/projects/{project}/tasks/{task}/comments/{comment}', [TaskCommentController::class, 'update']);
            Route::delete('/projects/{project}/tasks/{task}/comments/{comment}', [TaskCommentController::class, 'destroy']);

            // Collaboration: Reactions Domain
            Route::post('/comments/{comment}/reactions', [CommentReactionController::class, 'store']);
            Route::delete('/comments/{comment}/reactions/{emoji}', [CommentReactionController::class, 'destroy']);

            // Collaboration: Task Watchers Domain
            Route::get('/projects/{project}/tasks/{task}/watchers', [TaskWatcherController::class, 'index']);
            Route::post('/projects/{project}/tasks/{task}/watchers', [TaskWatcherController::class, 'store']);
            Route::delete('/projects/{project}/tasks/{task}/watchers', [TaskWatcherController::class, 'destroy']);
            Route::post('/projects/{project}/tasks/{task}/watch', [TaskWatcherController::class, 'store']);
            Route::delete('/projects/{project}/tasks/{task}/watch', [TaskWatcherController::class, 'destroy']);

            // Collaboration: Activity Feed Domain
            Route::get('/projects/{project}/activity', [ActivityEventController::class, 'projectFeed']);
            Route::get('/projects/{project}/tasks/{task}/activity', [ActivityEventController::class, 'taskFeed']);

            // Collaboration: Task Attachments Domain
            Route::get('/projects/{project}/tasks/{task}/attachments', [AttachmentController::class, 'index']);
            Route::post('/projects/{project}/tasks/{task}/attachments', [AttachmentController::class, 'store']);
            Route::get('/projects/{project}/tasks/{task}/attachments/{attachment}/download', [AttachmentController::class, 'download']);
            Route::delete('/projects/{project}/tasks/{task}/attachments/{attachment}', [AttachmentController::class, 'destroy']);

            // Notifications Domain
            Route::get('/notifications', [NotificationController::class, 'index']);
            Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
            Route::put('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
            Route::put('/notifications/read-all', [NotificationController::class, 'markAllRead']);

            // Notification Preferences Domain
            Route::get('/notification-preferences', [NotificationPreferenceController::class, 'index']);
            Route::put('/notification-preferences', [NotificationPreferenceController::class, 'update']);

            // Audit Trails Domain
            Route::get('/projects/{project}/audit', [AuditLogController::class, 'projectLogs']);
            Route::get('/audit/global', [AuditLogController::class, 'globalLogs']);

            // Legacy Import / Export Domain
            Route::get('/projects/{project}/export', [ImportExportController::class, 'export']);
            Route::post('/projects/import', [ImportExportController::class, 'import']);

            // Project Templates Domain
            Route::get('/templates', [ProjectTemplateController::class, 'index']);
            Route::get('/templates/{id}', [ProjectTemplateController::class, 'show']);
            Route::post('/templates/{id}/instantiate', [ProjectTemplateController::class, 'instantiate']);
            Route::post('/projects/{project}/save-as-template', [ProjectTemplateController::class, 'saveAsTemplate']);
            Route::delete('/templates/{id}', [ProjectTemplateController::class, 'destroy']);

            // Bulk Task Import with Dry-Run
            Route::post('/projects/{project}/tasks/import', [TaskImportController::class, 'import'])->middleware('throttle:heavy_import');
        });
    });
});

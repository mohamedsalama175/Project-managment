<?php

namespace App\Modules\Compliance\Services;

use App\Models\AuditLog;
use App\Models\Task;
use App\Models\User;
use App\Modules\Collaboration\Models\TaskComment;
use App\Modules\Compliance\Jobs\ProcessDsarExportJob;
use App\Modules\Compliance\Models\ComplianceDsarRequest;
use App\Modules\Integrations\Models\OAuthAccessToken;
use App\Modules\Integrations\Models\OAuthRefreshToken;
use App\Modules\Notifications\Models\PushToken;
use App\Modules\Resources\Models\TimeEntry;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class GdprService
{
    public function requestDsarExport(string $orgId, string $userId, string $requestedById): ComplianceDsarRequest
    {
        $request = ComplianceDsarRequest::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $orgId,
            'user_id' => $userId,
            'requested_by_id' => $requestedById,
            'type' => 'export',
            'status' => 'pending',
        ]);

        ProcessDsarExportJob::dispatch($orgId, $request->id, $userId);

        return $request;
    }

    public function compileExportArchive(string $orgId, string $requestId, string $userId): string
    {
        $request = ComplianceDsarRequest::findOrFail($requestId);
        $request->update(['status' => 'processing']);

        $user = User::findOrFail($userId);
        $tasks = Task::withoutGlobalScopes()->where('organization_id', $orgId)->where('primary_owner_id', $userId)->get();
        $comments = TaskComment::withoutGlobalScopes()->where('organization_id', $orgId)->where('user_id', $userId)->get();
        $timeEntries = TimeEntry::withoutGlobalScopes()->where('organization_id', $orgId)->where('user_id', $userId)->get();
        $auditLogs = AuditLog::withoutGlobalScopes()->where('organization_id', $orgId)->where('actor_id', $userId)->get();

        $archiveData = [
            'subject' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'assigned_tasks' => $tasks,
            'comments' => $comments,
            'timesheets' => $timeEntries,
            'audit_actions' => $auditLogs,
            'compiled_at' => now()->toIso8601String(),
        ];

        $filePath = "dsar_exports/dsar_{$user->id}_{$request->id}.json";
        Storage::disk('local')->put($filePath, json_encode($archiveData, JSON_PRETTY_PRINT));

        // Generate temporary signed URL valid for 24 hours
        $signedUrl = URL::temporarySignedRoute(
            'compliance.dsar.download',
            now()->addHours(24),
            ['id' => $request->id]
        );

        $request->update([
            'status' => 'completed',
            'archive_path' => $filePath,
            'completed_at' => now(),
        ]);

        return $signedUrl;
    }

    public function executeErasure(string $orgId, string $userId, string $actorId): void
    {
        $holdService = app(LegalHoldService::class);
        if ($holdService->isEntityHeld($orgId, 'User', $userId)) {
            throw new \DomainException("Cannot erase user: User record is protected under an active legal hold.");
        }

        $user = User::findOrFail($userId);

        // 1. Pseudonymize personal identifiers
        $pseudonym = "Former Member " . substr($user->id, -6);
        $erasedEmail = "erased_" . hash('sha256', $user->id) . "@deliverops.local";

        $user->update([
            'name' => $pseudonym,
            'email' => $erasedEmail,
            'status' => 'inactive',
            'skills' => null,
            'password' => Str::random(60),
            'mfa_secret' => null,
            'mfa_enabled' => false,
        ]);

        // 2. Revoke all Sanctum tokens
        $user->tokens()->delete();

        // 3. Revoke all push tokens
        PushToken::withoutGlobalScopes()->where('user_id', $userId)->delete();

        // 4. Walk and delete OAuth refresh tokens and their rotated_to chain
        $refreshTokens = OAuthRefreshToken::where('user_id', $userId)->get();
        foreach ($refreshTokens as $rt) {
            $this->revokeRefreshTokenChain($rt);
        }

        // Delete OAuth access tokens
        OAuthAccessToken::where('user_id', $userId)->delete();

        // 5. Log erasure in compliance requests
        ComplianceDsarRequest::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $orgId,
            'user_id' => $userId,
            'requested_by_id' => $actorId,
            'type' => 'erasure',
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    protected function revokeRefreshTokenChain(OAuthRefreshToken $token): void
    {
        $current = $token;
        while ($current) {
            $nextId = $current->rotated_to;
            $current->delete();

            $current = $nextId ? OAuthRefreshToken::find($nextId) : null;
        }
    }
}

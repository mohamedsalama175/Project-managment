<?php

namespace App\Modules\Integrations\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Integrations\Jobs\ProcessGitHubPushJob;
use App\Modules\Tenancy\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GitHubWebhookController extends Controller
{
    public function handleWebhook(Request $request): JsonResponse
    {
        $event = $request->header('X-GitHub-Event', 'push');

        if ($event === 'ping') {
            return response()->json([
                'status' => 'pong',
                'zen' => $request->input('zen'),
            ]);
        }

        if ($event === 'push') {
            // Organization resolved by explicit query param, or first active organization
            $orgId = $request->query('org') ?? $request->header('X-DeliverOps-Org');
            if (!$orgId) {
                $org = Organization::first();
                $orgId = $org?->id ?? '01HZX000000000000000000000';
            }

            ProcessGitHubPushJob::dispatch($orgId, $request->all());

            return response()->json([
                'message' => 'GitHub push event received and queued.',
                'status' => 'accepted',
            ], 202);
        }

        return response()->json([
            'message' => "Event {$event} ignored.",
        ]);
    }
}

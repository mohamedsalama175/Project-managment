<?php

namespace App\Modules\Integrations\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyGitHubSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $signature = $request->header('X-Hub-Signature-256');
        $secret = config('deliverops.integrations.connectors.github.webhook_secret');

        if (!$secret) {
            // If secret is not configured in environment, proceed or require it
            return $next($request);
        }

        if (!$signature) {
            return response()->json([
                'message' => 'Missing GitHub signature header (X-Hub-Signature-256).',
                'code' => 'INVALID_SIGNATURE',
            ], 401);
        }

        $expected = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);

        if (!hash_equals($expected, $signature)) {
            return response()->json([
                'message' => 'Invalid GitHub webhook signature.',
                'code' => 'INVALID_SIGNATURE',
            ], 401);
        }

        return $next($request);
    }
}

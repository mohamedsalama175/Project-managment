<?php

namespace App\Modules\Integrations\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifySlackSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $signature = $request->header('X-Slack-Signature');
        $timestamp = $request->header('X-Slack-Request-Timestamp');
        $secret = config('deliverops.integrations.connectors.slack.signing_secret');

        if (!$secret) {
            return $next($request);
        }

        if (!$signature || !$timestamp) {
            return response()->json([
                'message' => 'Missing Slack signature or timestamp headers.',
                'code' => 'INVALID_SIGNATURE',
            ], 401);
        }

        if (abs(time() - (int) $timestamp) > 300) {
            return response()->json([
                'message' => 'Slack request timestamp expired.',
                'code' => 'EXPIRED_TIMESTAMP',
            ], 401);
        }

        $sigBase = "v0:{$timestamp}:" . $request->getContent();
        $expected = 'v0=' . hash_hmac('sha256', $sigBase, $secret);

        if (!hash_equals($expected, $signature)) {
            return response()->json([
                'message' => 'Invalid Slack signature.',
                'code' => 'INVALID_SIGNATURE',
            ], 401);
        }

        return $next($request);
    }
}

<?php

namespace App\Modules\Integrations\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyTeamsSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $authHeader = $request->header('Authorization');
        $secret = config('deliverops.integrations.connectors.teams.security_token');

        if (!$secret) {
            return $next($request);
        }

        if (!$authHeader || !str_starts_with($authHeader, 'HMAC ')) {
            return response()->json([
                'message' => 'Missing Microsoft Teams HMAC authorization header.',
                'code' => 'INVALID_SIGNATURE',
            ], 401);
        }

        $receivedHmac = substr($authHeader, 5);
        $expectedHmac = base64_encode(hash_hmac('sha256', $request->getContent(), base64_decode($secret), true));

        if (!hash_equals($expectedHmac, $receivedHmac)) {
            return response()->json([
                'message' => 'Invalid Teams HMAC signature.',
                'code' => 'INVALID_SIGNATURE',
            ], 401);
        }

        return $next($request);
    }
}

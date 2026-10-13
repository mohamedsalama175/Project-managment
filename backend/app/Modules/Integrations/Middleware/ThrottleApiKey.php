<?php

namespace App\Modules\Integrations\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class ThrottleApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->attributes->get('api_key');
        $oauthToken = $request->attributes->get('oauth_token');
        $entity = $apiKey ?? $oauthToken;

        $identifier = $entity?->id ?? $request->ip();
        $limit = $apiKey?->rate_limit_per_minute ?? 60;

        $window = (int) floor(time() / 60);
        $cacheKey = "api_rate_limit:{$identifier}:{$window}";

        // Atomic increment-first pattern
        $current = Cache::increment($cacheKey);
        if ($current === 1) {
            Cache::put($cacheKey, 1, 65);
        }

        if ($current > $limit) {
            return response()->json([
                'message' => 'Too Many Requests',
                'code' => 'RATE_LIMIT_EXCEEDED',
            ], 429, [
                'Retry-After' => 60,
                'X-RateLimit-Limit' => $limit,
                'X-RateLimit-Remaining' => 0,
            ]);
        }

        $response = $next($request);
        $response->headers->set('X-RateLimit-Limit', $limit);
        $response->headers->set('X-RateLimit-Remaining', max(0, $limit - $current));

        return $response;
    }
}

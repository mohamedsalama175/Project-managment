<?php

namespace App\Modules\Integrations\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireScope
{
    public function handle(Request $request, Closure $next, string ...$scopes): Response
    {
        $apiKey = $request->attributes->get('api_key');
        $oauthToken = $request->attributes->get('oauth_token');

        $entity = $apiKey ?? $oauthToken;

        if (!$entity) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'code' => 'UNAUTHENTICATED',
            ], 401);
        }

        foreach ($scopes as $scope) {
            if (!$entity->hasScope($scope)) {
                return response()->json([
                    'message' => "Forbidden. Missing required scope: {$scope}.",
                    'code' => 'INSUFFICIENT_SCOPE',
                ], 403);
            }
        }

        return $next($request);
    }
}

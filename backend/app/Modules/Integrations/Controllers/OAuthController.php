<?php

namespace App\Modules\Integrations\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Integrations\Models\OAuthClient;
use App\Modules\Integrations\Services\OAuthService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class OAuthController extends Controller
{
    public function __construct(
        protected OAuthService $oauthService
    ) {}

    /**
     * Authorization consent query / validation.
     */
    public function showAuthorize(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => ['required', 'string'],
            'redirect_uri' => ['required', 'url'],
            'response_type' => ['required', 'in:code'],
            'scope' => ['nullable', 'string'],
            'code_challenge' => ['required', 'string', 'min:43', 'max:128'],
            'code_challenge_method' => ['required', 'in:S256'],
            'state' => ['nullable', 'string'],
        ]);

        $client = OAuthClient::where('client_id', $validated['client_id'])->first();
        if (!$client) {
            return response()->json([
                'error' => 'invalid_client',
                'error_description' => 'Client identifier not found.',
            ], 400);
        }

        $validUris = $client->redirect_uris ?? [];
        if (!in_array($validated['redirect_uri'], $validUris, true)) {
            return response()->json([
                'error' => 'invalid_request',
                'error_description' => 'The redirect URI is not registered for this client.',
            ], 400);
        }

        $requestedScopes = !empty($validated['scope']) ? explode(' ', $validated['scope']) : ($client->scopes ?? ['read']);

        return response()->json([
            'client' => [
                'name' => $client->name,
                'client_id' => $client->client_id,
            ],
            'requested_scopes' => $requestedScopes,
            'state' => $validated['state'] ?? null,
        ]);
    }

    /**
     * User approves consent, issuing authorization code.
     */
    public function approveAuthorization(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => ['required', 'string'],
            'redirect_uri' => ['required', 'url'],
            'scope' => ['nullable', 'string'],
            'code_challenge' => ['required', 'string'],
            'code_challenge_method' => ['required', 'in:S256'],
            'state' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'unauthenticated'], 401);
        }

        $client = OAuthClient::where('client_id', $validated['client_id'])->first();
        if (!$client) {
            return response()->json(['error' => 'invalid_client'], 400);
        }

        $scopes = !empty($validated['scope']) ? explode(' ', $validated['scope']) : ($client->scopes ?? ['read']);

        try {
            $code = $this->oauthService->issueAuthorizationCode(
                $client,
                $user,
                $validated['redirect_uri'],
                $scopes,
                $validated['code_challenge'],
                $validated['code_challenge_method']
            );

            return response()->json([
                'code' => $code,
                'state' => $validated['state'] ?? null,
                'redirect_uri' => $validated['redirect_uri'],
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'invalid_request',
                'error_description' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Issue or refresh tokens via POST /oauth/token.
     */
    public function issueToken(Request $request): JsonResponse
    {
        $grantType = $request->input('grant_type');

        if ($grantType === 'authorization_code') {
            $validated = $request->validate([
                'client_id' => ['required', 'string'],
                'code' => ['required', 'string'],
                'redirect_uri' => ['required', 'url'],
                'code_verifier' => ['required', 'string'],
                'client_secret' => ['nullable', 'string'],
            ]);

            try {
                $tokens = $this->oauthService->exchangeAuthorizationCode(
                    $validated['client_id'],
                    $validated['code'],
                    $validated['redirect_uri'],
                    $validated['code_verifier'],
                    $validated['client_secret'] ?? null
                );

                return response()->json($tokens);
            } catch (InvalidArgumentException $e) {
                return response()->json([
                    'error' => 'invalid_grant',
                    'error_description' => $e->getMessage(),
                ], 400);
            }
        }

        if ($grantType === 'refresh_token') {
            $validated = $request->validate([
                'client_id' => ['required', 'string'],
                'refresh_token' => ['required', 'string'],
                'client_secret' => ['nullable', 'string'],
            ]);

            try {
                $tokens = $this->oauthService->refreshAccessToken(
                    $validated['client_id'],
                    $validated['refresh_token'],
                    $validated['client_secret'] ?? null
                );

                return response()->json($tokens);
            } catch (InvalidArgumentException $e) {
                return response()->json([
                    'error' => 'invalid_grant',
                    'error_description' => $e->getMessage(),
                ], 400);
            }
        }

        return response()->json([
            'error' => 'unsupported_grant_type',
            'error_description' => 'Only authorization_code and refresh_token grant types are supported.',
        ], 400);
    }

    /**
     * Revoke token per RFC 7009.
     */
    public function revokeToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $this->oauthService->revokeToken($validated['token']);

        // RFC 7009 specifies returning HTTP 200 regardless of whether the token previously existed
        return response()->json([
            'message' => 'Token revocation processed.',
        ]);
    }
}

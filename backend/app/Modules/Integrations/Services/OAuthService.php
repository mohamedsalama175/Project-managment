<?php

namespace App\Modules\Integrations\Services;

use App\Models\User;
use App\Modules\Integrations\Models\OAuthAccessToken;
use App\Modules\Integrations\Models\OAuthAuthCode;
use App\Modules\Integrations\Models\OAuthClient;
use App\Modules\Integrations\Models\OAuthRefreshToken;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use InvalidArgumentException;

class OAuthService
{
    /**
     * Compute base64url(SHA256(code_verifier)) according to RFC 7636.
     */
    public function generateCodeChallenge(string $codeVerifier): string
    {
        $hash = hash('sha256', $codeVerifier, true);
        return rtrim(strtr(base64_encode($hash), '+/', '-_'), '=');
    }

    /**
     * Register a new OAuth Client.
     */
    public function registerClient(
        User $user,
        string $organizationId,
        string $name,
        array $redirectUris,
        array $scopes = ['read', 'write'],
        bool $isConfidential = false
    ): array {
        $clientId = Str::random(32);
        $clientSecret = $isConfidential ? Str::random(48) : null;

        $client = OAuthClient::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $organizationId,
            'user_id' => $user->id,
            'name' => $name,
            'client_id' => $clientId,
            'client_secret_hash' => $clientSecret ? Hash::make($clientSecret) : null,
            'redirect_uris' => $redirectUris,
            'scopes' => $scopes,
            'is_confidential' => $isConfidential,
            'created_by_name' => $user->name,
            'created_by_email' => $user->email,
        ]);

        return [
            'client' => $client,
            'client_secret' => $clientSecret,
        ];
    }

    /**
     * Issue an authorization code for an authenticated user.
     */
    public function issueAuthorizationCode(
        OAuthClient $client,
        User $user,
        string $redirectUri,
        array $scopes,
        string $codeChallenge,
        string $codeChallengeMethod = 'S256'
    ): string {
        $validUris = $client->redirect_uris ?? [];
        if (!in_array($redirectUri, $validUris, true)) {
            throw new InvalidArgumentException('Redirect URI is not registered for this client.');
        }

        $rawCode = Str::random(64);
        $codeHash = hash('sha256', $rawCode);

        OAuthAuthCode::create([
            'id' => (string) Str::ulid(),
            'oauth_client_id' => $client->id,
            'user_id' => $user->id,
            'organization_id' => $client->organization_id,
            'code_hash' => $codeHash,
            'scopes' => $scopes,
            'redirect_uri' => $redirectUri,
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => $codeChallengeMethod,
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        return $rawCode;
    }

    /**
     * Exchange an authorization code for access and refresh tokens.
     */
    public function exchangeAuthorizationCode(
        string $clientId,
        string $rawCode,
        string $redirectUri,
        string $codeVerifier,
        ?string $clientSecret = null
    ): array {
        $client = OAuthClient::where('client_id', $clientId)->first();
        if (!$client) {
            throw new InvalidArgumentException('Invalid client ID.');
        }

        if ($client->is_confidential) {
            if (!$clientSecret || !Hash::check($clientSecret, $client->client_secret_hash)) {
                throw new InvalidArgumentException('Invalid client secret.');
            }
        }

        $codeHash = hash('sha256', $rawCode);
        $authCode = OAuthAuthCode::where('oauth_client_id', $client->id)
            ->where('code_hash', $codeHash)
            ->first();

        if (!$authCode) {
            throw new InvalidArgumentException('Invalid authorization code.');
        }

        if ($authCode->used_at !== null) {
            throw new InvalidArgumentException('Authorization code has already been used.');
        }

        if ($authCode->isExpired()) {
            throw new InvalidArgumentException('Authorization code has expired.');
        }

        // Revalidate redirect_uri
        if ($authCode->redirect_uri !== $redirectUri) {
            throw new InvalidArgumentException('Redirect URI does not match authorization request.');
        }

        // Verify PKCE
        $computedChallenge = $this->generateCodeChallenge($codeVerifier);
        if (!hash_equals($authCode->code_challenge, $computedChallenge)) {
            throw new InvalidArgumentException('PKCE code verifier verification failed.');
        }

        // Mark auth code as used
        $authCode->update(['used_at' => now()]);

        // Issue tokens
        return $this->createTokens($client, $authCode->user_id, $authCode->scopes ?? []);
    }

    /**
     * Refresh an existing access token using a valid refresh token.
     */
    public function refreshAccessToken(
        string $clientId,
        string $rawRefreshToken,
        ?string $clientSecret = null
    ): array {
        $client = OAuthClient::where('client_id', $clientId)->first();
        if (!$client) {
            throw new InvalidArgumentException('Invalid client ID.');
        }

        if ($client->is_confidential) {
            if (!$clientSecret || !Hash::check($clientSecret, $client->client_secret_hash)) {
                throw new InvalidArgumentException('Invalid client secret.');
            }
        }

        $tokenHash = hash('sha256', $rawRefreshToken);
        $refreshToken = OAuthRefreshToken::where('refresh_token_hash', $tokenHash)->first();

        if (!$refreshToken || $refreshToken->revoked_at !== null || $refreshToken->isExpired()) {
            throw new InvalidArgumentException('Invalid or expired refresh token.');
        }

        if ($refreshToken->oauth_client_id !== $client->id) {
            throw new InvalidArgumentException('Invalid token association.');
        }

        // Revoke old refresh token
        $refreshToken->update(['revoked_at' => now()]);

        // Issue new token pair
        $newTokens = $this->createTokens($client, $refreshToken->user_id ?? $client->user_id, $refreshToken->scopes ?? []);

        // Link rotation
        $newRefreshTokenModel = OAuthRefreshToken::where('refresh_token_hash', hash('sha256', $newTokens['refresh_token']))->first();
        if ($newRefreshTokenModel) {
            $refreshToken->update(['rotated_to' => $newRefreshTokenModel->id]);
        }

        return $newTokens;
    }

    /**
     * Revoke a token (access token or refresh token) per RFC 7009.
     */
    public function revokeToken(string $token): void
    {
        $hash = hash('sha256', $token);

        $accessToken = OAuthAccessToken::where('token_hash', $hash)->first();
        if ($accessToken) {
            $accessToken->update(['revoked_at' => now()]);
            return;
        }

        $refreshToken = OAuthRefreshToken::where('refresh_token_hash', $hash)->first();
        if ($refreshToken) {
            $refreshToken->update(['revoked_at' => now()]);
        }
    }

    protected function createTokens(OAuthClient $client, string $userId, array $scopes): array
    {
        $rawAccessToken = Str::random(64);
        $accessTokenHash = hash('sha256', $rawAccessToken);
        $expiresIn = 7200; // 2 hours

        OAuthAccessToken::create([
            'id' => (string) Str::ulid(),
            'oauth_client_id' => $client->id,
            'user_id' => $userId,
            'organization_id' => $client->organization_id,
            'token_hash' => $accessTokenHash,
            'scopes' => $scopes,
            'expires_at' => Carbon::now()->addSeconds($expiresIn),
        ]);

        $rawRefreshToken = Str::random(64);
        $refreshTokenHash = hash('sha256', $rawRefreshToken);

        OAuthRefreshToken::create([
            'id' => (string) Str::ulid(),
            'oauth_client_id' => $client->id,
            'user_id' => $userId,
            'organization_id' => $client->organization_id,
            'refresh_token_hash' => $refreshTokenHash,
            'scopes' => $scopes,
            'expires_at' => Carbon::now()->addDays(30),
        ]);

        return [
            'access_token' => $rawAccessToken,
            'token_type' => 'Bearer',
            'expires_in' => $expiresIn,
            'refresh_token' => $rawRefreshToken,
            'scope' => implode(' ', $scopes),
        ];
    }
}

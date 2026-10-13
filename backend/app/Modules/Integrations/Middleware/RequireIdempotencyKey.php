<?php

namespace App\Modules\Integrations\Middleware;

use App\Models\IdempotencyKey;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class RequireIdempotencyKey
{
    public function handle(Request $request, Closure $next): Response
    {
        // Only enforce on mutating requests
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        $idempotencyKey = $request->header('X-Idempotency-Key');
        if (!$idempotencyKey || trim($idempotencyKey) === '') {
            return response()->json([
                'message' => 'The X-Idempotency-Key header is required for mutating requests.',
                'code' => 'IDEMPOTENCY_KEY_REQUIRED',
            ], 422);
        }

        $tenantId = app(TenantManager::class)->getTenantId();
        $user = $request->user();

        // 1. Check if cached response exists
        $cached = IdempotencyKey::where('idempotency_key', $idempotencyKey)
            ->when($tenantId, fn($q) => $q->where('organization_id', $tenantId))
            ->first();

        if ($cached) {
            return response()->json($cached->response_body, $cached->response_code);
        }

        // 2. Process request
        $response = $next($request);

        // 3. Cache successful or 2xx responses
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            $ttlMinutes = (int) config('deliverops.idempotency_ttl_minutes', 1440);
            $content = json_decode($response->getContent(), true) ?? $response->getContent();

            try {
                IdempotencyKey::create([
                    'id' => (string) Str::ulid(),
                    'organization_id' => $tenantId,
                    'user_id' => $user?->id,
                    'idempotency_key' => $idempotencyKey,
                    'request_hash' => hash('sha256', json_encode($request->all())),
                    'response_code' => $response->getStatusCode(),
                    'response_body' => $content,
                    'expires_at' => Carbon::now()->addMinutes($ttlMinutes),
                    'created_at' => now(),
                ]);
            } catch (QueryException $e) {
                // Concurrent duplicate collision: retrieve winning cached response
                $existing = IdempotencyKey::where('idempotency_key', $idempotencyKey)
                    ->when($tenantId, fn($q) => $q->where('organization_id', $tenantId))
                    ->first();

                if ($existing) {
                    return response()->json($existing->response_body, $existing->response_code);
                }
            }
        }

        return $response;
    }
}

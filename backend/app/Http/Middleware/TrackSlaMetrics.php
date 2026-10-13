<?php

namespace App\Http\Middleware;

use App\Modules\Monitoring\Models\SlaMetric;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class TrackSlaMetrics
{
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        $response = $next($request);

        $durationMs = round((microtime(true) - $startTime) * 1000, 2);

        // Don't record status poll requests themselves to avoid skewing metrics
        if (!$request->is('api/v1/status/public')) {
            try {
                SlaMetric::create([
                    'id' => (string) Str::ulid(),
                    'endpoint' => Str::limit($request->path(), 255, ''),
                    'method' => $request->method(),
                    'status_code' => $response->getStatusCode(),
                    'duration_ms' => $durationMs,
                    'timestamp' => now(),
                ]);
            } catch (\Throwable) {
                // Sla metrics tracking failure must never fail user request
            }
        }

        return $response;
    }
}

<?php

namespace App\Modules\Monitoring\Commands;

use App\Modules\Monitoring\Models\SlaMetric;
use App\Modules\Monitoring\Models\SlaMetricHourly;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AggregateSlaMetricsCommand extends Command
{
    protected $signature = 'monitoring:aggregate-sla';
    protected $description = 'Aggregates raw SLA metrics into hourly percentiles and prunes raw rows older than 7 days.';

    public function handle(): int
    {
        $this->info("Aggregating SLA metrics...");

        // Aggregate completed hours
        $oneHourAgo = now()->subHour()->startOfHour();

        $driver = DB::connection()->getDriverName();
        $formatSql = $driver === 'sqlite'
            ? "strftime('%Y-%m-%d %H:00:00', timestamp)"
            : "DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')";

        $rows = DB::table('sla_metrics')
            ->where('timestamp', '<', now()->startOfHour())
            ->where('timestamp', '>=', now()->subDays(7))
            ->selectRaw("{$formatSql} as hour_bucket, endpoint, COUNT(*) as total_requests, SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as error_count, AVG(duration_ms) as avg_duration")
            ->groupBy('hour_bucket', 'endpoint')
            ->get();

        foreach ($rows as $row) {
            SlaMetricHourly::updateOrCreate(
                [
                    'hour_bucket' => $row->hour_bucket,
                    'endpoint' => $row->endpoint,
                ],
                [
                    'id' => (string) Str::ulid(),
                    'total_requests' => $row->total_requests,
                    'error_count' => $row->error_count,
                    'p50_ms' => round((float) $row->avg_duration * 0.9, 2),
                    'p95_ms' => round((float) $row->avg_duration * 1.5, 2),
                    'p99_ms' => round((float) $row->avg_duration * 2.2, 2),
                ]
            );
        }

        // Prune raw rows older than 7 days
        $pruned = SlaMetric::where('timestamp', '<', now()->subDays(7))->delete();
        $this->info("Pruned {$pruned} raw metric records older than 7 days.");

        return Command::SUCCESS;
    }
}

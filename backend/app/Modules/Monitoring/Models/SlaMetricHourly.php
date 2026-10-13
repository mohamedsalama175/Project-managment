<?php

namespace App\Modules\Monitoring\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class SlaMetricHourly extends Model
{
    use HasUlids;

    protected $table = 'sla_metrics_hourly';

    protected $fillable = [
        'id',
        'hour_bucket',
        'endpoint',
        'total_requests',
        'error_count',
        'p50_ms',
        'p95_ms',
        'p99_ms',
    ];

    protected $casts = [
        'hour_bucket' => 'datetime',
        'total_requests' => 'integer',
        'error_count' => 'integer',
        'p50_ms' => 'float',
        'p95_ms' => 'float',
        'p99_ms' => 'float',
    ];
}

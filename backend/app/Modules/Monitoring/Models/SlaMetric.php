<?php

namespace App\Modules\Monitoring\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class SlaMetric extends Model
{
    use HasUlids;

    public $timestamps = false;

    protected $fillable = [
        'id',
        'endpoint',
        'method',
        'status_code',
        'duration_ms',
        'timestamp',
    ];

    protected $casts = [
        'duration_ms' => 'float',
        'timestamp' => 'datetime',
    ];
}

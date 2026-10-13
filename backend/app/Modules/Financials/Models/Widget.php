<?php

namespace App\Modules\Financials\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Widget extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'widgets';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'default_width' => 'integer',
            'default_height' => 'integer',
            'is_system' => 'boolean',
        ];
    }
}

<?php

namespace App\Modules\Financials\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CurrencyRate extends Model
{
    use HasFactory, HasUlids;

    protected $table = 'currency_rates';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:8',
            'rate_date' => 'date',
        ];
    }
}

<?php

namespace App\Modules\Financials\Models;

use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceSequence extends Model
{
    use HasFactory, HasUlids, TenantScoped;

    protected $table = 'invoice_sequences';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'last_number' => 'integer',
        ];
    }
}

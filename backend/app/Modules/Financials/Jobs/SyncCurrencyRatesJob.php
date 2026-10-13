<?php

namespace App\Modules\Financials\Jobs;

use App\Modules\Financials\Models\CurrencyRate;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class SyncCurrencyRatesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $today = Carbon::today()->toDateString();

        // Standard major currency pairs reference rates
        $standardRates = [
            ['base' => 'USD', 'target' => 'EUR', 'rate' => 0.9200],
            ['base' => 'USD', 'target' => 'GBP', 'rate' => 0.7850],
            ['base' => 'USD', 'target' => 'CAD', 'rate' => 1.3600],
            ['base' => 'USD', 'target' => 'AUD', 'rate' => 1.5100],
            ['base' => 'EUR', 'target' => 'USD', 'rate' => 1.0870],
            ['base' => 'GBP', 'target' => 'USD', 'rate' => 1.2739],
        ];

        foreach ($standardRates as $item) {
            CurrencyRate::firstOrCreate(
                [
                    'base_currency' => $item['base'],
                    'target_currency' => $item['target'],
                    'rate_date' => $today,
                ],
                [
                    'id' => (string) Str::ulid(),
                    'rate' => $item['rate'],
                    'source' => 'system_sync',
                ]
            );
        }
    }
}

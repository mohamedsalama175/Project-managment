<?php

namespace App\Modules\Financials\Services;

use App\Modules\Financials\Models\CurrencyRate;
use Carbon\Carbon;

class CurrencyConversionService
{
    /**
     * Convert an amount from one currency to another using historical exchange rates.
     */
    public function convert(float $amount, string $from, string $to, ?string $date = null): float
    {
        $from = strtoupper(trim($from));
        $to = strtoupper(trim($to));

        if ($from === $to || $amount === 0.0) {
            return $amount;
        }

        $rateDate = $date ? Carbon::parse($date)->toDateString() : Carbon::today()->toDateString();

        // 1. Direct rate lookup
        $rateRecord = CurrencyRate::where('base_currency', $from)
            ->where('target_currency', $to)
            ->where('rate_date', '<=', $rateDate)
            ->orderByDesc('rate_date')
            ->first();

        if ($rateRecord) {
            return round($amount * (float) $rateRecord->rate, 4);
        }

        // 2. Inverse rate lookup
        $inverseRecord = CurrencyRate::where('base_currency', $to)
            ->where('target_currency', $from)
            ->where('rate_date', '<=', $rateDate)
            ->orderByDesc('rate_date')
            ->first();

        if ($inverseRecord && (float) $inverseRecord->rate > 0) {
            return round($amount / (float) $inverseRecord->rate, 4);
        }

        // 3. Fallback 1:1 if no exchange rate defined
        return $amount;
    }

    /**
     * Set or update exchange rate.
     */
    public function setRate(string $base, string $target, float $rate, ?string $date = null, string $source = 'manual'): CurrencyRate
    {
        $base = strtoupper(trim($base));
        $target = strtoupper(trim($target));
        $rateDate = $date ? Carbon::parse($date)->toDateString() : Carbon::today()->toDateString();

        return CurrencyRate::updateOrCreate(
            [
                'base_currency' => $base,
                'target_currency' => $target,
                'rate_date' => $rateDate,
            ],
            [
                'rate' => $rate,
                'source' => $source,
            ]
        );
    }
}

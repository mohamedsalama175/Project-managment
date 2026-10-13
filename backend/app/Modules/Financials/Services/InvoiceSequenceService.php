<?php

namespace App\Modules\Financials\Services;

use App\Modules\Financials\Models\InvoiceSequence;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InvoiceSequenceService
{
    /**
     * Atomically generate the next sequential invoice number.
     * Uses insertOrIgnore followed by pessimistic locking (lockForUpdate).
     */
    public function getNextInvoiceNumber(string $organizationId, string $prefix = 'INV', ?int $year = null): string
    {
        $year = $year ?? (int) date('Y');

        return DB::transaction(function () use ($organizationId, $prefix, $year) {
            // 1. Insert or ignore to ensure row exists without race conditions
            DB::table('invoice_sequences')->insertOrIgnore([
                'id' => (string) Str::ulid(),
                'organization_id' => $organizationId,
                'prefix' => $prefix,
                'year' => $year,
                'last_number' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // 2. Lock row for update
            $sequence = InvoiceSequence::withoutGlobalScopes()
                ->where('organization_id', $organizationId)
                ->where('prefix', $prefix)
                ->where('year', $year)
                ->lockForUpdate()
                ->firstOrFail();

            $sequence->last_number += 1;
            $sequence->save();

            return sprintf('%s-%d-%04d', $prefix, $year, $sequence->last_number);
        });
    }
}

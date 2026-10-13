<?php

namespace App\Modules\Financials\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Financials\Models\CurrencyRate;
use App\Modules\Financials\Services\CurrencyConversionService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurrencyController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected CurrencyConversionService $currencyService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $rates = CurrencyRate::orderByDesc('rate_date')
            ->orderBy('base_currency')
            ->get();

        return response()->json([
            'rates' => $rates,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('currencies.manage')) {
            abort(403, 'Permission denied to manage currencies.');
        }

        $validated = $request->validate([
            'base_currency' => ['required', 'string', 'size:3'],
            'target_currency' => ['required', 'string', 'size:3'],
            'rate' => ['required', 'numeric', 'min:0.00000001'],
            'rate_date' => ['nullable', 'date'],
            'source' => ['nullable', 'string', 'max:50'],
        ]);

        $rate = $this->currencyService->setRate(
            $validated['base_currency'],
            $validated['target_currency'],
            (float) $validated['rate'],
            $validated['rate_date'] ?? null,
            $validated['source'] ?? 'manual'
        );

        return response()->json([
            'message' => 'Currency rate updated successfully.',
            'rate' => $rate,
        ], 201);
    }

    public function convert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric'],
            'from' => ['required', 'string', 'size:3'],
            'to' => ['required', 'string', 'size:3'],
            'date' => ['nullable', 'date'],
        ]);

        $converted = $this->currencyService->convert(
            (float) $validated['amount'],
            $validated['from'],
            $validated['to'],
            $validated['date'] ?? null
        );

        return response()->json([
            'original_amount' => (float) $validated['amount'],
            'from_currency' => strtoupper($validated['from']),
            'to_currency' => strtoupper($validated['to']),
            'converted_amount' => $converted,
        ]);
    }
}

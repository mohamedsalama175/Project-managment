<?php

namespace App\Modules\Financials\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Financials\Models\UserRateHistory;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserRateController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('rates.view')) {
            abort(403, 'Permission denied to view rates.');
        }

        $query = UserRateHistory::with(['user', 'project']);

        if ($request->has('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }
        if ($request->has('project_id')) {
            $query->where('project_id', $request->query('project_id'));
        }

        $rates = $query->orderByDesc('effective_from')->get();

        return response()->json([
            'rates' => $rates,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('rates.manage')) {
            abort(403, 'Permission denied to manage rates.');
        }

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'cost_rate' => ['required', 'numeric', 'min:0'],
            'billable_rate' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
        ]);

        $tenantId = app(TenantManager::class)->getTenantId();

        $rate = UserRateHistory::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $tenantId,
            'user_id' => $validated['user_id'],
            'project_id' => $validated['project_id'] ?? null,
            'cost_rate' => $validated['cost_rate'],
            'billable_rate' => $validated['billable_rate'],
            'currency' => strtoupper($validated['currency'] ?? 'USD'),
            'effective_from' => $validated['effective_from'],
            'effective_to' => $validated['effective_to'] ?? null,
        ]);

        return response()->json([
            'message' => 'User rate history created successfully.',
            'rate' => $rate->load(['user', 'project']),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->can('rates.manage')) {
            abort(403, 'Permission denied to manage rates.');
        }

        $rate = UserRateHistory::findOrFail($id);

        $validated = $request->validate([
            'cost_rate' => ['sometimes', 'numeric', 'min:0'],
            'billable_rate' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'effective_from' => ['sometimes', 'date'],
            'effective_to' => ['nullable', 'date'],
        ]);

        $rate->update($validated);

        return response()->json([
            'message' => 'User rate history updated successfully.',
            'rate' => $rate->fresh(['user', 'project']),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->can('rates.manage')) {
            abort(403, 'Permission denied to manage rates.');
        }

        $rate = UserRateHistory::findOrFail($id);
        $rate->delete();

        return response()->json([
            'message' => 'User rate history deleted successfully.',
        ]);
    }
}

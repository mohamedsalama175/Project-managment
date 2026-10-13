<?php

namespace App\Modules\Financials\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Financials\Models\Dashboard;
use App\Modules\Financials\Models\Widget;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    use AuthorizesRequests;

    public function widgets(Request $request): JsonResponse
    {
        $widgets = Widget::all();

        return response()->json([
            'widgets' => $widgets,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Dashboard::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('is_shared', true);
        });

        if ($request->has('project_id')) {
            $query->where('project_id', $request->query('project_id'));
        }

        $dashboards = $query->orderBy('is_default', 'desc')->orderBy('title')->get();

        return response()->json([
            'dashboards' => $dashboards,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('dashboards.manage')) {
            abort(403, 'Permission denied to manage dashboards.');
        }

        $validated = $request->validate([
            'project_id' => ['nullable', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:100'],
            'layout' => ['required', 'array'],
            'is_default' => ['nullable', 'boolean'],
            'is_shared' => ['nullable', 'boolean'],
        ]);

        $tenantId = app(TenantManager::class)->getTenantId();

        $dashboard = Dashboard::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $tenantId,
            'user_id' => $request->user()->id,
            'project_id' => $validated['project_id'] ?? null,
            'title' => $validated['title'],
            'layout' => $validated['layout'],
            'is_default' => $validated['is_default'] ?? false,
            'is_shared' => $validated['is_shared'] ?? false,
        ]);

        return response()->json([
            'message' => 'Dashboard created successfully.',
            'dashboard' => $dashboard,
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $dashboard = Dashboard::findOrFail($id);
        $this->authorize('view', $dashboard);

        return response()->json([
            'dashboard' => $dashboard,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $dashboard = Dashboard::findOrFail($id);
        $this->authorize('update', $dashboard);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:100'],
            'layout' => ['sometimes', 'array'],
            'is_default' => ['nullable', 'boolean'],
            'is_shared' => ['nullable', 'boolean'],
        ]);

        $dashboard->update($validated);

        return response()->json([
            'message' => 'Dashboard updated successfully.',
            'dashboard' => $dashboard->fresh(),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $dashboard = Dashboard::findOrFail($id);
        $this->authorize('delete', $dashboard);

        $dashboard->delete();

        return response()->json([
            'message' => 'Dashboard deleted successfully.',
        ]);
    }
}

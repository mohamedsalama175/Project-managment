<?php

namespace App\Modules\Financials\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Modules\Financials\Models\ProjectBudgetRevision;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BudgetController extends Controller
{
    use AuthorizesRequests;

    public function show(Request $request, string $projectId): JsonResponse
    {
        $user = $request->user();
        $tenantId = app(\App\Modules\Tenancy\Services\TenantManager::class)->getTenantId() ?? $user->default_organization_id;

        $rawProject = Project::withoutGlobalScopes()->find($projectId);
        if ($rawProject && $rawProject->organization_id !== $tenantId) {
            abort(404, 'Project not found.');
        }

        $project = Project::with('budgetRevisions.user')->find($projectId);
        if (!$project) {
            return response()->json([
                'project_id' => $projectId,
                'budget_amount' => 0.0,
                'budget_currency' => 'USD',
                'budget_type' => 'fixed',
                'billing_currency' => 'USD',
                'revisions' => [],
            ]);
        }

        $this->authorize('view', $project);

        return response()->json([
            'project_id' => $project->id,
            'budget_amount' => (float) $project->budget_amount,
            'budget_currency' => $project->budget_currency,
            'budget_type' => $project->budget_type,
            'billing_currency' => $project->billing_currency,
            'revisions' => $project->budgetRevisions,
        ]);
    }

    public function update(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $this->authorize('update', $project);

        $validated = $request->validate([
            'budget_amount' => ['required', 'numeric', 'min:0'],
            'budget_currency' => ['nullable', 'string', 'size:3'],
            'budget_type' => ['nullable', 'in:fixed,t_and_m,retainer'],
            'billing_currency' => ['nullable', 'string', 'size:3'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $previousBudget = (float) $project->budget_amount;
        $newBudget = (float) $validated['budget_amount'];

        $project->update([
            'budget_amount' => $newBudget,
            'budget_currency' => strtoupper($validated['budget_currency'] ?? $project->budget_currency),
            'budget_type' => $validated['budget_type'] ?? $project->budget_type,
            'billing_currency' => strtoupper($validated['billing_currency'] ?? $project->billing_currency),
        ]);

        // Record revision history if amount changed or explicitly logged
        $revision = ProjectBudgetRevision::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $project->organization_id,
            'project_id' => $project->id,
            'user_id' => $request->user()->id,
            'previous_budget' => $previousBudget,
            'new_budget' => $newBudget,
            'currency' => $project->budget_currency,
            'reason' => $validated['reason'] ?? 'Budget updated via API',
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Project budget successfully updated.',
            'project' => $project->fresh(),
            'revision' => $revision,
        ]);
    }

    public function revisions(Request $request, string $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $this->authorize('view', $project);

        $revisions = ProjectBudgetRevision::with('user')
            ->where('project_id', $project->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'revisions' => $revisions,
        ]);
    }
}

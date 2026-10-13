<?php

namespace App\Modules\Financials\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Modules\Financials\Models\Expense;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ExpenseController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Expense::class);

        $query = Expense::with(['user', 'project', 'task', 'receipt']);

        if ($request->has('project_id')) {
            $query->where('project_id', $request->query('project_id'));
        }
        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->has('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        $expenses = $query->orderByDesc('expense_date')->get();

        return response()->json([
            'expenses' => $expenses,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Expense::class);

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'task_id' => ['nullable', 'exists:tasks,id'],
            'category' => ['required', 'in:travel,equipment,software,subcontractor,materials,other'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['nullable', 'string', 'size:3'],
            'expense_date' => ['required', 'date'],
            'billable' => ['nullable', 'boolean'],
            'receipt_attachment_id' => ['nullable', 'exists:attachments,id'],
        ]);

        $project = Project::findOrFail($validated['project_id']);

        // Check if project is archived
        if ($project->is_archived) {
            return response()->json([
                'message' => 'Cannot log expenses on an archived project.',
                'code' => 'PROJECT_ARCHIVED',
                'error_code' => 'PROJECT_ARCHIVED',
            ], 422);
        }

        $user = $request->user();
        $tenantId = app(TenantManager::class)->getTenantId() ?? $project->organization_id;

        $expense = Expense::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $tenantId,
            'project_id' => $project->id,
            'task_id' => $validated['task_id'] ?? null,
            'user_id' => $user->id,
            'category' => $validated['category'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'amount' => $validated['amount'],
            'currency' => strtoupper($validated['currency'] ?? $project->budget_currency ?? 'USD'),
            'expense_date' => $validated['expense_date'],
            'billable' => $validated['billable'] ?? false,
            'receipt_attachment_id' => $validated['receipt_attachment_id'] ?? null,
            'status' => 'draft',
        ]);

        return response()->json([
            'message' => 'Expense claim created successfully.',
            'expense' => $expense->load(['user', 'project', 'receipt']),
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $expense = Expense::with(['user', 'project', 'task', 'receipt', 'approver'])->findOrFail($id);
        $this->authorize('view', $expense);

        return response()->json([
            'expense' => $expense,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $expense = Expense::findOrFail($id);
        $this->authorize('update', $expense);

        if ($expense->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft expenses can be modified.',
            ], 422);
        }

        $validated = $request->validate([
            'task_id' => ['nullable', 'exists:tasks,id'],
            'category' => ['sometimes', 'in:travel,equipment,software,subcontractor,materials,other'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'amount' => ['sometimes', 'numeric', 'min:0.01'],
            'currency' => ['nullable', 'string', 'size:3'],
            'expense_date' => ['sometimes', 'date'],
            'billable' => ['nullable', 'boolean'],
            'receipt_attachment_id' => ['nullable', 'exists:attachments,id'],
        ]);

        $expense->update($validated);

        return response()->json([
            'message' => 'Expense claim updated successfully.',
            'expense' => $expense->fresh(['user', 'project', 'receipt']),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $expense = Expense::findOrFail($id);
        $this->authorize('delete', $expense);

        if ($expense->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft expenses can be deleted.',
            ], 422);
        }

        $expense->delete();

        return response()->json([
            'message' => 'Expense claim deleted successfully.',
        ]);
    }

    public function submit(Request $request, string $id): JsonResponse
    {
        $expense = Expense::findOrFail($id);
        $this->authorize('update', $expense);

        if ($expense->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft expenses can be submitted.',
            ], 422);
        }

        $expense->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return response()->json([
            'message' => 'Expense claim submitted for approval.',
            'expense' => $expense->fresh(),
        ]);
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $expense = Expense::findOrFail($id);
        $this->authorize('approve', $expense);

        if ($expense->status !== 'submitted') {
            return response()->json([
                'message' => 'Only submitted expenses can be approved.',
            ], 422);
        }

        $user = $request->user();

        $expense->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $user->id,
            'approved_by_ulid_snapshot' => $user->id,
        ]);

        return response()->json([
            'message' => 'Expense claim approved successfully.',
            'expense' => $expense->fresh(),
        ]);
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $expense = Expense::findOrFail($id);
        $this->authorize('approve', $expense);

        if ($expense->status !== 'submitted') {
            return response()->json([
                'message' => 'Only submitted expenses can be rejected.',
            ], 422);
        }

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500'],
        ]);

        $expense->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return response()->json([
            'message' => 'Expense claim rejected.',
            'expense' => $expense->fresh(),
        ]);
    }

    public function reimburse(Request $request, string $id): JsonResponse
    {
        $expense = Expense::findOrFail($id);
        $this->authorize('reimburse', $expense);

        if ($expense->status !== 'approved') {
            return response()->json([
                'message' => 'Only approved expenses can be marked as reimbursed.',
            ], 422);
        }

        $expense->update([
            'status' => 'reimbursed',
            'reimbursed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Expense marked as reimbursed.',
            'expense' => $expense->fresh(),
        ]);
    }
}

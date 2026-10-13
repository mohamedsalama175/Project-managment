<?php

namespace App\Modules\Financials\Controllers;

use App\Http\Controllers\Controller;
use App\Models\IdempotencyKey;
use App\Models\Project;
use App\Modules\Financials\Models\Invoice;
use App\Modules\Financials\Models\InvoiceLineItem;
use App\Modules\Financials\Services\InvoiceSequenceService;
use App\Modules\Tenancy\Services\TenantManager;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InvoiceController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected InvoiceSequenceService $sequenceService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Invoice::class);

        $query = Invoice::with(['project', 'lineItems']);

        if ($request->has('project_id')) {
            $query->where('project_id', $request->query('project_id'));
        }
        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        $invoices = $query->orderByDesc('issue_date')->get();

        return response()->json([
            'invoices' => $invoices,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Invoice::class);

        $user = $request->user();
        $idempotencyKey = $request->header('X-Idempotency-Key');

        // 1. Idempotency Check
        if ($idempotencyKey) {
            $cached = IdempotencyKey::where('user_id', $user->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($cached) {
                return response()->json($cached->response_body, $cached->response_code);
            }
        }

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'client_name' => ['required', 'string', 'max:255'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_address' => ['nullable', 'string', 'max:1000'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:issue_date'],
            'currency' => ['nullable', 'string', 'size:3'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'line_items' => ['required', 'array', 'min:1'],
            'line_items.*.description' => ['required', 'string', 'max:500'],
            'line_items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'line_items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'line_items.*.time_entry_id' => ['nullable', 'exists:time_entries,id'],
            'line_items.*.expense_id' => ['nullable', 'exists:expenses,id'],
        ]);

        $project = Project::findOrFail($validated['project_id']);
        if ($project->is_archived) {
            return response()->json([
                'message' => 'Cannot create invoices for an archived project.',
                'code' => 'PROJECT_ARCHIVED',
                'error_code' => 'PROJECT_ARCHIVED',
            ], 422);
        }

        $tenantId = app(TenantManager::class)->getTenantId() ?? $project->organization_id;

        $invoice = DB::transaction(function () use ($validated, $project, $user, $tenantId) {
            $invoiceNumber = $this->sequenceService->getNextInvoiceNumber($tenantId);

            $subtotal = 0.0;
            foreach ($validated['line_items'] as $item) {
                $subtotal += round((float) $item['quantity'] * (float) $item['unit_price'], 4);
            }

            $taxRate = (float) ($validated['tax_rate'] ?? 0.0);
            $taxAmount = round($subtotal * $taxRate, 4);
            $totalAmount = round($subtotal + $taxAmount, 4);

            $inv = Invoice::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $tenantId,
                'project_id' => $project->id,
                'invoice_number' => $invoiceNumber,
                'status' => 'draft',
                'client_name' => $validated['client_name'],
                'client_email' => $validated['client_email'] ?? null,
                'client_address' => $validated['client_address'] ?? null,
                'issue_date' => $validated['issue_date'],
                'due_date' => $validated['due_date'],
                'currency' => strtoupper($validated['currency'] ?? $project->billing_currency ?? 'USD'),
                'subtotal' => $subtotal,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            foreach ($validated['line_items'] as $item) {
                $itemAmount = round((float) $item['quantity'] * (float) $item['unit_price'], 4);
                InvoiceLineItem::create([
                    'id' => (string) Str::ulid(),
                    'organization_id' => $tenantId,
                    'invoice_id' => $inv->id,
                    'time_entry_id' => $item['time_entry_id'] ?? null,
                    'expense_id' => $item['expense_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'amount' => $itemAmount,
                ]);
            }

            return $inv;
        });

        $responseData = [
            'message' => 'Invoice created successfully in draft status.',
            'invoice' => $invoice->load(['project', 'lineItems']),
        ];

        // 2. Persist Idempotency Record
        if ($idempotencyKey) {
            $ttlMinutes = (int) config('deliverops.idempotency_ttl_minutes', 1440);
            try {
                IdempotencyKey::create([
                    'id' => (string) Str::ulid(),
                    'organization_id' => $tenantId,
                    'user_id' => $user->id,
                    'idempotency_key' => $idempotencyKey,
                    'request_hash' => hash('sha256', json_encode($request->all())),
                    'response_code' => 201,
                    'response_body' => $responseData,
                    'expires_at' => Carbon::now()->addMinutes($ttlMinutes),
                    'created_at' => now(),
                ]);
            } catch (QueryException $e) {
                // Duplicate entry collision on concurrent request race
                $cached = IdempotencyKey::where('user_id', $user->id)
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();

                if ($cached) {
                    return response()->json($cached->response_body, $cached->response_code);
                }
            }
        }

        return response()->json($responseData, 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $invoice = Invoice::with(['project', 'lineItems', 'creator'])->findOrFail($id);
        $this->authorize('view', $invoice);

        return response()->json([
            'invoice' => $invoice,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $this->authorize('update', $invoice);

        if ($invoice->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft invoices can be edited. Sent, paid, or void invoices are immutable.',
            ], 422);
        }

        $validated = $request->validate([
            'client_name' => ['sometimes', 'string', 'max:255'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_address' => ['nullable', 'string', 'max:1000'],
            'issue_date' => ['sometimes', 'date'],
            'due_date' => ['sometimes', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'tax_rate' => ['sometimes', 'numeric', 'min:0', 'max:1'],
        ]);

        $invoice->update($validated);

        if (isset($validated['tax_rate'])) {
            $taxAmount = round((float) $invoice->subtotal * (float) $validated['tax_rate'], 4);
            $invoice->update([
                'tax_amount' => $taxAmount,
                'total_amount' => round((float) $invoice->subtotal + $taxAmount, 4),
            ]);
        }

        return response()->json([
            'message' => 'Invoice updated successfully.',
            'invoice' => $invoice->fresh(['project', 'lineItems']),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $this->authorize('delete', $invoice);

        if ($invoice->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft invoices can be deleted.',
            ], 422);
        }

        // Delete line items first due to RESTRICT FK constraint
        InvoiceLineItem::where('invoice_id', $invoice->id)->delete();
        $invoice->delete();

        return response()->json([
            'message' => 'Draft invoice deleted successfully.',
        ]);
    }

    public function send(Request $request, string $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $this->authorize('send', $invoice);

        if (!in_array($invoice->status, ['draft', 'sent'])) {
            return response()->json([
                'message' => "Cannot send invoice with status '{$invoice->status}'.",
            ], 422);
        }

        $invoice->update([
            'status' => 'sent',
        ]);

        return response()->json([
            'message' => 'Invoice transitioned to sent status.',
            'invoice' => $invoice->fresh(),
        ]);
    }

    public function markPaid(Request $request, string $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $this->authorize('markPaid', $invoice);

        if (!in_array($invoice->status, ['sent', 'overdue'])) {
            return response()->json([
                'message' => "Only sent or overdue invoices can be marked as paid.",
            ], 422);
        }

        $invoice->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        return response()->json([
            'message' => 'Invoice marked as paid.',
            'invoice' => $invoice->fresh(),
        ]);
    }

    public function void(Request $request, string $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $this->authorize('void', $invoice);

        if ($invoice->status === 'paid') {
            return response()->json([
                'message' => 'Paid invoices cannot be voided.',
            ], 422);
        }

        $invoice->update([
            'status' => 'void',
        ]);

        return response()->json([
            'message' => 'Invoice voided successfully.',
            'invoice' => $invoice->fresh(),
        ]);
    }

    public function downloadPdf(Request $request, string $id): Response
    {
        $invoice = Invoice::with(['project', 'lineItems'])->findOrFail($id);
        $this->authorize('view', $invoice);

        $html = "<html><head><style>body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } .header { margin-bottom: 20px; }</style></head><body>"
            . "<div class='header'><h1>INVOICE #{$invoice->invoice_number}</h1>"
            . "<p><strong>Client:</strong> {$invoice->client_name}</p>"
            . "<p><strong>Issue Date:</strong> {$invoice->issue_date} | <strong>Due Date:</strong> {$invoice->due_date}</p>"
            . "<p><strong>Status:</strong> " . strtoupper($invoice->status) . "</p></div>"
            . "<table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>";

        foreach ($invoice->lineItems as $item) {
            $html .= "<tr><td>{$item->description}</td><td>{$item->quantity}</td><td>{$item->unit_price}</td><td>{$item->amount}</td></tr>";
        }

        $html .= "</tbody></table>"
            . "<div style='margin-top:20px;text-align:right;'>"
            . "<p><strong>Subtotal:</strong> {$invoice->currency} {$invoice->subtotal}</p>"
            . "<p><strong>Tax:</strong> {$invoice->currency} {$invoice->tax_amount}</p>"
            . "<h2><strong>Total:</strong> {$invoice->currency} {$invoice->total_amount}</h2>"
            . "</div></body></html>";

        $pdfOutput = Pdf::loadHTML($html)->output();

        return response($pdfOutput, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"invoice_{$invoice->invoice_number}.pdf\"",
        ]);
    }
}

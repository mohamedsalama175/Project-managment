<?php

namespace App\Modules\Financials\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Financials\Models\ScheduledReport;
use App\Modules\Financials\Services\ReportGeneratorService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class ReportController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected ReportGeneratorService $reportService
    ) {}

    public function catalog(Request $request): JsonResponse
    {
        if (!$request->user()->can('reports.generate')) {
            abort(403, 'Permission denied.');
        }

        return response()->json([
            'reports' => $this->reportService->getCatalog(),
        ]);
    }

    public function generate(Request $request): JsonResponse|Response
    {
        if (!$request->user()->can('reports.generate')) {
            abort(403, 'Permission denied.');
        }

        $validated = $request->validate([
            'report_type' => ['required', 'string'],
            'parameters' => ['nullable', 'array'],
            'format' => ['nullable', 'in:json,markdown,csv,pdf'],
        ]);

        $format = $validated['format'] ?? 'json';
        $result = $this->reportService->generate(
            $validated['report_type'],
            $validated['parameters'] ?? [],
            $format
        );

        if ($format === 'pdf') {
            return response($result['content'], 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => "attachment; filename=\"report_{$validated['report_type']}.pdf\"",
            ]);
        }

        if ($format === 'csv') {
            return response($result['content'], 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"report_{$validated['report_type']}.csv\"",
            ]);
        }

        return response()->json($result);
    }

    public function scheduled(Request $request): JsonResponse
    {
        if (!$request->user()->can('reports.generate')) {
            abort(403, 'Permission denied.');
        }

        $reports = ScheduledReport::with('user')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'scheduled_reports' => $reports,
        ]);
    }

    public function createScheduled(Request $request): JsonResponse
    {
        if (!$request->user()->can('reports.generate')) {
            abort(403, 'Permission denied.');
        }

        $validated = $request->validate([
            'report_type' => ['required', 'string'],
            'title' => ['required', 'string', 'max:255'],
            'parameters' => ['nullable', 'array'],
            'format' => ['nullable', 'in:json,markdown,csv,pdf'],
            'schedule' => [
                'required',
                'string',
                'max:100',
                // Standard 5-field cron expression regex
                'regex:/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/[0-9]+)\s+(\*|([0-9]|1[0-9]|2[0-3])|\*\/[0-9]+)\s+(\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/[0-9]+)\s+(\*|([1-9]|1[0-2])|\*\/[0-9]+)\s+(\*|([0-6])|\*\/[0-9]+)$/',
            ],
            'recipients' => ['required', 'array', 'min:1'],
            'recipients.*' => ['required', 'email'],
        ]);

        $tenantId = app(TenantManager::class)->getTenantId();

        $report = ScheduledReport::create([
            'id' => (string) Str::ulid(),
            'organization_id' => $tenantId,
            'user_id' => $request->user()->id,
            'report_type' => $validated['report_type'],
            'title' => $validated['title'],
            'parameters' => $validated['parameters'] ?? [],
            'format' => $validated['format'] ?? 'pdf',
            'schedule' => $validated['schedule'],
            'recipients' => $validated['recipients'],
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Report schedule created successfully.',
            'scheduled_report' => $report,
        ], 201);
    }

    public function deleteScheduled(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->can('reports.generate')) {
            abort(403, 'Permission denied.');
        }

        $report = ScheduledReport::findOrFail($id);
        $report->delete();

        return response()->json([
            'message' => 'Scheduled report deleted successfully.',
        ]);
    }
}

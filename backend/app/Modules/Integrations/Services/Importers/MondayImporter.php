<?php

namespace App\Modules\Integrations\Services\Importers;

use Carbon\Carbon;

class MondayImporter extends BaseImporter
{
    public function getSourceToolName(): string
    {
        return 'monday';
    }

    protected function parse(string $rawContent): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($rawContent));
        if (empty($lines)) {
            throw new \InvalidArgumentException('Empty Monday CSV content.');
        }

        $headerRow = str_getcsv(array_shift($lines));
        $headers = array_map(fn($h) => strtolower(trim($h)), $headerRow);

        $nameIdx = $this->findColumnIndex($headers, ['name', 'task', 'item', 'pulse']);
        $statusIdx = $this->findColumnIndex($headers, ['status']);
        $dateIdx = $this->findColumnIndex($headers, ['date', 'due date']);
        $depIdx = $this->findColumnIndex($headers, ['dependency', 'dependencies']);

        $tasks = [];
        $dependencies = [];

        foreach ($lines as $index => $line) {
            if (trim($line) === '') {
                continue;
            }

            $row = str_getcsv($line);
            $sourceId = (string) ($index + 1);
            $name = $nameIdx !== false && isset($row[$nameIdx]) ? trim($row[$nameIdx]) : "Item {$sourceId}";
            if ($name === '') {
                continue;
            }

            $statusRaw = $statusIdx !== false && isset($row[$statusIdx]) ? strtolower(trim($row[$statusIdx])) : 'todo';
            $status = match (true) {
                str_contains($statusRaw, 'done') || str_contains($statusRaw, 'complete') => 'done',
                str_contains($statusRaw, 'working') || str_contains($statusRaw, 'progress') => 'in_progress',
                str_contains($statusRaw, 'stuck') || str_contains($statusRaw, 'blocked') => 'blocked',
                default => 'todo',
            };

            $dueDate = null;
            if ($dateIdx !== false && !empty($row[$dateIdx])) {
                try {
                    $dueDate = Carbon::parse(trim($row[$dateIdx]))->toDateString();
                } catch (\Exception) {
                    $dueDate = null;
                }
            }

            $tasks[] = [
                'source_id' => $sourceId,
                'parent_source_id' => null,
                'title' => $name,
                'description' => null,
                'status' => $status,
                'priority' => 'medium',
                'is_milestone' => false,
                'estimated_hours' => 0.0,
                'order_index' => $index + 1,
                'start_date' => null,
                'due_date' => $dueDate,
            ];

            // Dependency by row index or name
            if ($depIdx !== false && !empty($row[$depIdx])) {
                $depVal = trim($row[$depIdx]);
                if (is_numeric($depVal)) {
                    $dependencies[] = [
                        'task_source_id' => $sourceId,
                        'predecessor_source_id' => (string) $depVal,
                        'dependency_type' => 'FS',
                    ];
                }
            }
        }

        return [$tasks, $dependencies];
    }

    protected function findColumnIndex(array $headers, array $candidates): int|false
    {
        foreach ($headers as $index => $header) {
            foreach ($candidates as $cand) {
                if (str_contains($header, $cand)) {
                    return $index;
                }
            }
        }

        return false;
    }
}

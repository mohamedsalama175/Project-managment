<?php

namespace App\Modules\Integrations\Services\Importers;

use Carbon\Carbon;

class AsanaImporter extends BaseImporter
{
    public function getSourceToolName(): string
    {
        return 'asana';
    }

    protected function parse(string $rawContent): array
    {
        $data = json_decode($rawContent, true);
        if (!is_array($data)) {
            throw new \InvalidArgumentException('Invalid Asana JSON payload.');
        }

        $items = $data['data'] ?? (isset($data[0]) ? $data : []);
        $tasks = [];
        $dependencies = [];

        foreach ($items as $index => $item) {
            $sourceId = (string) ($item['gid'] ?? ($item['id'] ?? ($index + 1)));
            $name = $item['name'] ?? 'Untitled Asana Task';
            $notes = $item['notes'] ?? null;

            $status = !empty($item['completed']) ? 'done' : 'todo';
            $isMilestone = !empty($item['resource_subtype']) && $item['resource_subtype'] === 'milestone';

            $dueDate = !empty($item['due_on']) ? Carbon::parse($item['due_on'])->toDateString() : null;
            $startDate = !empty($item['start_on']) ? Carbon::parse($item['start_on'])->toDateString() : null;

            $parentSourceId = !empty($item['parent']['gid']) ? (string) $item['parent']['gid'] : null;

            $tasks[] = [
                'source_id' => $sourceId,
                'parent_source_id' => $parentSourceId,
                'title' => $name,
                'description' => $notes,
                'status' => $status,
                'priority' => 'medium',
                'is_milestone' => $isMilestone,
                'estimated_hours' => 0.0,
                'order_index' => $index + 1,
                'start_date' => $startDate,
                'due_date' => $dueDate,
            ];

            // Dependencies: in Asana, dependencies array represents tasks that must be completed before this task
            if (!empty($item['dependencies']) && is_array($item['dependencies'])) {
                foreach ($item['dependencies'] as $dep) {
                    $depGid = (string) ($dep['gid'] ?? ($dep['id'] ?? ''));
                    if ($depGid) {
                        $dependencies[] = [
                            'task_source_id' => $sourceId,
                            'predecessor_source_id' => $depGid,
                            'dependency_type' => 'FS',
                        ];
                    }
                }
            }
        }

        return [$tasks, $dependencies];
    }
}

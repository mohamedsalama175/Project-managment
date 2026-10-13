<?php

namespace App\Modules\Integrations\Services\Importers;

use Carbon\Carbon;

class JiraImporter extends BaseImporter
{
    public function getSourceToolName(): string
    {
        return 'jira';
    }

    protected function parse(string $rawContent): array
    {
        $data = json_decode($rawContent, true);
        if (!is_array($data)) {
            throw new \InvalidArgumentException('Invalid Jira JSON payload.');
        }

        $issues = $data['issues'] ?? (isset($data[0]) ? $data : []);
        $tasks = [];
        $dependencies = [];

        foreach ($issues as $index => $issue) {
            $fields = $issue['fields'] ?? $issue;
            $sourceId = (string) ($issue['key'] ?? ($issue['id'] ?? ($index + 1)));

            $summary = $fields['summary'] ?? ($fields['title'] ?? 'Untitled Jira Issue');
            $description = is_string($fields['description'] ?? null)
                ? $fields['description']
                : json_encode($fields['description'] ?? null);

            $statusRaw = strtolower($fields['status']['name'] ?? ($fields['status'] ?? 'todo'));
            $status = match (true) {
                str_contains($statusRaw, 'done') || str_contains($statusRaw, 'closed') => 'done',
                str_contains($statusRaw, 'progress') => 'in_progress',
                str_contains($statusRaw, 'review') => 'review',
                str_contains($statusRaw, 'block') => 'blocked',
                default => 'todo',
            };

            $priorityRaw = strtolower($fields['priority']['name'] ?? ($fields['priority'] ?? 'medium'));
            $priority = match (true) {
                str_contains($priorityRaw, 'highest') || str_contains($priorityRaw, 'blocker') => 'urgent',
                str_contains($priorityRaw, 'high') => 'high',
                str_contains($priorityRaw, 'low') => 'low',
                default => 'medium',
            };

            $seconds = $fields['timetracking']['originalEstimateSeconds'] ?? ($fields['timeoriginalestimate'] ?? 0);
            $estimatedHours = round($seconds / 3600, 2);

            $parentSourceId = null;
            if (!empty($fields['parent']['key'])) {
                $parentSourceId = (string) $fields['parent']['key'];
            } elseif (!empty($fields['parent']['id'])) {
                $parentSourceId = (string) $fields['parent']['id'];
            }

            $startDate = !empty($fields['customfield_10015']) ? Carbon::parse($fields['customfield_10015'])->toDateString() : null;
            $dueDate = !empty($fields['duedate']) ? Carbon::parse($fields['duedate'])->toDateString() : null;

            $tasks[] = [
                'source_id' => $sourceId,
                'parent_source_id' => $parentSourceId,
                'title' => $summary,
                'description' => $description,
                'status' => $status,
                'priority' => $priority,
                'is_milestone' => strtolower($fields['issuetype']['name'] ?? '') === 'milestone',
                'estimated_hours' => $estimatedHours,
                'order_index' => $index + 1,
                'start_date' => $startDate,
                'due_date' => $dueDate,
            ];

            // Parse issue links for dependencies
            $issueLinks = $fields['issuelinks'] ?? [];
            foreach ($issueLinks as $link) {
                // "Blocks" relation: outwardIssue is blocked by this issue
                if (!empty($link['outwardIssue']['key'])) {
                    $dependencies[] = [
                        'task_source_id' => (string) $link['outwardIssue']['key'],
                        'predecessor_source_id' => $sourceId,
                        'dependency_type' => 'FS',
                    ];
                }
                // "is blocked by" relation: inwardIssue blocks this issue
                if (!empty($link['inwardIssue']['key'])) {
                    $dependencies[] = [
                        'task_source_id' => $sourceId,
                        'predecessor_source_id' => (string) $link['inwardIssue']['key'],
                        'dependency_type' => 'FS',
                    ];
                }
            }
        }

        return [$tasks, $dependencies];
    }
}

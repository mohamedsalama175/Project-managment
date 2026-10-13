<?php

namespace App\Modules\Integrations\Services\Importers;

use Carbon\Carbon;
use SimpleXMLElement;

class MsProjectImporter extends BaseImporter
{
    public function getSourceToolName(): string
    {
        return 'ms_project';
    }

    protected function parse(string $rawContent): array
    {
        // Strip default XML namespace to make SimpleXML parsing straightforward
        $cleanXml = preg_replace('/xmlns="[^"]+"/', '', $rawContent);
        $xml = @simplexml_load_string($cleanXml);

        if (!$xml || !isset($xml->Tasks)) {
            throw new \InvalidArgumentException('Invalid MS Project XML format.');
        }

        $tasks = [];
        $dependencies = [];
        $outlineStack = []; // level => sourceId

        $order = 0;
        foreach ($xml->Tasks->Task as $taskElem) {
            $uid = (string) $taskElem->UID;
            $name = (string) $taskElem->Name;

            // Skip blank tasks or project root task (UID 0) if it's the summary
            if ($uid === '0' || trim($name) === '') {
                continue;
            }

            $order++;
            $level = (int) ($taskElem->OutlineLevel ?? 1);
            $outlineStack[$level] = $uid;

            $parentSourceId = $level > 1 && isset($outlineStack[$level - 1]) ? $outlineStack[$level - 1] : null;

            $start = !empty($taskElem->Start) ? Carbon::parse((string) $taskElem->Start)->toDateString() : null;
            $finish = !empty($taskElem->Finish) ? Carbon::parse((string) $taskElem->Finish)->toDateString() : null;

            $isMilestone = (string) ($taskElem->Milestone ?? '0') === '1';
            $pctComplete = (int) ($taskElem->PercentComplete ?? 0);
            $status = $pctComplete >= 100 ? 'done' : ($pctComplete > 0 ? 'in_progress' : 'todo');

            $durationStr = (string) ($taskElem->Duration ?? '');
            $estimatedHours = 0.0;
            if (preg_match('/PT(\d+)H/i', $durationStr, $durMatch)) {
                $estimatedHours = (float) $durMatch[1];
            }

            $tasks[] = [
                'source_id' => $uid,
                'parent_source_id' => $parentSourceId,
                'title' => $name,
                'description' => null,
                'status' => $status,
                'priority' => 'medium',
                'is_milestone' => $isMilestone,
                'estimated_hours' => $estimatedHours,
                'order_index' => $order,
                'start_date' => $start,
                'due_date' => $finish,
            ];

            // PredecessorLink elements
            if (isset($taskElem->PredecessorLink)) {
                foreach ($taskElem->PredecessorLink as $predLink) {
                    $predUid = (string) $predLink->PredecessorUID;
                    $typeCode = (int) ($predLink->Type ?? 1);
                    $depType = match ($typeCode) {
                        0 => 'FF',
                        2 => 'SF',
                        3 => 'SS',
                        default => 'FS',
                    };

                    $lagDays = 0;
                    if (!empty($predLink->LinkLag)) {
                        $lagDays = (int) round(((int) $predLink->LinkLag) / 4800); // Tenths of minutes
                    }

                    if ($predUid !== '0' && $predUid !== $uid) {
                        $dependencies[] = [
                            'task_source_id' => $uid,
                            'predecessor_source_id' => $predUid,
                            'dependency_type' => $depType,
                            'lag_days' => $lagDays,
                        ];
                    }
                }
            }
        }

        return [$tasks, $dependencies];
    }
}

<?php

namespace App\Modules\Integrations\Services;

use App\Models\Task;
use App\Modules\Integrations\Models\CommitLink;
use Carbon\Carbon;
use Illuminate\Support\Str;

class GitCommitMatcherService
{
    /**
     * Parse commit message for task references and create commit links.
     */
    public function linkCommit(
        string $organizationId,
        string $repository,
        string $commitHash,
        string $commitMessage,
        string $authorName,
        string $authorEmail,
        string $commitUrl,
        ?Carbon $committedAt = null
    ): array {
        $committedAt = $committedAt ?? now();
        $taskIds = $this->extractTaskReferences($commitMessage, $organizationId);

        $createdLinks = [];

        foreach ($taskIds as $taskId) {
            // Avoid duplicate links
            $existing = CommitLink::where('organization_id', $organizationId)
                ->where('task_id', $taskId)
                ->where('commit_hash', $commitHash)
                ->first();

            if ($existing) {
                $createdLinks[] = $existing;
                continue;
            }

            $link = CommitLink::create([
                'id' => (string) Str::ulid(),
                'organization_id' => $organizationId,
                'task_id' => $taskId,
                'repository' => $repository,
                'commit_hash' => $commitHash,
                'commit_message' => $commitMessage,
                'author_name' => $authorName,
                'author_email' => $authorEmail,
                'url' => $commitUrl,
                'committed_at' => $committedAt,
                'created_at' => now(),
            ]);

            $createdLinks[] = $link;
        }

        return $createdLinks;
    }

    /**
     * Extract task IDs or references matching DOPS-123, TASK-123, #123, or 26-char ULIDs.
     */
    public function extractTaskReferences(string $message, string $organizationId): array
    {
        $taskIds = [];

        // 1. Check for ULIDs (26 alphanumeric chars)
        if (preg_match_all('/\b([0-9A-HJ-KM-NP-TV-Z]{26})\b/i', $message, $ulidMatches)) {
            foreach ($ulidMatches[1] as $candidate) {
                $task = Task::where('organization_id', $organizationId)->where('id', $candidate)->first();
                if ($task) {
                    $taskIds[] = $task->id;
                }
            }
        }

        // 2. Check for DOPS-123, TASK-123, or PROJ-123 pattern
        if (preg_match_all('/(?:DOPS|TASK|PROJ)-(\d+)/i', $message, $keyMatches)) {
            foreach ($keyMatches[0] as $idx => $fullKey) {
                $num = (int) $keyMatches[1][$idx];
                // Match task title containing key, or order_index
                $task = Task::where('organization_id', $organizationId)
                    ->where(function ($q) use ($fullKey, $num) {
                        $q->where('name', 'LIKE', "%{$fullKey}%")
                          ->orWhere('order_index', $num);
                    })
                    ->first();

                if ($task && !in_array($task->id, $taskIds, true)) {
                    $taskIds[] = $task->id;
                }
            }
        }

        return array_unique($taskIds);
    }
}

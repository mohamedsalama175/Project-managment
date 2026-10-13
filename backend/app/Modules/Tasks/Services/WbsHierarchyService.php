<?php

namespace App\Modules\Tasks\Services;

use App\Models\Project;
use App\Models\Task;
use Carbon\Carbon;

class WbsHierarchyService
{
    /**
     * Validates that parent assignment does not create self-reference or circular tree cycles.
     */
    public function validateParent(Task $task, ?string $newParentId): void
    {
        if (empty($newParentId)) {
            return;
        }

        if ($task->id && $task->id === $newParentId) {
            abort(422, 'A task cannot be set as its own parent.');
        }

        $parent = Task::where('project_id', $task->project_id)->find($newParentId);
        if (!$parent) {
            abort(422, 'Parent task not found or belongs to a different project.');
        }

        // Check if new parent is a descendant of the task
        if ($task->id) {
            $descendants = $this->getAllDescendantIds($task);
            if (in_array($newParentId, $descendants, true)) {
                abort(422, 'Circular hierarchy detected: cannot set a task parent to one of its own descendants.');
            }
        }
    }

    /**
     * Traverses and returns all descendant task IDs.
     */
    public function getAllDescendantIds(Task $task): array
    {
        $descendants = [];
        $children = Task::where('parent_id', $task->id)->get();

        foreach ($children as $child) {
            $descendants[] = $child->id;
            $descendants = array_merge($descendants, $this->getAllDescendantIds($child));
        }

        return $descendants;
    }

    /**
     * Recalculates summary rollup metrics (dates, duration, and effort-weighted progress).
     */
    public function rollupParent(Task $parent): void
    {
        $children = Task::where('parent_id', $parent->id)->get();
        if ($children->isEmpty()) {
            return;
        }

        $minStart = null;
        $maxEnd = null;
        $totalHours = 0.0;
        $weightedProgress = 0.0;

        foreach ($children as $child) {
            $cStart = Carbon::parse($child->start_date);
            $cEnd = Carbon::parse($child->end_date);

            if ($minStart === null || $cStart->lt($minStart)) {
                $minStart = $cStart;
            }
            if ($maxEnd === null || $cEnd->gt($maxEnd)) {
                $maxEnd = $cEnd;
            }

            $hours = (float) ($child->estimated_hours ?? 8.0);
            $totalHours += $hours;
            $weightedProgress += ((float) $child->pct) * $hours;
        }

        $computedPct = $totalHours > 0 ? (int) round($weightedProgress / $totalHours) : (int) round($children->avg('pct'));

        $parent->update([
            'start_date' => $minStart->format('Y-m-d'),
            'end_date' => $maxEnd->format('Y-m-d'),
            'pct' => min(100, max(0, $computedPct)),
        ]);

        // Propagate recursively up the tree
        if ($parent->parent_id) {
            $grandParent = Task::find($parent->parent_id);
            if ($grandParent) {
                $this->rollupParent($grandParent);
            }
        }
    }

    /**
     * Persists new linear ordering across project tasks.
     */
    public function reorder(Project $project, array $orderedIds): void
    {
        foreach ($orderedIds as $index => $id) {
            Task::where('project_id', $project->id)
                ->where('id', $id)
                ->update(['order_index' => $index]);
        }
    }
}

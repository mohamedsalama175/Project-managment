<?php

namespace App\Modules\Resources\Listeners;

use App\Modules\Collaboration\Services\ActivityLoggerService;
use App\Modules\Resources\Events\ResourceLevelingAppliedEvent;
use App\Modules\Resources\Events\TimeEntryTransitionedEvent;
use App\Modules\Resources\Events\TimeOffStatusChangedEvent;

class LogResourceActivityEventListener
{
    public function __construct(
        protected ActivityLoggerService $activityLogger
    ) {}

    public function handleTimeEntryTransition(TimeEntryTransitionedEvent $event): void
    {
        $this->activityLogger->log([
            'organization_id' => $event->entry->organization_id,
            'project_id' => $event->entry->project_id,
            'task_id' => $event->entry->task_id,
            'actor_id' => $event->actor->id,
            'action' => $event->action,
            'metadata' => array_merge([
                'time_entry_id' => $event->entry->id,
                'hours' => (float) $event->entry->hours,
                'date' => $event->entry->date->format('Y-m-d'),
                'billable' => (bool) $event->entry->billable,
            ], $event->metadata),
        ]);
    }

    public function handleLevelingApplied(ResourceLevelingAppliedEvent $event): void
    {
        $this->activityLogger->log([
            'organization_id' => $event->project->organization_id,
            'project_id' => $event->project->id,
            'actor_id' => $event->actor->id,
            'action' => 'resource_leveled',
            'metadata' => $event->proposalSummary,
        ]);
    }

    public function handleTimeOffStatusChanged(TimeOffStatusChangedEvent $event): void
    {
        $this->activityLogger->log([
            'organization_id' => $event->request->organization_id,
            'project_id' => null,
            'actor_id' => $event->actor->id,
            'action' => 'time_off_' . $event->status,
            'metadata' => array_merge([
                'time_off_id' => $event->request->id,
                'user_id' => $event->request->user_id,
                'start_date' => $event->request->start_date->format('Y-m-d'),
                'end_date' => $event->request->end_date->format('Y-m-d'),
                'type' => $event->request->type,
            ], $event->metadata),
        ]);
    }
}

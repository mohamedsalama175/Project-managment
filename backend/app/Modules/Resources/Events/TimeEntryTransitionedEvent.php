<?php

namespace App\Modules\Resources\Events;

use App\Models\User;
use App\Modules\Resources\Models\TimeEntry;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TimeEntryTransitionedEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public TimeEntry $entry,
        public string $action,
        public User $actor,
        public array $metadata = []
    ) {}
}

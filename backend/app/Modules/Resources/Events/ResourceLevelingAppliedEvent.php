<?php

namespace App\Modules\Resources\Events;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ResourceLevelingAppliedEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Project $project,
        public User $actor,
        public array $proposalSummary = []
    ) {}
}

<?php

namespace App\Modules\Resources\Events;

use App\Models\User;
use App\Modules\Resources\Models\TimeOffRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TimeOffStatusChangedEvent
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public TimeOffRequest $request,
        public string $status,
        public User $actor,
        public array $metadata = []
    ) {}
}

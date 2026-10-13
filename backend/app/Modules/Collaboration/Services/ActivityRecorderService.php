<?php

namespace App\Modules\Collaboration\Services;

class ActivityRecorderService extends ActivityLoggerService
{
    /**
     * Record an activity event (alias for log)
     */
    public function record(array $attributes)
    {
        return $this->log($attributes);
    }
}

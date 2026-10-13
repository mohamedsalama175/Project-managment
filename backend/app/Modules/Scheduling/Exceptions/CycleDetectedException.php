<?php

namespace App\Modules\Scheduling\Exceptions;

use RuntimeException;

class CycleDetectedException extends RuntimeException
{
    public function __construct(string $message = 'Circular dependency cycle detected in project task network.')
    {
        parent::__construct($message, 422);
    }
}

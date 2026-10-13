<?php

namespace App\Modules\Tenancy\Exceptions;

use RuntimeException;

class PlanLimitExceededException extends RuntimeException
{
    public function __construct(
        string $message = 'Organization plan limit exceeded.',
        protected ?int $limit = null,
        protected ?int $current = null,
        int $code = 422
    ) {
        parent::__construct($message, $code);
    }

    public function getLimit(): ?int
    {
        return $this->limit;
    }

    public function getCurrent(): ?int
    {
        return $this->current;
    }
}

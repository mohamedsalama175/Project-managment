<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Tests\Traits\ActsAsTenant;
use Tests\Traits\CreatesOrganizations;

abstract class TestCase extends BaseTestCase
{
    use CreatesOrganizations, ActsAsTenant;
}

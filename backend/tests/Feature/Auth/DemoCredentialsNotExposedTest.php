<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;

class DemoCredentialsNotExposedTest extends TestCase
{
    public function test_login_page_does_not_expose_credentials_in_production(): void
    {
        app()->detectEnvironment(fn () => 'production');
        $response = $this->get('/login');
        $response->assertOk();
        $response->assertDontSee('AdminPassword2026!');
        $response->assertDontSee('DeliverOps123!');
    }

    public function test_persona_switcher_hidden_when_demo_mode_disabled(): void
    {
        $response = $this->get('/login');
        $response->assertOk();
        $response->assertDontSee('1-Click Switch');
        $response->assertDontSee('5 accounts ready');
    }
}

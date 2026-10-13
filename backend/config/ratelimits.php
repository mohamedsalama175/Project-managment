<?php

return [
    'guest' => [
        'login' => [
            'max_attempts' => (int) env('RL_LOGIN_ATTEMPTS', 5),
            'decay_minutes' => 1,
        ],
        'register' => [
            'max_attempts' => (int) env('RL_REGISTER_ATTEMPTS', 3),
            'decay_minutes' => 1,
        ],
        'forgot_password' => [
            'max_attempts' => (int) env('RL_FORGOT_PWD_ATTEMPTS', 3),
            'decay_minutes' => 1,
        ],
        'mfa_challenge' => [
            'max_attempts' => (int) env('RL_MFA_CHALLENGE_ATTEMPTS', 5),
            'decay_minutes' => 1,
        ],
    ],
    'user' => [
        'api_standard' => [
            'max_attempts' => (int) env('RL_API_STANDARD_ATTEMPTS', 120),
            'decay_minutes' => 1,
        ],
        'logout_all' => [
            'max_attempts' => (int) env('RL_LOGOUT_ALL_ATTEMPTS', 5),
            'decay_minutes' => 1,
        ],
        'mfa_setup' => [
            'max_attempts' => (int) env('RL_MFA_SETUP_ATTEMPTS', 3),
            'decay_minutes' => 1,
        ],
        'mfa_confirm' => [
            'max_attempts' => (int) env('RL_MFA_CONFIRM_ATTEMPTS', 5),
            'decay_minutes' => 1,
        ],
        'invitations' => [
            'max_attempts' => (int) env('RL_INVITATIONS_ATTEMPTS', 20),
            'decay_minutes' => 1,
        ],
        'password_change' => [
            'max_attempts' => (int) env('RL_PWD_CHANGE_ATTEMPTS', 5),
            'decay_minutes' => 1,
        ],
    ],
];

<?php

return [
    'system_org_id' => env('DELIVEROPS_SYSTEM_ORG_ID', '01HZX000000000000000000000'),
    'version' => env('APP_VERSION', '1.0.0'),
    'attachment_scan_driver' => env('ATTACHMENT_SCAN_DRIVER', 'mock'),
    'idempotency_ttl_minutes' => env('DELIVEROPS_IDEMPOTENCY_TTL', 1440),
    'cost_snapshot_retention_months' => env('DELIVEROPS_COST_SNAPSHOT_RETENTION_MONTHS', 24),

    'api_scopes' => [
        'projects:read' => 'Read project metadata, budgets, and milestones',
        'projects:write' => 'Create and modify projects and budgets',
        'tasks:read' => 'Read tasks, WBS nodes, and dependencies',
        'tasks:write' => 'Create, update, and re-order tasks',
        'risks:read' => 'View risk registers and mitigations',
        'risks:write' => 'Create and update risks',
        'time:read' => 'View time entries and timesheets',
        'time:write' => 'Submit and log time entries',
        'financials:read' => 'Read costs, EVM metrics, and invoices',
        'webhooks:manage' => 'Configure and test outbound webhook endpoints',
    ],

    'integrations' => [
        'connectors' => ['slack', 'teams', 'github', 'gitlab', 'google_calendar'],
        'import_providers' => ['jira', 'asana', 'monday', 'msproject'],
        'github_webhook_secret' => env('GITHUB_WEBHOOK_SECRET', 'test_github_secret'),
        'slack_signing_secret' => env('SLACK_SIGNING_SECRET', 'test_slack_secret'),
        'teams_webhook_secret' => env('TEAMS_WEBHOOK_SECRET', base64_encode('test_teams_secret')),
    ],

    'ai' => [
        'default_provider' => env('AI_DEFAULT_PROVIDER', 'openai'),
        'monthly_budget_usd' => env('AI_DEFAULT_MONTHLY_BUDGET', 50.00),
        'daily_request_limit_per_user' => env('AI_DAILY_USER_LIMIT', 100),
        'models' => [
            'openai' => 'gpt-4o',
            'anthropic' => 'claude-3-5-sonnet-20241022',
            'gemini' => 'gemini-1.5-pro',
            'ollama' => 'llama3',
        ],
    ],

    'automation_templates' => [
        [
            'id' => 'tpl_task_blocked_risk',
            'name' => 'Blocker Risk Escalation',
            'description' => 'When a task is marked Blocked, automatically create a High risk and notify the PM',
            'trigger' => ['event' => 'task.status_changed'],
            'conditions' => ['all' => [['field' => 'status', 'operator' => 'equals', 'value' => 'Blocked']]],
            'actions' => [
                ['type' => 'create_risk', 'params' => ['title' => 'Task blocked: {{task.name}}', 'severity' => 'high', 'type' => 'blocker']],
                ['type' => 'send_notification', 'params' => ['recipient' => 'pm', 'title' => 'Task Blocked', 'body' => '{{task.name}} has been blocked']],
            ],
        ],
        [
            'id' => 'tpl_task_completed_watchers',
            'name' => 'Notify Watchers on Completion',
            'description' => 'When a task status transitions to Completed, dispatch notification to all watchers',
            'trigger' => ['event' => 'task.status_changed'],
            'conditions' => ['all' => [['field' => 'status', 'operator' => 'equals', 'value' => 'Completed']]],
            'actions' => [
                ['type' => 'notify_watchers', 'params' => ['title' => 'Task Completed', 'body' => '{{task.name}} is now complete']],
            ],
        ],
        [
            'id' => 'tpl_review_approved_complete',
            'name' => 'Auto-Complete on Review Approval',
            'description' => 'When a review is approved, mark the task as Completed and notify submitter',
            'trigger' => ['event' => 'review.approved'],
            'conditions' => [],
            'actions' => [
                ['type' => 'set_status', 'params' => ['status' => 'Completed']],
                ['type' => 'send_notification', 'params' => ['recipient' => 'submitter', 'title' => 'Review Approved', 'body' => 'Your deliverable for {{task.name}} was approved']],
            ],
        ],
        [
            'id' => 'tpl_risk_resolved_unblock',
            'name' => 'Unblock Tasks on Risk Resolution',
            'description' => 'When a blocking risk is resolved or mitigated, unblock linked tasks',
            'trigger' => ['event' => 'risk.resolved'],
            'conditions' => [],
            'actions' => [
                ['type' => 'unblock_linked_tasks', 'params' => []],
            ],
        ],
        [
            'id' => 'tpl_weekly_digest_friday',
            'name' => 'Friday Project Digest',
            'description' => 'Every Friday at 17:00, generate AI project digest and email stakeholders',
            'trigger' => ['event' => 'schedule.weekly'],
            'conditions' => [],
            'actions' => [
                ['type' => 'generate_ai_digest', 'params' => ['time_range' => '7d', 'recipients' => 'stakeholders']],
            ],
        ],
        [
            'id' => 'tpl_overdue_escalate',
            'name' => 'Overdue Priority Escalation',
            'description' => 'When task end date has passed and status is not Completed, escalate priority to Urgent',
            'trigger' => ['event' => 'schedule.daily'],
            'conditions' => ['all' => [['field' => 'is_overdue', 'operator' => 'equals', 'value' => true]]],
            'actions' => [
                ['type' => 'set_priority', 'params' => ['priority' => 'Urgent']],
            ],
        ],
        [
            'id' => 'tpl_capacity_overrun_alert',
            'name' => 'Weekly Capacity Overrun Alert',
            'description' => 'When a timesheet submission exceeds allocated weekly capacity, alert project manager',
            'trigger' => ['event' => 'timesheet.submitted'],
            'conditions' => ['all' => [['field' => 'exceeds_capacity', 'operator' => 'equals', 'value' => true]]],
            'actions' => [
                ['type' => 'send_notification', 'params' => ['recipient' => 'pm', 'title' => 'Capacity Exceeded', 'body' => 'Logged hours exceed weekly capacity for {{user.name}}']],
            ],
        ],
    ],
];

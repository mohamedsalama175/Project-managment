<?php

namespace App\Modules\Integrations\Controllers\ApiV2;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class DocsController extends Controller
{
    public function openApi(): JsonResponse
    {
        $spec = [
            'openapi' => '3.1.0',
            'info' => [
                'title' => 'DeliverOps Public REST API v2',
                'version' => '2.0.0',
                'description' => 'Official stable REST API v2 and OAuth 2.0 PKCE authentication endpoints for DeliverOps.',
            ],
            'servers' => [
                ['url' => url('/api/v2'), 'description' => 'API v2 Production Endpoint'],
            ],
            'paths' => [
                '/projects' => [
                    'get' => [
                        'summary' => 'List Projects',
                        'security' => [['ApiKeyAuth' => []], ['OAuth2' => ['projects:read']]],
                        'responses' => [
                            '200' => ['description' => 'Paginated project list'],
                            '401' => ['description' => 'Unauthenticated'],
                        ],
                    ],
                    'post' => [
                        'summary' => 'Create Project',
                        'security' => [['ApiKeyAuth' => []], ['OAuth2' => ['projects:write']]],
                        'parameters' => [
                            [
                                'name' => 'X-Idempotency-Key',
                                'in' => 'header',
                                'required' => true,
                                'schema' => ['type' => 'string'],
                                'description' => 'Unique idempotency key for safely retrying mutating requests.',
                            ],
                        ],
                        'responses' => [
                            '201' => ['description' => 'Project created'],
                            '422' => ['description' => 'Validation error or missing idempotency key'],
                        ],
                    ],
                ],
                '/tasks' => [
                    'get' => [
                        'summary' => 'List Tasks',
                        'security' => [['ApiKeyAuth' => []], ['OAuth2' => ['tasks:read']]],
                        'responses' => [
                            '200' => ['description' => 'Paginated task list'],
                        ],
                    ],
                    'post' => [
                        'summary' => 'Create Task',
                        'security' => [['ApiKeyAuth' => []], ['OAuth2' => ['tasks:write']]],
                        'parameters' => [
                            [
                                'name' => 'X-Idempotency-Key',
                                'in' => 'header',
                                'required' => true,
                                'schema' => ['type' => 'string'],
                            ],
                        ],
                        'responses' => [
                            '201' => ['description' => 'Task created'],
                        ],
                    ],
                ],
                '/oauth/authorize' => [
                    'get' => [
                        'summary' => 'OAuth Authorization Consent Screen',
                        'responses' => [
                            '200' => ['description' => 'Client details and requested scopes for consent approval'],
                        ],
                    ],
                    'post' => [
                        'summary' => 'Approve OAuth Authorization (Issues Auth Code)',
                        'responses' => [
                            '200' => ['description' => 'Authorization code issued'],
                        ],
                    ],
                ],
                '/oauth/token' => [
                    'post' => [
                        'summary' => 'OAuth Token Exchange and Refresh',
                        'responses' => [
                            '200' => ['description' => 'Access and refresh tokens issued'],
                        ],
                    ],
                ],
                '/oauth/revoke' => [
                    'post' => [
                        'summary' => 'Revoke Token (RFC 7009)',
                        'responses' => [
                            '200' => ['description' => 'Token revoked'],
                        ],
                    ],
                ],
            ],
            'components' => [
                'securitySchemes' => [
                    'ApiKeyAuth' => [
                        'type' => 'apiKey',
                        'in' => 'header',
                        'name' => 'X-API-Key',
                    ],
                    'OAuth2' => [
                        'type' => 'oauth2',
                        'flows' => [
                            'authorizationCode' => [
                                'authorizationUrl' => url('/oauth/authorize'),
                                'tokenUrl' => url('/oauth/token'),
                                'scopes' => [
                                    'projects:read' => 'Read project data',
                                    'projects:write' => 'Create and modify projects',
                                    'tasks:read' => 'Read task data',
                                    'tasks:write' => 'Create and modify tasks',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        return response()->json($spec);
    }
}

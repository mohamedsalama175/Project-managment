<?php

use App\Modules\Identity\Controllers\ScimController;
use App\Modules\Identity\Controllers\SsoController;
use Illuminate\Support\Facades\Route;

// Public SSO Initiation & Callback Routes
Route::prefix('api/v1/auth/sso')->group(function () {
    Route::post('redirect', [SsoController::class, 'redirect']);
    Route::post('callback', [SsoController::class, 'callback']);
});

// Authenticated Tenant SSO & SCIM Token Management
Route::middleware(['auth:sanctum', 'tenant', 'email.verified'])->prefix('api/v1/auth/sso')->group(function () {
    Route::get('config', [SsoController::class, 'showConfig']);
    Route::post('config', [SsoController::class, 'updateConfig']);
    Route::post('scim-tokens', [SsoController::class, 'createScimToken']);
    Route::delete('scim-tokens/{id}', [SsoController::class, 'revokeScimToken']);
});

// RFC 7644 SCIM 2.0 Endpoints
Route::middleware(['auth.scim_token'])->prefix('scim/v2')->group(function () {
    Route::get('Users', [ScimController::class, 'getUsers']);
    Route::post('Users', [ScimController::class, 'createUser']);
    Route::get('Users/{id}', [ScimController::class, 'getUser']);
    Route::patch('Users/{id}', [ScimController::class, 'patchUser']);
    Route::delete('Users/{id}', [ScimController::class, 'deleteUser']);
    Route::get('Groups', [ScimController::class, 'getGroups']);
});

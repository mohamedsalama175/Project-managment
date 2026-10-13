<?php

use App\Modules\Notifications\Controllers\PushTokenController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'tenant', 'email.verified'])->prefix('api/v1')->group(function () {
    Route::post('push/tokens', [PushTokenController::class, 'store']);
    Route::delete('push/tokens/{id}', [PushTokenController::class, 'destroy']);
});

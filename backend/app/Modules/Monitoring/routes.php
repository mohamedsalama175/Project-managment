<?php

use App\Modules\Monitoring\Controllers\SlaStatusController;
use Illuminate\Support\Facades\Route;

Route::get('/api/v1/status/public', [SlaStatusController::class, 'publicStatus']);

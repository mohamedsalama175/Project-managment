<?php

namespace App\Modules\System\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Schema;

class SystemStatusController extends Controller
{
    /**
     * Check first-run installation status.
     * Public endpoint to determine if platform migrations and super-admin exist.
     */
    public function status(): JsonResponse
    {
        $hasUsers = Schema::hasTable('users');
        $hasOrgs = Schema::hasTable('organizations');

        if (!$hasUsers || !$hasOrgs) {
            return response()->json([
                'installed' => false,
                'admin_exists' => false,
                'version' => '1.0.0',
            ]);
        }

        $userCount = User::count();
        $adminExists = User::whereHas('roles', function ($query) {
            $query->where('name', 'admin');
        })->exists();

        $installed = \App\Models\InstallState::isInstalled() || ($userCount > 0 && $adminExists);

        return response()->json([
            'installed' => $installed,
            'admin_exists' => $adminExists,
            'version' => '1.0.0',
        ]);
    }
}

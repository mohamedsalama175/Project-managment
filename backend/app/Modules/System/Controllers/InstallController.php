<?php

namespace App\Modules\System\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\System\Requests\InstallAdminRequest;
use App\Modules\System\Services\InstallService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstallController extends Controller
{
    public function __construct(
        protected InstallService $installService
    ) {}

    /**
     * Check if system is installed.
     */
    public function status(): JsonResponse
    {
        $installState = $this->installService->getInstallState();

        return response()->json([
            'is_installed' => $installState !== null,
            'app_version' => $installState?->app_version ?? config('deliverops.version', '1.0.0'),
            'installed_at' => $installState?->installed_at?->toIso8601String(),
        ]);
    }

    /**
     * Install system via Web/API wizard.
     */
    public function install(InstallAdminRequest $request): JsonResponse
    {
        if ($this->installService->isInstalled()) {
            return response()->json([
                'message' => 'System is already installed.',
                'code' => 'SYSTEM_ALREADY_INSTALLED',
            ], 409);
        }

        $result = $this->installService->install(
            $request->validated(),
            'web',
            $request->ip()
        );

        return response()->json([
            'message' => 'System installed successfully.',
            'admin_user' => [
                'id' => $result['user']->id,
                'name' => $result['user']->name,
                'email' => $result['user']->email,
            ],
            'organization' => [
                'id' => $result['organization']->id,
                'name' => $result['organization']->name,
                'slug' => $result['organization']->slug,
            ],
        ], 201);
    }
}

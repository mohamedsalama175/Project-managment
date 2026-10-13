<?php

namespace App\Modules\System\Services;

use App\Models\InstallState;

class InstallService
{
    public function __construct(
        protected InstallationOrchestrator $orchestrator
    ) {}

    public function isInstalled(): bool
    {
        return InstallState::isInstalled();
    }

    public function getInstallState(): ?InstallState
    {
        return InstallState::where('id', InstallState::SINGLETON_ID)->first();
    }

    public function install(array $data, string $installedVia = 'web', ?string $ip = null): array
    {
        return $this->orchestrator->install($data, $installedVia, $ip);
    }
}

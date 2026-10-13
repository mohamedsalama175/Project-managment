<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Permission\PermissionRegistrar;

class PrepareSpatieTeamsCommand extends Command
{
    protected $signature = 'deliverops:prepare-spatie-teams';
    protected $description = 'Verifies Spatie teams configuration and flushes permission cache prior to tenant migration';

    public function handle(): int
    {
        if (!config('permission.teams')) {
            $this->error('config/permission.php "teams" setting must be true before running tenant migrations.');
            return 1;
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->info('Spatie permission cache cleared and teams config confirmed.');
        return 0;
    }
}

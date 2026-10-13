<?php

namespace App\Console\Commands;

use App\Models\InstallState;
use App\Modules\System\Services\InstallationOrchestrator;
use Illuminate\Console\Command;

class DeliverOpsInstallCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'deliverops:install {--force : Force the operation to run when in production}';

    /**
     * The console command description.
     */
    protected $description = 'Runs database migrations and initializes the DeliverOps super-admin account';

    /**
     * Execute the console command.
     */
    public function handle(InstallationOrchestrator $orchestrator): int
    {
        $this->info('====================================================');
        $this->info('   DeliverOps Enterprise Platform Installation      ');
        $this->info('====================================================');

        // 1. Verify Spatie Teams prerequisite
        if (!config('permission.teams')) {
            $this->error('Error: config/permission.php "teams" setting must be enabled.');
            return Command::FAILURE;
        }

        // 2. Execute Migrations
        $this->info('Running database migrations...');
        $migrateResult = $this->call('migrate', [
            '--force' => true,
        ]);

        if ($migrateResult !== 0) {
            $this->error('Database migration failed.');
            return Command::FAILURE;
        }

        // 3. Check if already installed
        if (InstallState::isInstalled()) {
            $this->warn('System is already installed (singleton install_state exists).');
            return Command::SUCCESS;
        }

        // 4. Run Installation Orchestrator
        $this->info('Seeding permissions, templates, and initializing primary administrator...');
        try {
            $result = $orchestrator->install([], 'cli');
        } catch (\Throwable $e) {
            $this->error('Installation failed: ' . $e->getMessage());
            return Command::FAILURE;
        }

        $adminUser = $result['user'];
        $org = $result['organization'];

        $this->newLine();
        $this->info('✔ DeliverOps installed successfully!');
        $this->table(
            ['Configuration', 'Value'],
            [
                ['Organization ID', $org->id],
                ['Organization Name', $org->name],
                ['Super Admin Name', $adminUser->name],
                ['Super Admin Email', $adminUser->email],
                ['RBAC Status', 'Spatie Teams Multi-Tenancy Active'],
            ]
        );

        $this->newLine();
        $this->comment('Next step: Boot the frontend client or start the development server via "npm run dev".');

        return Command::SUCCESS;
    }
}

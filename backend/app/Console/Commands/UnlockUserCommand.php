<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class UnlockUserCommand extends Command
{
    protected $signature = 'deliverops:unlock {email : The email address of the locked user}';

    protected $description = 'Manually unlock a user account locked due to consecutive failed login attempts';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email [{$email}] not found.");
            return Command::FAILURE;
        }

        $wasLocked = ($user->failed_login_attempts > 0) || ($user->locked_until !== null);

        $user->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ]);

        try {
            DB::table('auth_events')->insert([
                'id' => (string) Str::ulid(),
                'user_id' => $user->id,
                'email_attempted' => $user->email,
                'organization_id' => $user->default_organization_id,
                'event_type' => 'login_success',
                'event' => 'admin_unlocked',
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Artisan CLI / deliverops:unlock',
                'payload' => json_encode(['unlocked_by' => 'cli']),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // Non-blocking telemetry
        }

        if ($wasLocked) {
            $this->info("User [{$email}] has been unlocked successfully. Failed attempt counter cleared.");
        } else {
            $this->warn("User [{$email}] was not currently locked, but counter has been reset to 0.");
        }

        return Command::SUCCESS;
    }
}

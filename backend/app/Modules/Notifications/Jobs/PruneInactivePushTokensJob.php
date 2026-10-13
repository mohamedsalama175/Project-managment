<?php

namespace App\Modules\Notifications\Jobs;

use App\Modules\Notifications\Models\PushToken;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class PruneInactivePushTokensJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        PushToken::where('is_active', false)
            ->orWhere('last_used_at', '<', now()->subDays(90))
            ->delete();
    }
}

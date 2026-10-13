<?php

namespace App\Modules\AI\Listeners;

use App\Models\User;
use App\Modules\AI\Events\AiBudgetThresholdExceeded;
use App\Modules\Notifications\Services\NotificationDeliveryService;
use Illuminate\Support\Facades\DB;

class SendBudgetAlert
{
    public function __construct(
        protected NotificationDeliveryService $notificationService
    ) {}

    public function handle(AiBudgetThresholdExceeded $event): void
    {
        // Direct deterministic lookup via organization_users junction table
        $ownerId = DB::table('organization_users')
            ->where('organization_id', $event->organization->id)
            ->where('is_owner', true)
            ->value('user_id');

        $owner = $ownerId ? User::find($ownerId) : null;

        if ($owner) {
            $formattedSpend = number_format($event->currentSpend, 2);
            $formattedLimit = number_format($event->budgetLimit, 2);

            $this->notificationService->dispatch(
                $owner,
                'ai.budget_warning',
                "AI Budget Alert ({$event->threshold}%)",
                "Your organization has utilized \${$formattedSpend} of the monthly \${$formattedLimit} AI budget limit ({$event->threshold}% threshold).",
                '/settings/ai',
                null,
                null
            );
        }
    }
}

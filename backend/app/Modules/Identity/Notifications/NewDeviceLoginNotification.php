<?php

namespace App\Modules\Identity\Notifications;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewDeviceLoginNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $ip,
        public string $userAgent,
        public Carbon $loginTime
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('DeliverOps Security Alert: New Device Login Detected')
            ->greeting("Hello {$notifiable->name},")
            ->line('A new login to your DeliverOps account was detected from an unrecognized device or location.')
            ->line("**IP Address:** {$this->ip}")
            ->line("**Device / Browser:** {$this->userAgent}")
            ->line("**Timestamp:** " . $this->loginTime->toIso8601String())
            ->line('If this was you, you can safely ignore this email.')
            ->line('If you did NOT initiate this login, please immediately revoke all active sessions and reset your password.')
            ->action('Manage Active Sessions', url('/'))
            ->salutation('DeliverOps Security Team');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'new_device_login',
            'ip' => $this->ip,
            'user_agent' => $this->userAgent,
            'time' => $this->loginTime->toIso8601String(),
        ];
    }
}

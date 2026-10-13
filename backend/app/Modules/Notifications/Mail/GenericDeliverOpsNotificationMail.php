<?php

namespace App\Modules\Notifications\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class GenericDeliverOpsNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $notificationTitle,
        public string $notificationBody,
        public ?string $actionUrl,
        public string $eventType,
        public User $recipient,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->notificationTitle);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.generic-notification');
    }
}

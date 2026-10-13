<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $notificationTitle }}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; background-color: #f9fafb; margin: 0; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #1f8a70; letter-spacing: 0.05em; margin-bottom: 8px;">
            DeliverOps Notification
        </div>
        <h2 style="color: #111827; margin-top: 0; font-size: 20px;">{{ $notificationTitle }}</h2>
        <p style="color: #6b7280; font-size: 13px; margin-bottom: 12px;">Hello {{ $recipient->name }},</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">{{ $notificationBody }}</p>
        @if($actionUrl)
            <div style="margin-top: 24px; margin-bottom: 24px;">
                <a href="{{ config('app.url', 'http://localhost:5173') . $actionUrl }}"
                   style="display: inline-block; padding: 10px 20px; background: #1f8a70; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px;">
                    View in DeliverOps &rarr;
                </a>
            </div>
        @endif
        <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 32px; color: #9ca3af; font-size: 12px;">
            You received this email according to your workspace notification preferences in DeliverOps.
        </div>
    </div>
</body>
</html>

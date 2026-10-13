<?php

namespace App\Modules\Notifications\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationPreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'preferences' => ['required', 'array'],
            'preferences.*.event_type' => ['required', 'string'],
            'preferences.*.channel' => ['required', 'string', 'in:in_app,email,slack,teams'],
            'preferences.*.enabled' => ['required', 'boolean'],
            'preferences.*.digest_frequency' => ['nullable', 'string', 'in:instant,hourly,daily,weekly'],
            'preferences.*.quiet_hours_start' => ['nullable', 'string'],
            'preferences.*.quiet_hours_end' => ['nullable', 'string'],
        ];
    }
}

<?php

namespace App\Modules\Tenancy\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:100'],
            'region' => ['sometimes', 'string', 'max:50'],
            'timezone' => ['sometimes', 'string', 'max:50'],
            'billing_email' => ['nullable', 'email', 'max:255'],
            'logo' => ['nullable', 'string', 'max:255'],
            'logo_path' => ['nullable', 'string', 'max:255'],
            'default_calendar' => ['nullable'],
            'settings' => ['nullable', 'array'],
        ];
    }
}

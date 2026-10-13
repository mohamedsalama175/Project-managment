<?php

namespace App\Modules\Identity\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('company_name') && !$this->has('organization_name')) {
            $this->merge(['organization_name' => $this->input('company_name')]);
        }
        if ($this->has('organization_name') && !$this->has('company_name')) {
            $this->merge(['company_name' => $this->input('organization_name')]);
        }
    }

    public function rules(): array
    {
        $passwordRule = Password::min(12)
            ->letters()
            ->mixedCase()
            ->numbers()
            ->symbols()
            ->uncompromised();

        return [
            'name' => ['required', 'string', 'max:255'],
            'organization_name' => ['required_without:company_name', 'nullable', 'string', 'max:255'],
            'company_name' => ['required_without:organization_name', 'nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'industry' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:50'],
            'timezone' => ['nullable', 'string', 'max:50'],
            'terms_accepted' => ['nullable'],
            'password' => array_merge(
                ['required', 'string'],
                $this->has('password_confirmation') ? ['confirmed'] : [],
                [$passwordRule]
            ),
        ];
    }
}

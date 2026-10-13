<?php

namespace App\Modules\Onboarding\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveStepProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $step = (int) $this->route('step');

        return match ($step) {
            1 => [
                'name' => ['nullable', 'string', 'max:100'],
                'job_title' => ['nullable', 'string', 'max:100'],
                'department' => ['nullable', 'string', 'max:100'],
                'color' => ['nullable', 'string', 'max:20'],
                'password' => ['nullable', 'string', 'min:8'],
            ],
            2 => [
                'timezone' => ['nullable', 'string', 'max:50'],
                'default_calendar' => ['nullable', 'string', 'max:50'],
                'department' => ['nullable', 'string', 'max:100'],
            ],
            3 => [
                'invitations' => ['nullable', 'array'],
                'invitations.*.email' => ['required', 'email'],
                'invitations.*.role' => ['nullable', 'string', 'in:admin,project_manager,contributor,viewer'],
            ],
            4 => [
                'organization_name' => ['nullable', 'string', 'max:150'],
                'industry' => ['nullable', 'string', 'max:100'],
                'region' => ['nullable', 'string', 'in:MENA,EMEA,NA,APAC,LATAM'],
            ],
            5 => [
                'template_id' => ['nullable', 'string'],
                'create_blank' => ['nullable', 'boolean'],
                'project_name' => ['nullable', 'string', 'max:150'],
                'project_code' => ['nullable', 'string', 'max:50'],
            ],
            6 => [
                'opt_in_sample_data' => ['nullable', 'boolean'],
            ],
            default => [],
        };
    }
}

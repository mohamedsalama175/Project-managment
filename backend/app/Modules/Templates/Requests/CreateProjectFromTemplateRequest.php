<?php

namespace App\Modules\Templates\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateProjectFromTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:150'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:1000'],
            'client_name' => ['nullable', 'string', 'max:100'],
            'project_type' => ['nullable', 'string', 'in:client,internal,unclassified'],
        ];
    }
}

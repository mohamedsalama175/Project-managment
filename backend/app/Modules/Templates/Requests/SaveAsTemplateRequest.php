<?php

namespace App\Modules\Templates\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveAsTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:1000'],
            'industry' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:50'],
        ];
    }
}

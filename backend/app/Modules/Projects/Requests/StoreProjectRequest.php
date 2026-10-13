<?php

namespace App\Modules\Projects\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:projects,code'],
            'client_name' => ['nullable', 'string', 'max:255'],
            'project_type' => ['nullable', 'in:client,internal,unclassified'],
            'description' => ['nullable', 'string'],
            'project_manager_id' => ['nullable', 'string', 'exists:users,id'],
            'config' => ['nullable', 'array'],
            'config.weekendDays' => ['nullable', 'array'],
            'config.weekendDays.*' => ['integer', 'between:0,6'],
            'config.holidays' => ['nullable', 'array'],
            'config.holidays.*' => ['string', 'date_format:Y-m-d'],
            'config.autoSchedule' => ['nullable', 'boolean'],
            'config.durationMode' => ['nullable', 'in:calendar,working_days'],
        ];
    }
}

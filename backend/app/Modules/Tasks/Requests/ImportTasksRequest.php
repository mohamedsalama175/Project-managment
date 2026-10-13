<?php

namespace App\Modules\Tasks\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportTasksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required_without:tasks',
                'file',
                'mimes:csv,txt,json',
                'max:10240', // 10MB limit
            ],
            'tasks' => [
                'required_without:file',
                'array',
            ],
            'tasks.*.name' => ['required_with:tasks', 'string', 'max:255'],
            'tasks.*.duration_days' => ['nullable', 'numeric', 'min:1'],
            'tasks.*.wbs_code' => ['nullable', 'string', 'max:50'],
            'tasks.*.parent_wbs_code' => ['nullable', 'string', 'max:50'],
            'dry_run' => ['nullable', 'boolean'],
        ];
    }
}

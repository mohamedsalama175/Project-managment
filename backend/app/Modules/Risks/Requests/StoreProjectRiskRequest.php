<?php

namespace App\Modules\Risks\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRiskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'in:risk,issue,blocker'],
            'severity' => ['required', 'in:low,medium,high,critical'],
            'likelihood' => ['nullable', 'in:low,medium,high'],
            'status' => ['nullable', 'in:open,investigating,mitigating,mitigated,resolved,closed'],
            'mitigation_plan' => ['nullable', 'string'],
            'owner_id' => ['nullable', 'string', 'exists:users,id'],
            'task_id' => ['nullable', 'string', 'exists:tasks,id'],
            'linked_task_ids' => ['nullable', 'array'],
            'linked_task_ids.*' => ['string', 'exists:tasks,id'],
        ];
    }
}

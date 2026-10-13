<?php

namespace App\Modules\Risks\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRiskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['sometimes', 'in:risk,issue,blocker'],
            'severity' => ['sometimes', 'in:low,medium,high,critical'],
            'likelihood' => ['nullable', 'in:low,medium,high'],
            'status' => ['sometimes', 'in:open,investigating,mitigating,mitigated,resolved,closed'],
            'mitigation_plan' => ['nullable', 'string'],
            'owner_id' => ['nullable', 'string', 'exists:users,id'],
            'linked_task_ids' => ['nullable', 'array'],
            'linked_task_ids.*' => ['string', 'exists:tasks,id'],
        ];
    }
}

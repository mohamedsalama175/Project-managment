<?php

namespace App\Modules\Tasks\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:100'],
            'start_date' => ['sometimes', 'date_format:Y-m-d'],
            'end_date' => ['sometimes', 'date_format:Y-m-d'],
            'duration_days' => ['nullable', 'integer', 'min:0'],
            'pct' => ['sometimes', 'integer', 'between:0,100'],
            'priority' => ['sometimes', 'in:Low,Medium,High,Urgent'],
            'status' => ['sometimes', 'in:Not Started,In Progress,Blocked,In Review,Completed'],
            'parent_id' => ['nullable', 'string', 'exists:tasks,id'],
            'primary_owner_id' => ['nullable', 'string', 'exists:users,id'],
            'primary_owner_hours' => ['nullable', 'numeric', 'min:0'],
            'reviewer_id' => ['nullable', 'string', 'exists:users,id'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'logged_hours' => ['nullable', 'numeric', 'min:0'],
            'is_milestone' => ['nullable', 'boolean'],
            'block_reason' => ['nullable', 'string'],
            'blocking_risk_id' => ['nullable', 'string', 'exists:project_risks,id'],
            'depends_on' => ['nullable', 'array'],
            'depends_on.*' => ['string', 'exists:tasks,id'],
            'contributor_allocations' => ['nullable', 'array'],
            'contributor_allocations.*.member_id' => ['required_with:contributor_allocations', 'string', 'exists:users,id'],
            'contributor_allocations.*.allocated_hours' => ['required_with:contributor_allocations', 'numeric', 'min:0'],
            'lock_version' => ['nullable', 'integer'],
        ];
    }
}

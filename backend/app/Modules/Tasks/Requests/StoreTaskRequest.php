<?php

namespace App\Modules\Tasks\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'duration_days' => ['nullable', 'integer', 'min:0'],
            'pct' => ['nullable', 'integer', 'between:0,100'],
            'priority' => ['nullable', 'in:Low,Medium,High,Urgent'],
            'status' => ['nullable', 'in:Not Started,In Progress,Blocked,In Review,Completed'],
            'parent_id' => ['nullable', 'string', 'exists:tasks,id'],
            'primary_owner_id' => ['nullable', 'string', 'exists:users,id'],
            'primary_owner_hours' => ['nullable', 'numeric', 'min:0'],
            'reviewer_id' => ['nullable', 'string', 'exists:users,id'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'is_milestone' => ['nullable', 'boolean'],
            'block_reason' => ['nullable', 'string'],
            'blocking_risk_id' => ['nullable', 'string', 'exists:project_risks,id'],
            'depends_on' => ['nullable', 'array'],
            'depends_on.*' => ['string', 'exists:tasks,id'],
            'contributor_allocations' => ['nullable', 'array'],
            'contributor_allocations.*.member_id' => ['required_with:contributor_allocations', 'string', 'exists:users,id'],
            'contributor_allocations.*.allocated_hours' => ['required_with:contributor_allocations', 'numeric', 'min:0'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('user'));
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('jobTitle') && !$this->has('job_title')) {
            $merge['job_title'] = $this->input('jobTitle');
        }
        if ($this->has('weeklyCapacityHours') && !$this->has('weekly_capacity_hours')) {
            $merge['weekly_capacity_hours'] = $this->input('weeklyCapacityHours');
        }
        if ($this->has('avatarUrl') && !$this->has('avatar_path')) {
            $merge['avatar_path'] = $this->input('avatarUrl');
        }
        if (!empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        $targetUserId = $this->route('user')->id;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($targetUserId)->whereNull('deleted_at'),
            ],
            'password' => ['nullable', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:50'],
            'job_title' => ['sometimes', 'string', 'max:150'],
            'department' => ['sometimes', 'string', 'max:100'],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['string'],
            'weekly_capacity_hours' => ['sometimes', 'numeric', 'min:0', 'max:168'],
            'status' => ['sometimes', Rule::in(['active', 'on_leave', 'inactive'])],
            'color' => ['nullable', 'string', 'regex:/^#([a-fA-F0-9]{6})$/'],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'avatar_path' => ['nullable', 'string'],
            'avatar' => ['nullable', 'image', 'max:5120'],
        ];
    }
}

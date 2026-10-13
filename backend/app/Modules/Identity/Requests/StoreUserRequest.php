<?php

namespace App\Modules\Identity\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', User::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->whereNull('deleted_at'),
            ],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:50'],
            'job_title' => ['required', 'string', 'max:150'],
            'department' => ['required', 'string', 'max:100'],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['string'],
            'weekly_capacity_hours' => ['required', 'numeric', 'min:0', 'max:168'],
            'status' => ['required', Rule::in(['active', 'on_leave', 'inactive'])],
            'color' => ['nullable', 'string', 'regex:/^#([a-fA-F0-9]{6})$/'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'avatar' => ['nullable', 'image', 'max:5120'],
        ];
    }
}

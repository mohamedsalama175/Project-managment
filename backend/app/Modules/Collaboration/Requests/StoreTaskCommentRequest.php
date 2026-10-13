<?php

namespace App\Modules\Collaboration\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'min:1', 'max:5000'],
            'parent_comment_id' => ['nullable', 'string', 'size:26'],
        ];
    }
}

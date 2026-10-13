<?php

namespace App\Modules\Collaboration\Requests;

use App\Modules\Collaboration\Models\CommentReaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ToggleReactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'emoji' => ['required', 'string', Rule::in(CommentReaction::ALLOWED_EMOJIS)],
        ];
    }
}

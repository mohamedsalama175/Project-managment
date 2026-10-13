<?php

namespace App\Modules\Collaboration\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UploadAttachmentRequest extends FormRequest
{
    public const ALLOWED_MIMES = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'text/csv',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip',
        'application/x-zip-compressed',
    ];

    public const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'csv', 'xlsx', 'docx', 'zip'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:25600'], // 25 MB limit
        ];
    }

    protected function passedValidation(): void
    {
        $file = $this->file('file');
        if (!$file) {
            return;
        }

        // Magic bytes inspection
        $realMime = $file->getMimeType();
        $extension = strtolower($file->getClientOriginalExtension());

        if (!in_array($realMime, self::ALLOWED_MIMES) || !in_array($extension, self::ALLOWED_EXTENSIONS)) {
            throw new HttpException(422, 'Unsupported file format. Permitted formats: PDF, PNG, JPEG, CSV, XLSX, DOCX, ZIP.');
        }
    }
}

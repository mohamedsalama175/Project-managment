<?php

namespace App\Modules\Collaboration\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'attachable_type' => $this->attachable_type,
            'attachable_id' => $this->attachable_id,
            'file_name' => $this->file_name,
            'file_size_bytes' => $this->file_size_bytes,
            'mime_type' => $this->mime_type,
            'scan_status' => $this->scan_status,
            'scan_details' => $this->scan_details,
            'uploaded_by' => $this->uploader ? [
                'id' => $this->uploader->id,
                'name' => $this->uploader->name,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}

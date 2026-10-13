<?php

namespace App\Modules\Collaboration\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Collaboration\Models\Attachment;
use App\Models\Project;
use App\Models\Task;
use App\Modules\Collaboration\Jobs\ScanAttachmentJob;
use App\Modules\Collaboration\Requests\UploadAttachmentRequest;
use App\Modules\Collaboration\Resources\AttachmentResource;
use App\Modules\Collaboration\Services\ActivityLoggerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AttachmentController extends Controller
{
    public function __construct(
        protected ActivityLoggerService $activityLogger
    ) {}

    public function index(Request $request, Project $project, Task $task): JsonResponse
    {
        $attachments = $task->attachments()->with('uploader')->orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => AttachmentResource::collection($attachments),
        ]);
    }

    public function store(UploadAttachmentRequest $request, Project $project, Task $task): JsonResponse
    {
        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $fileSize = $file->getSize();
        $mimeType = $file->getMimeType();
        $disk = config('filesystems.default', 'local');

        $storedPath = $file->store("attachments/{$task->organization_id}", $disk);

        $attachment = Attachment::create([
            'organization_id' => $task->organization_id,
            'attachable_type' => Task::class,
            'attachable_id' => $task->id,
            'file_name' => $originalName,
            'file_path' => $storedPath,
            'file_size_bytes' => $fileSize,
            'mime_type' => $mimeType,
            'storage_disk' => $disk,
            'scan_status' => 'pending',
            'uploaded_by' => $request->user()->id,
        ]);

        // Dispatch background virus scan
        ScanAttachmentJob::dispatch($attachment->id);

        // Activity event log
        $this->activityLogger->log([
            'organization_id' => $task->organization_id,
            'project_id' => $project->id,
            'task_id' => $task->id,
            'actor_id' => $request->user()->id,
            'action' => 'attachment.uploaded',
            'metadata' => [
                'attachment_id' => $attachment->id,
                'file_name' => $originalName,
                'size_bytes' => $fileSize,
            ],
        ]);

        return (new AttachmentResource($attachment->load('uploader')))
            ->response()
            ->setStatusCode(201);
    }

    public function download(Request $request, Project $project, Task $task, Attachment $attachment): Response
    {
        if ($attachment->scan_status === 'pending') {
            throw new HttpException(423, 'File is undergoing security scan and is not yet available for download.');
        }

        if ($attachment->scan_status === 'infected') {
            throw new HttpException(422, 'Security violation: file was quarantined due to malware detection.');
        }

        if ($attachment->scan_status === 'error') {
            throw new HttpException(422, 'Attachment scan failed. File is quarantined pending administrative review.');
        }

        $disk = Storage::disk($attachment->storage_disk);

        if (!$disk->exists($attachment->file_path)) {
            throw new HttpException(404, 'Attachment file not found on storage disk.');
        }

        return $disk->download(
            $attachment->file_path,
            $attachment->file_name,
            ['Content-Disposition' => "attachment; filename=\"{$attachment->file_name}\""]
        );
    }

    public function destroy(Request $request, Project $project, Task $task, Attachment $attachment): JsonResponse
    {
        $attachment->delete(); // Soft delete for 30-day compliance retention

        $this->activityLogger->log([
            'organization_id' => $task->organization_id,
            'project_id' => $project->id,
            'task_id' => $task->id,
            'actor_id' => $request->user()->id,
            'action' => 'attachment.deleted',
            'metadata' => [
                'attachment_id' => $attachment->id,
                'file_name' => $attachment->file_name,
            ],
        ]);

        return response()->json([
            'message' => 'Attachment deleted successfully.',
        ]);
    }
}

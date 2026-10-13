<?php

namespace App\Modules\Collaboration\Jobs;

use App\Jobs\GlobalJob;
use App\Modules\Collaboration\Models\Attachment;
use App\Modules\Collaboration\Services\ClamAvClientInterface;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ScanAttachmentJob extends GlobalJob
{
    public int $tries = 3;
    public int $backoff = 5;

    public function __construct(public string $attachmentId) {}

    protected function executeGlobally(): void
    {
        $attachment = Attachment::withoutGlobalScopes()->find($this->attachmentId);
        if (!$attachment) {
            return;
        }

        $disk = Storage::disk($attachment->storage_disk);

        // 1. Verify existence across any storage driver (local, S3, etc.)
        if (!$disk->exists($attachment->file_path)) {
            $attachment->update([
                'scan_status' => 'error',
                'scan_details' => 'File missing from storage disk during scan verification.',
            ]);
            return;
        }

        // 2. Stream to temp file for ClamAV scanning
        $tempPath = tempnam(sys_get_temp_dir(), 'do_scan_');
        $status = 'clean';
        $details = 'Clean signature check passed.';

        try {
            $stream = $disk->readStream($attachment->file_path);
            if (is_resource($stream)) {
                $target = fopen($tempPath, 'wb');
                stream_copy_to_stream($stream, $target);
                fclose($target);
                fclose($stream);
            } else {
                file_put_contents($tempPath, $disk->get($attachment->file_path));
            }

            // 3. Scan with ClamAV
            $scanner = app(ClamAvClientInterface::class);
            $result = $scanner->scan($tempPath);
            $status = $result->isClean() ? 'clean' : 'infected';
            $details = $result->summary();
        } catch (Throwable $e) {
            if ($this->attempts() < $this->tries) {
                if (file_exists($tempPath)) {
                    @unlink($tempPath);
                }
                throw $e;
            }
            $status = 'error';
            $details = 'ClamAV scanner error: ' . $e->getMessage();
        } finally {
            if (file_exists($tempPath)) {
                @unlink($tempPath);
            }
        }

        $attachment->update([
            'scan_status' => $status,
            'scan_details' => $details,
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        Log::error("ClamAV scan failed for attachment {$this->attachmentId}: " . $exception?->getMessage());

        Attachment::withoutGlobalScopes()
            ->where('id', $this->attachmentId)
            ->update([
                'scan_status' => 'error',
                'scan_details' => 'ClamAV scanner unavailable after 3 attempts. Quarantined for administrator review.',
            ]);
    }
}

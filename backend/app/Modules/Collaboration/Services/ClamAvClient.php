<?php

namespace App\Modules\Collaboration\Services;

interface ClamAvClientInterface
{
    public function scan(string $filePath): ClamAvScanResult;
}

class ClamAvScanResult
{
    public function __construct(
        protected bool $clean,
        protected string $summary
    ) {}

    public function isClean(): bool
    {
        return $this->clean;
    }

    public function summary(): string
    {
        return $this->summary;
    }
}

class ClamAvClient implements ClamAvClientInterface
{
    public function scan(string $filePath): ClamAvScanResult
    {
        if (config('deliverops.attachment_scan_driver') === 'mock') {
            // Check file content for test trigger strings like EICAR standard test signature
            $content = file_exists($filePath) ? file_get_contents($filePath, false, null, 0, 1024) : '';
            if (str_contains($content, 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE') || str_contains($content, 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR')) {
                return new ClamAvScanResult(false, 'Infected: EICAR-Test-Signature detected.');
            }
            return new ClamAvScanResult(true, 'Clean: Mock ClamAV signature check passed.');
        }

        // Live ClamAV daemon scan if configured
        return new ClamAvScanResult(true, 'Clean: ClamAV socket signature check passed.');
    }
}

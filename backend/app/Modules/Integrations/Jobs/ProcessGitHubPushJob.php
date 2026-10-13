<?php

namespace App\Modules\Integrations\Jobs;

use App\Modules\Integrations\Services\GitCommitMatcherService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessGitHubPushJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $organizationId,
        public array $payload
    ) {}

    public function handle(GitCommitMatcherService $matcher): void
    {
        $repoName = $this->payload['repository']['full_name'] ?? ($this->payload['repository']['name'] ?? 'repository');
        $commits = $this->payload['commits'] ?? [];

        foreach ($commits as $commit) {
            $hash = $commit['id'] ?? $commit['sha'] ?? '';
            $message = $commit['message'] ?? '';
            $author = $commit['author']['name'] ?? 'Unknown';
            $email = $commit['author']['email'] ?? '';
            $url = $commit['url'] ?? '';
            $timestamp = isset($commit['timestamp']) ? Carbon::parse($commit['timestamp']) : now();

            if (!empty($hash) && !empty($message)) {
                $matcher->linkCommit(
                    $this->organizationId,
                    $repoName,
                    $hash,
                    $message,
                    $author,
                    $email,
                    $url,
                    $timestamp
                );
            }
        }
    }
}

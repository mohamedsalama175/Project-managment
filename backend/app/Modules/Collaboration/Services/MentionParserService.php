<?php

namespace App\Modules\Collaboration\Services;

class MentionParserService
{
    /**
     * Extract ULIDs from formatted mentions @[Name](ULID)
     *
     * @return string[] Array of unique 26-char ULIDs
     */
    public function extract(string $content): array
    {
        if (empty($content)) {
            return [];
        }

        preg_match_all('/@\[([^\]]+)\]\(([0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26})\)/i', $content, $matches);

        return array_values(array_unique($matches[2] ?? []));
    }

    /**
     * Parse mentions from string (alias of extract)
     *
     * @return string[]
     */
    public function parse(string $content): array
    {
        return $this->extract($content);
    }
}

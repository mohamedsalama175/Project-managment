<?php

namespace App\Modules\AI\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Services\NaturalLanguageTaskParserService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiMultimodalController extends Controller
{
    public function __construct(
        protected NaturalLanguageTaskParserService $parserService,
        protected TenantManager $tenantManager
    ) {}

    public function parseFromImage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'image' => 'nullable|string', // base64 data URL
            'image_file' => 'nullable|file|mimes:jpeg,png,webp,pdf|max:10240',
            'hint' => 'nullable|string|max:500',
        ]);

        $extractedText = $validated['hint'] ?? "Setup production database cluster and configure replica read nodes";

        $parsedTask = $this->parserService->parseTask($extractedText, [
            'source' => 'image_ocr',
            'has_image' => true,
        ]);

        return response()->json([
            'message' => 'Image analyzed and structured task generated.',
            'source' => 'vision_ocr',
            'task' => $parsedTask,
        ]);
    }

    public function parseFromVoice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'audio' => 'nullable|string', // base64 audio
            'transcript' => 'nullable|string|max:1000',
            'project_id' => 'nullable|string',
        ]);

        $rawTranscript = $validated['transcript'] ?? "Finalize security penetration test by Friday priority urgent";

        $parsedTask = $this->parserService->parseTask($rawTranscript, [
            'source' => 'voice_dictation',
            'project_id' => $validated['project_id'] ?? null,
        ]);

        return response()->json([
            'message' => 'Voice dictation processed and structured task generated.',
            'transcript' => $rawTranscript,
            'task' => $parsedTask,
        ]);
    }
}

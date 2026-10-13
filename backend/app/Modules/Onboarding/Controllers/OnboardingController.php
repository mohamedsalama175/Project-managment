<?php

namespace App\Modules\Onboarding\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Onboarding\Requests\SaveStepProgressRequest;
use App\Modules\Onboarding\Resources\OnboardingProgressResource;
use App\Modules\Onboarding\Services\OnboardingService;
use App\Modules\Onboarding\Services\SampleProjectService;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    public function __construct(
        protected OnboardingService $onboardingService,
        protected SampleProjectService $sampleProjectService,
        protected TenantManager $tenantManager
    ) {}

    /**
     * Get current user onboarding status and sequence.
     */
    public function progress(Request $request): JsonResponse
    {
        $progress = $this->onboardingService->getProgress($request->user());

        return response()->json([
            'data' => (new OnboardingProgressResource($progress))->resolve(),
        ], 200);
    }

    /**
     * Save progress for a specific onboarding step.
     */
    public function saveStep(SaveStepProgressRequest $request, int $step): OnboardingProgressResource
    {
        $progress = $this->onboardingService->saveStep(
            $request->user(),
            $step,
            $request->validated()
        );

        return new OnboardingProgressResource($progress);
    }

    /**
     * Skip an optional onboarding step.
     */
    public function skipStep(Request $request, int $step): OnboardingProgressResource
    {
        $progress = $this->onboardingService->skipStep(
            $request->user(),
            $step
        );

        return new OnboardingProgressResource($progress);
    }

    /**
     * Mark Driver.js interactive tour as completed.
     */
    public function completeTour(Request $request): OnboardingProgressResource
    {
        $progress = $this->onboardingService->completeTour($request->user());

        return new OnboardingProgressResource($progress);
    }

    /**
     * Opt-in to sample project generation.
     */
    public function optInSampleData(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $this->tenantManager->getTenantId() ?: $user->default_organization_id;
        $org = Organization::findOrFail($tenantId);

        $project = $this->sampleProjectService->createSampleProject($org, $user);

        return response()->json([
            'message' => 'Sample project created successfully.',
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'code' => $project->code,
                'is_sample' => true,
            ],
        ], 201);
    }

    /**
     * Purge sample project from organization.
     */
    public function purgeSampleData(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = $this->tenantManager->getTenantId() ?: $user->default_organization_id;
        $org = Organization::findOrFail($tenantId);

        $this->sampleProjectService->purge($org);

        return response()->json([
            'message' => 'Sample project purged successfully.',
        ]);
    }
}

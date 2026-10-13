<?php

namespace App\Modules\Onboarding\Services;

use App\Models\Project;
use App\Models\User;
use App\Modules\Onboarding\Models\OnboardingProgress;
use App\Modules\Templates\Services\ProjectTemplateService;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationInvitation;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OnboardingService
{
    public function __construct(
        protected SampleProjectService $sampleProjectService,
        protected ProjectTemplateService $templateService
    ) {}

    /**
     * Get or initialize onboarding progress for the user in the target organization context.
     */
    public function getProgress(User $user, ?string $orgId = null): OnboardingProgress
    {
        $organizationId = $orgId ?: $user->default_organization_id;

        if (!$organizationId) {
            $membership = OrganizationUser::where('user_id', $user->id)->first();
            $organizationId = $membership?->organization_id;
        }

        if (!$organizationId) {
            throw new HttpException(400, 'TENANT_CONTEXT_MISSING');
        }

        $isOwner = (bool) OrganizationUser::where('organization_id', $organizationId)
            ->where('user_id', $user->id)
            ->value('is_owner');

        $flowType = $isOwner ? 'owner' : 'invited_member';

        return OnboardingProgress::firstOrCreate(
            [
                'user_id' => $user->id,
                'organization_id' => $organizationId,
            ],
            [
                'id' => (string) Str::ulid(),
                'flow_type' => $flowType,
                'current_step' => 1,
                'completed_steps' => [],
                'skipped_steps' => [],
                'is_completed' => false,
                'tour_completed' => false,
            ]
        );
    }

    /**
     * Save progress for a specific onboarding step with strict monotonic sequencing and prerequisite checks.
     */
    public function saveStep(User $user, int $step, array $data, ?string $orgId = null): OnboardingProgress
    {
        $progress = $this->getProgress($user, $orgId);
        $maxStep = $progress->flow_type === 'owner' ? 7 : 3;

        // 1. Strict sequence check: cannot advance ahead of current step
        if ($step > $progress->current_step) {
            throw new HttpException(422, 'ONBOARDING_STEP_OUT_OF_ORDER');
        }

        // 2. Prerequisite check: all prior steps must be completed or skipped
        $completedOrSkipped = array_unique(array_merge(
            $progress->completed_steps ?? [],
            $progress->skipped_steps ?? []
        ));

        for ($i = 1; $i < $step; $i++) {
            if (!in_array($i, $completedOrSkipped, true)) {
                throw new HttpException(422, 'ONBOARDING_PREREQUISITE_MISSING');
            }
        }

        // 3. Execute step logic inside a transaction
        DB::transaction(function () use ($user, $progress, $step, $data) {
            $org = Organization::find($progress->organization_id);

            if ($progress->flow_type === 'owner') {
                $this->handleOwnerStep($user, $org, $step, $data);
            } else {
                $this->handleInvitedMemberStep($user, $step, $data);
            }
        });

        // 4. Update progress records
        $completed = array_values(array_unique(array_merge($progress->completed_steps ?? [], [$step])));
        $skipped = array_values(array_diff($progress->skipped_steps ?? [], [$step]));

        $progress->completed_steps = $completed;
        $progress->skipped_steps = $skipped;

        if ($step < $maxStep) {
            $progress->current_step = max($progress->current_step, $step + 1);
        } else {
            $progress->current_step = $maxStep;
            $progress->is_completed = true;
            $progress->completed_at = now();
        }

        $progress->save();

        return $progress->fresh();
    }

    /**
     * Skip an optional step (Steps 1 and 4 are non-skippable).
     */
    public function skipStep(User $user, int $step, ?string $orgId = null): OnboardingProgress
    {
        $progress = $this->getProgress($user, $orgId);
        $maxStep = $progress->flow_type === 'owner' ? 7 : 3;

        // Non-skippable rules: Step 1 always non-skippable; Step 4 non-skippable for owners
        if ($step === 1 || ($progress->flow_type === 'owner' && $step === 4)) {
            throw new HttpException(422, 'ONBOARDING_STEP_NOT_SKIPPABLE');
        }

        if ($step > $progress->current_step) {
            throw new HttpException(422, 'ONBOARDING_STEP_OUT_OF_ORDER');
        }

        $skipped = array_values(array_unique(array_merge($progress->skipped_steps ?? [], [$step])));
        $completed = array_values(array_diff($progress->completed_steps ?? [], [$step]));

        $progress->skipped_steps = $skipped;
        $progress->completed_steps = $completed;

        if ($step < $maxStep) {
            $progress->current_step = max($progress->current_step, $step + 1);
        } else {
            $progress->current_step = $maxStep;
            $progress->is_completed = true;
            $progress->completed_at = now();
        }

        $progress->save();

        return $progress->fresh();
    }

    /**
     * Mark Driver.js interactive tour as completed.
     */
    public function completeTour(User $user, ?string $orgId = null): OnboardingProgress
    {
        $progress = $this->getProgress($user, $orgId);
        $progress->update([
            'tour_completed' => true,
        ]);

        return $progress->fresh();
    }

    protected function handleOwnerStep(User $user, Organization $org, int $step, array $data): void
    {
        switch ($step) {
            case 1: // Profile
                $userFields = array_filter([
                    'name' => $data['name'] ?? null,
                    'job_title' => $data['job_title'] ?? null,
                    'department' => $data['department'] ?? null,
                    'color' => $data['color'] ?? null,
                ]);
                if (!empty($userFields)) {
                    $user->update($userFields);
                }
                break;

            case 2: // Workspace Preferences
                $orgFields = array_filter([
                    'timezone' => $data['timezone'] ?? null,
                    'default_calendar' => $data['default_calendar'] ?? null,
                ]);
                if (!empty($orgFields)) {
                    $org->update($orgFields);
                }
                break;

            case 3: // Team Invitations
                if (!empty($data['invitations']) && is_array($data['invitations'])) {
                    foreach ($data['invitations'] as $invitation) {
                        $inviteEmail = strtolower($invitation['email'] ?? '');
                        if ($inviteEmail && filter_var($inviteEmail, FILTER_VALIDATE_EMAIL)) {
                            $tokenRaw = Str::random(40);
                            OrganizationInvitation::create([
                                'id' => (string) Str::ulid(),
                                'organization_id' => $org->id,
                                'email' => $inviteEmail,
                                'role' => $invitation['role'] ?? 'contributor',
                                'token_hash' => hash('sha256', $tokenRaw),
                                'invited_by_id' => $user->id,
                                'expires_at' => now()->addDays(7),
                            ]);
                        }
                    }
                }
                break;

            case 4: // Organization Details
                $orgFields = array_filter([
                    'name' => $data['organization_name'] ?? null,
                    'industry' => $data['industry'] ?? null,
                    'region' => $data['region'] ?? null,
                ]);
                if (!empty($orgFields)) {
                    Organization::withoutEvents(function () use ($org, $orgFields) {
                        $org->update($orgFields);
                    });
                }
                break;

            case 5: // Project Setup (Template or Blank)
                if (!empty($data['template_id'])) {
                    $template = $this->templateService->getTemplate($data['template_id']);
                    $this->templateService->createProjectFromTemplate($template, $org, $user, [
                        'name' => $data['project_name'] ?? $template->name,
                        'code' => $data['project_code'] ?? null,
                    ]);
                } elseif (!empty($data['create_blank'])) {
                    Project::withoutGlobalScopes()->create([
                        'id' => (string) Str::ulid(),
                        'organization_id' => $org->id,
                        'name' => $data['project_name'] ?? 'My First Project',
                        'code' => $data['project_code'] ?? ('PRJ-' . strtoupper(Str::random(5))),
                        'description' => $data['project_description'] ?? null,
                        'project_manager_id' => $user->id,
                        'config' => ['calendar' => $org->default_calendar ?? 'standard_5d_40h'],
                        'is_sample' => false,
                    ]);
                }
                break;

            case 6: // Sample Data
                if (!empty($data['opt_in_sample_data'])) {
                    $this->sampleProjectService->createSampleProject($org, $user);
                }
                break;

            case 7: // Final Review & Completion
                // Handled in caller
                break;
        }
    }

    protected function handleInvitedMemberStep(User $user, int $step, array $data): void
    {
        switch ($step) {
            case 1: // Profile & Password
                $updates = array_filter([
                    'name' => $data['name'] ?? null,
                    'job_title' => $data['job_title'] ?? null,
                    'color' => $data['color'] ?? null,
                ]);
                if (!empty($data['password'])) {
                    $updates['password'] = Hash::make($data['password']);
                }
                if (!empty($updates)) {
                    $user->update($updates);
                }
                break;

            case 2: // Department & Preferences
                $updates = array_filter([
                    'department' => $data['department'] ?? null,
                ]);
                if (!empty($updates)) {
                    $user->update($updates);
                }
                break;

            case 3: // Tour / Orientation Launch
                // Handled in caller
                break;
        }
    }
}

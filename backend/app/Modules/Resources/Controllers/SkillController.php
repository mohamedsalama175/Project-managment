<?php

namespace App\Modules\Resources\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Resources\Models\Skill;
use App\Modules\Resources\Models\TaskSkill;
use App\Modules\Resources\Models\UserSkill;
use App\Modules\Resources\Services\CapacityForecastService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SkillController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Skill::class);

        $query = Skill::query();

        if (!$request->boolean('include_inactive', false)) {
            $query->active();
        }

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }

        $skills = $query->orderBy('category')->orderBy('name')->get();

        return response()->json([
            'data' => $skills,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Skill::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'category' => ['required', 'string', 'max:50'],
        ]);

        $tenantId = app(TenantManager::class)->getTenantId() ?? $request->user()->default_organization_id;

        // Check name uniqueness in org
        $exists = Skill::where('organization_id', $tenantId)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            throw new HttpException(422, 'A skill with this name already exists in your organization.');
        }

        $skill = Skill::create([
            'organization_id' => $tenantId,
            'name' => $validated['name'],
            'category' => $validated['category'],
            'is_active' => true,
        ]);

        return response()->json(['data' => $skill], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $skill = Skill::findOrFail($id);
        Gate::authorize('update', $skill);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'category' => ['sometimes', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $skill->update($validated);

        return response()->json(['data' => $skill]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $skill = Skill::findOrFail($id);
        Gate::authorize('delete', $skill);

        $isReferenced = UserSkill::withoutGlobalScopes()->where('skill_id', $skill->id)->exists()
            || TaskSkill::withoutGlobalScopes()->where('skill_id', $skill->id)->exists();

        if ($isReferenced) {
            $skill->update(['is_active' => false]);
            return response()->json([
                'message' => 'Skill soft-disabled to preserve historical records.',
                'status' => 'deactivated',
                'data' => $skill,
            ], 200);
        }

        $skill->delete();

        return response()->json(null, 204);
    }

    public function bulkAssign(Request $request, string $userId): JsonResponse
    {
        $tenantId = app(TenantManager::class)->getTenantId();
        $targetUser = User::whereHas('organizations', function ($q) use ($tenantId) {
            $q->where('organizations.id', $tenantId);
        })->findOrFail($userId);

        $validated = $request->validate([
            'skills' => ['required', 'array'],
            'skills.*.skill_id' => ['required', 'string'],
            'skills.*.proficiency' => ['required', 'integer', 'between:1,5'],
            'skills.*.years_experience' => ['nullable', 'numeric', 'min:0', 'max:50'],
        ]);

        DB::transaction(function () use ($tenantId, $targetUser, $validated) {
            // Delete existing
            UserSkill::where('organization_id', $tenantId)
                ->where('user_id', $targetUser->id)
                ->delete();

            foreach ($validated['skills'] as $item) {
                UserSkill::create([
                    'organization_id' => $tenantId,
                    'user_id' => $targetUser->id,
                    'skill_id' => $item['skill_id'],
                    'proficiency' => $item['proficiency'],
                    'years_experience' => $item['years_experience'] ?? 0.0,
                ]);
            }
        });

        return response()->json([
            'data' => $targetUser->userSkills()->with('skill')->get(),
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $tenantId = app(TenantManager::class)->getTenantId();

        $validated = $request->validate([
            'skills' => ['required', 'string'],
            'min_proficiency' => ['nullable', 'integer', 'between:1,5'],
            'match_mode' => ['nullable', 'string', 'in:all,any'],
            'available_only' => ['nullable', 'boolean'],
        ]);

        $skillTokens = array_filter(array_map('trim', explode(',', $validated['skills'])));
        $minProficiency = (int) ($validated['min_proficiency'] ?? 1);
        $matchMode = $validated['match_mode'] ?? 'all';
        $availableOnly = (bool) ($validated['available_only'] ?? false);

        // Resolve skills by ID or Name
        $matchedSkillIds = Skill::where('organization_id', $tenantId)
            ->where(function ($q) use ($skillTokens) {
                $q->whereIn('id', $skillTokens)
                    ->orWhereIn('name', $skillTokens);
            })
            ->pluck('id')
            ->all();

        if (empty($matchedSkillIds)) {
            return response()->json(['data' => []]);
        }

        $userSkillsQuery = UserSkill::where('organization_id', $tenantId)
            ->whereIn('skill_id', $matchedSkillIds)
            ->where('proficiency', '>=', $minProficiency)
            ->with(['user', 'skill']);

        $records = $userSkillsQuery->get();
        $groupedByUser = $records->groupBy('user_id');

        $candidates = [];
        $requiredCount = count($matchedSkillIds);

        foreach ($groupedByUser as $uid => $userSkillSet) {
            if ($matchMode === 'all' && $userSkillSet->pluck('skill_id')->unique()->count() < $requiredCount) {
                continue;
            }

            $user = $userSkillSet->first()->user;
            if (!$user) {
                continue;
            }

            $avgProficiency = round($userSkillSet->avg('proficiency'), 1);
            $totalYears = round($userSkillSet->sum('years_experience'), 1);

            $candidates[] = [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'average_proficiency' => $avgProficiency,
                'total_years_experience' => $totalYears,
                'skills' => $userSkillSet->map(fn($us) => [
                    'skill_id' => $us->skill_id,
                    'name' => $us->skill?->name,
                    'category' => $us->skill?->category,
                    'proficiency' => $us->proficiency,
                    'years_experience' => (float) $us->years_experience,
                ])->values()->all(),
            ];
        }

        // Sort by average proficiency descending
        usort($candidates, fn($a, $b) => $b['average_proficiency'] <=> $a['average_proficiency']);

        return response()->json([
            'data' => $candidates,
        ]);
    }
}

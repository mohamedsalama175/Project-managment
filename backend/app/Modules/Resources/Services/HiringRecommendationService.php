<?php

namespace App\Modules\Resources\Services;

use App\Models\Task;
use App\Models\User;
use App\Modules\Resources\Models\Skill;
use App\Modules\Resources\Models\TaskSkill;
use App\Modules\Resources\Models\UserSkill;
use Carbon\Carbon;

class HiringRecommendationService
{
    public function getRecommendations(string $orgId, int $weeks = 26): array
    {
        $skills = Skill::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->where('is_active', true)
            ->get();

        $recommendations = [];
        $startOfWeek = Carbon::now()->startOfWeek(Carbon::MONDAY);

        // Compute team supply per skill per week (in hours)
        $userSkills = UserSkill::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->with('user')
            ->get();

        $taskSkills = TaskSkill::withoutGlobalScopes()
            ->where('organization_id', $orgId)
            ->with(['task', 'skill'])
            ->get();

        foreach ($skills as $skill) {
            // Find users who have this skill
            $qualifiedUsers = $userSkills->where('skill_id', $skill->id);
            $weeklySupplyHours = 0.0;
            foreach ($qualifiedUsers as $us) {
                $weeklySupplyHours += (float) ($us->user?->weekly_capacity_hours ?? 40.0);
            }

            // Find tasks requiring this skill
            $relevantTaskSkills = $taskSkills->where('skill_id', $skill->id);

            // Track weekly demand across the forecast horizon
            $consecutiveDeficitWeeks = 0;
            $firstDeficitWeek = null;
            $peakDeficitHours = 0.0;
            $totalDeficitHours = 0.0;

            for ($w = 0; $w < $weeks; $w++) {
                $wStart = $startOfWeek->copy()->addWeeks($w);
                $wEnd = $wStart->copy()->endOfWeek(Carbon::SUNDAY);
                $isoWeek = $wStart->format('o-\WW');

                $weeklyDemandHours = 0.0;
                foreach ($relevantTaskSkills as $ts) {
                    $task = $ts->task;
                    if (!$task || !$task->start_date || !$task->end_date) {
                        continue;
                    }

                    $tStart = Carbon::parse($task->start_date);
                    $tEnd = Carbon::parse($task->end_date);

                    if ($wStart->lte($tEnd) && $wEnd->gte($tStart)) {
                        $taskHours = (float) ($task->estimated_hours ?? 40.0);
                        $durationWeeks = max(1, $tStart->diffInWeeks($tEnd) + 1);
                        $weeklyDemandHours += ($taskHours / $durationWeeks);
                    }
                }

                $deficit = $weeklyDemandHours - $weeklySupplyHours;

                if ($deficit > 10.0) { // Significant deficit threshold
                    $consecutiveDeficitWeeks++;
                    if (!$firstDeficitWeek) {
                        $firstDeficitWeek = $isoWeek;
                    }
                    $totalDeficitHours += $deficit;
                    $peakDeficitHours = max($peakDeficitHours, $deficit);
                } else {
                    // Reset if gap closes unless we already reached 8 weeks
                    if ($consecutiveDeficitWeeks < 8) {
                        $consecutiveDeficitWeeks = 0;
                        $firstDeficitWeek = null;
                        $totalDeficitHours = 0.0;
                        $peakDeficitHours = 0.0;
                    }
                }
            }

            // Alert condition: sustained demand > supply over 8+ weeks
            if ($consecutiveDeficitWeeks >= 8) {
                $avgWeeklyDeficit = round($totalDeficitHours / $consecutiveDeficitWeeks, 1);
                $recommendedFte = max(1, (int) ceil($avgWeeklyDeficit / 40.0));

                $recommendations[] = [
                    'skill_id' => $skill->id,
                    'skill_name' => $skill->name,
                    'category' => $skill->category,
                    'first_deficit_week' => $firstDeficitWeek,
                    'consecutive_weeks' => $consecutiveDeficitWeeks,
                    'weekly_supply_hours' => $weeklySupplyHours,
                    'average_weekly_deficit_hours' => $avgWeeklyDeficit,
                    'peak_weekly_deficit_hours' => round($peakDeficitHours, 1),
                    'recommended_headcount' => $recommendedFte,
                    'headline' => "You need {$recommendedFte} more {$skill->name} engineers by {$firstDeficitWeek}",
                    'explanation' => "Demand exceeds supply by ~{$avgWeeklyDeficit}h/wk across {$consecutiveDeficitWeeks} consecutive weeks.",
                ];
            }
        }

        return [
            'organization_id' => $orgId,
            'forecast_weeks' => $weeks,
            'recommendations_count' => count($recommendations),
            'recommendations' => $recommendations,
        ];
    }
}

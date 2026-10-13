import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  AlertTriangle,
  TrendingUp,
  Award,
  Loader2,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { resourcesApi, HiringRecommendation } from '../../api/resources';

export const HiringRecommendationsCard: React.FC = () => {
  const [recommendations, setRecommendations] = useState<HiringRecommendation[]>([]);
  const [windowWeeks, setWindowWeeks] = useState<number>(8);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    resourcesApi
      .getHiringRecommendations()
      .then((res) => {
        setRecommendations(res.recommendations || []);
        if (res.analysis_window_weeks) setWindowWeeks(res.analysis_window_weeks);
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to analyze hiring recommendations.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
        <span>Evaluating long-term skill deficits...</span>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            Balanced Resource Health: No sustained deficits (&gt;= {windowWeeks} consecutive weeks) detected across current skills.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-500/10 dark:via-slate-900 dark:to-slate-900 border border-amber-500/20 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              Strategic Hiring Recommendations
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                {recommendations.length} Detected
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sustained skill deficits over {windowWeeks}+ consecutive forecast weeks
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recommendations.map((rec) => (
          <div
            key={rec.skill_id}
            className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-amber-500/30 shadow-xs space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  {rec.category}
                </span>
                <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                  {rec.skill_name}
                </h5>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  +{rec.recommended_headcount} Headcount
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {rec.reason}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 font-mono">
              <span>Peak Deficit: {rec.peak_weekly_deficit_hours}h / wk</span>
              <span>Total Workload Deficit: {rec.total_deficit_hours}h</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

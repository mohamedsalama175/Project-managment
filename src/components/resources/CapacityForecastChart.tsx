import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Zap,
  Info,
  ChevronRight,
  ShieldAlert,
  Percent,
} from 'lucide-react';
import { ClayButton } from '../common/ClayButton';
import { resourcesApi, CapacityForecastResponse, CapacityUserWeek } from '../../api/resources';

interface CapacityForecastChartProps {
  onSelectUserForSlideout?: (userId: string, userName: string) => void;
}

export const CapacityForecastChart: React.FC<CapacityForecastChartProps> = ({
  onSelectUserForSlideout,
}) => {
  const [weeksHorizon, setWeeksHorizon] = useState<number>(8);
  const [forecast, setForecast] = useState<CapacityForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await resourcesApi.getCapacityForecast(weeksHorizon);
      setForecast(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to calculate capacity forecast.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [weeksHorizon]);

  const getStatusBadge = (status: CapacityUserWeek['status'], loadPercent: number) => {
    switch (status) {
      case 'zero_capacity':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
            Zero Cap
          </span>
        );
      case 'overallocated':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">
            {loadPercent}%
          </span>
        );
      case 'optimal':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
            {loadPercent}%
          </span>
        );
      case 'underallocated':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
            {loadPercent}%
          </span>
        );
    }
  };

  const getBarColor = (status: CapacityUserWeek['status']) => {
    switch (status) {
      case 'zero_capacity':
        return 'bg-slate-300 dark:bg-slate-700';
      case 'overallocated':
        return 'bg-rose-500';
      case 'optimal':
        return 'bg-emerald-500';
      case 'underallocated':
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-5">
      {/* Forecast Controls Bar */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Capacity & Resource Forecasting
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Forward-looking load projection accounting for working calendar & approved leaves
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Horizon:</span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[4, 8, 12, 16].map((w) => (
              <button
                key={w}
                onClick={() => setWeeksHorizon(w)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  weeksHorizon === w
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {w} Weeks
              </button>
            ))}
          </div>

          <button
            onClick={fetchForecast}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Refresh Forecast"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      {forecast && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base Capacity</span>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {forecast.summary.total_base_capacity}h
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Effective Cap</span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {forecast.summary.total_effective_capacity}h
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated Hours</span>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {forecast.summary.total_allocated_hours}h
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Load</span>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {forecast.summary.average_load_percent}%
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overallocated</span>
            <div className="text-lg font-black text-rose-500 mt-0.5">
              {forecast.summary.overallocated_weeks_count} wk(s)
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zero Capacity</span>
            <div className="text-lg font-black text-slate-500 mt-0.5">
              {forecast.summary.zero_capacity_weeks_count} wk(s)
            </div>
          </div>
        </div>
      )}

      {/* Grid of Users and Weekly Horizons */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mb-2" />
          <p className="text-xs text-slate-500 font-medium">Computing capacity forecast matrix...</p>
        </div>
      ) : forecast && forecast.users.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          No team members registered under active organization.
        </div>
      ) : forecast ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                <th className="p-3.5 font-bold text-slate-700 dark:text-slate-200 min-w-[220px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-xs">
                  Resource Name
                </th>
                {forecast.users[0]?.weeks.map((w) => (
                  <th
                    key={w.iso_week}
                    className="p-3 font-bold text-slate-600 dark:text-slate-300 min-w-[120px] text-center"
                  >
                    <div className="font-mono text-[11px] text-slate-800 dark:text-white">
                      {w.iso_week}
                    </div>
                    <div className="text-[10px] font-normal text-slate-400">
                      {w.start_date.substring(5)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {forecast.users.map((u) => (
                <tr
                  key={u.user_id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* User info sticky column */}
                  <td className="p-3.5 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {u.job_title} · {u.weekly_base_capacity}h/wk
                        </div>
                      </div>
                      {onSelectUserForSlideout && (
                        <button
                          onClick={() => onSelectUserForSlideout(u.user_id, u.name)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View Allocations"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Weekly load columns */}
                  {u.weeks.map((wk) => (
                    <td key={wk.iso_week} className="p-2.5 text-center align-middle">
                      <div className="flex flex-col items-center gap-1">
                        {getStatusBadge(wk.status, wk.load_percent)}
                        
                        {/* Progress load indicator bar */}
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${getBarColor(wk.status)} transition-all`}
                            style={{ width: `${Math.min(100, wk.load_percent)}%` }}
                          />
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono">
                          {wk.allocated_hours}h / {wk.effective_capacity_hours}h
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

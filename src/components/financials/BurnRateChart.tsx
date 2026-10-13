import React from 'react';
import { BurnRateResponse, ForecastResponse } from '../../api/financials';
import { Flame, AlertOctagon, Calendar, Clock } from 'lucide-react';

interface BurnRateChartProps {
  burnRate: BurnRateResponse | null;
  forecast?: ForecastResponse | null;
  loading?: boolean;
}

export const BurnRateChart: React.FC<BurnRateChartProps> = ({ burnRate, forecast = null, loading }) => {
  if (loading) {
    return <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />;
  }

  if (!burnRate) return null;

  const maxWeeklyCost = Math.max(...(burnRate.history.map((h) => h.cost) || [1]), 100);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Forecast & Overrun Alert Banner */}
      {forecast?.alerts && forecast.alerts.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              Budget Overrun Forecast Alert
            </h4>
            <p className="text-sm text-rose-700 dark:text-rose-300 mt-0.5">
              {forecast.alerts[0].message}
            </p>
          </div>
        </div>
      )}

      {/* Burn Rate Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Weekly Cost Burn Rate & Forecast
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Historical burn over past {burnRate.analysis_weeks} weeks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-slate-400 text-xs block">Avg. Weekly Burn</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {burnRate.currency} {burnRate.average_weekly_burn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {forecast && (
            <div>
              <span className="text-slate-400 text-xs block">Est. Completion</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {forecast.projected_completion_date} ({forecast.weeks_remaining} wks)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="pt-4">
        {burnRate.history.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-slate-400">
            No approved weekly cost logs recorded yet.
          </div>
        ) : (
          <div className="flex items-end gap-3 h-48 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
            {burnRate.history.map((item, idx) => {
              const heightPercent = Math.min(100, Math.max(10, (item.cost / maxWeeklyCost) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center min-w-[50px] group">
                  <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition mb-1">
                    ${item.cost.toLocaleString()}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[36px] bg-gradient-to-t from-emerald-500 to-sky-400 hover:from-emerald-400 hover:to-sky-300 rounded-t-lg transition shadow-sm"
                  />
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                    {item.week.replace(/.*-W/, 'W')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

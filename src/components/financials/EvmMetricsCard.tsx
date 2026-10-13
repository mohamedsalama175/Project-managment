import React from 'react';
import { EvmMetrics } from '../../api/financials';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Activity } from 'lucide-react';

interface EvmMetricsCardProps {
  metrics: EvmMetrics | null;
  loading?: boolean;
}

export const EvmMetricsCard: React.FC<EvmMetricsCardProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        No Earned Value Management metrics available for this project.
      </div>
    );
  }

  const { bac, pv, ev, ac, cv, sv, cpi, spi, eac, etc, vac, tcpi, currency, health } = metrics;

  return (
    <div className="space-y-6">
      {/* Top Summary Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-sky-600/10 to-indigo-600/10 border border-emerald-500/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
              Earned Value Management (EVM) Status
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Evaluated as of {metrics.status_date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              health.cost_status === 'under_budget'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
            }`}
          >
            {health.cost_status === 'under_budget' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {health.cost_status === 'under_budget' ? 'Under Budget' : 'Over Budget'}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              health.schedule_status === 'ahead_of_schedule'
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}
          >
            {health.schedule_status === 'ahead_of_schedule' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {health.schedule_status === 'ahead_of_schedule' ? 'Ahead of Schedule' : 'Behind Schedule'}
          </span>
        </div>
      </div>

      {/* Core EVM KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BAC */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Budget at Completion (BAC)</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {currency} {bac.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Total approved baseline budget</div>
        </div>

        {/* PV */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Planned Value (PV)</span>
            <span className="text-sky-500 text-xs font-semibold">Scheduled</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {currency} {pv.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {bac > 0 ? `${((pv / bac) * 100).toFixed(1)}% of total budget planned` : '0%'}
          </div>
        </div>

        {/* EV */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Earned Value (EV)</span>
            <span className="text-emerald-500 text-xs font-semibold">Delivered</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {currency} {ev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {bac > 0 ? `${((ev / bac) * 100).toFixed(1)}% of total value realized` : '0%'}
          </div>
        </div>

        {/* AC */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Actual Cost (AC)</span>
            <span className="text-rose-500 text-xs font-semibold">Incurred</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {currency} {ac.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Labor + approved expenses</div>
        </div>
      </div>

      {/* Variances & Performance Indices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPI */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cost Performance (CPI)
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                cpi >= 1.0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {cpi.toFixed(4)}
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {cpi >= 1.0 ? 'Favorable (> 1.0)' : 'Overrun Warning (< 1.0)'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            CV: {currency} {cv >= 0 ? `+${cv}` : cv}
          </p>
        </div>

        {/* SPI */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Schedule Performance (SPI)
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                spi >= 1.0
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {spi.toFixed(4)}
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {spi >= 1.0 ? 'Ahead (> 1.0)' : 'Behind Schedule (< 1.0)'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            SV: {currency} {sv >= 0 ? `+${sv}` : sv}
          </p>
        </div>

        {/* EAC */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Estimate at Completion (EAC)
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {currency} {eac.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            VAC: {currency} {vac >= 0 ? `+${vac}` : vac}
          </p>
        </div>

        {/* TCPI */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              To-Complete Index (TCPI)
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {tcpi !== null ? tcpi.toFixed(4) : 'Overrun (N/A)'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ETC: {currency} {etc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
};

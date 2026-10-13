import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Clock,
  Camera,
  Calendar,
  Users,
  CheckSquare,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Archive,
  BarChart2,
} from 'lucide-react';
import { financialsApi, ProjectCostsResponse } from '../../api/financials';
import { useAuthStore } from '../../stores/useAuthStore';

interface CostTrackingTableProps {
  projectId: string;
}

export const CostTrackingTable: React.FC<CostTrackingTableProps> = ({ projectId }) => {
  const { can } = useAuthStore();
  const canManage = can('costs.manage');

  const [loading, setLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [costsData, setCostsData] = useState<ProjectCostsResponse | null>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  // Date filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Active view tab
  const [activeTab, setActiveTab] = useState<'by_user' | 'by_task' | 'by_week' | 'entries' | 'snapshots'>('by_user');

  useEffect(() => {
    if (projectId) {
      loadCosts();
      loadSnapshots();
    }
  }, [projectId]);

  const loadCosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financialsApi.getProjectCosts(projectId, {
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setCostsData(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch project cost data.');
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshots = async () => {
    try {
      const res = await financialsApi.getCostSnapshots(projectId);
      setSnapshots(res.snapshots || []);
    } catch (err) {
      // Non-fatal
    }
  };

  const handleTakeSnapshot = async () => {
    if (!canManage) return;
    setSnapshotLoading(true);
    setError(null);
    try {
      await financialsApi.takeCostSnapshot(projectId);
      setSuccessMsg('Cost snapshot generated and recorded successfully.');
      loadSnapshots();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to capture snapshot.');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const summary = costsData?.summary;
  const currency = summary?.currency || 'USD';
  const margin = summary ? summary.billable_amount - summary.total_cost : 0;
  const marginPct = summary && summary.billable_amount > 0 ? (margin / summary.billable_amount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Filter and Action Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={loadCosts}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Filter
          </button>
        </div>

        {canManage && (
          <button
            onClick={handleTakeSnapshot}
            disabled={snapshotLoading}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            <Camera className="w-4 h-4" />
            {snapshotLoading ? 'Capturing...' : 'Capture Cost Snapshot'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-3">
          <TrendingUp className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Hours</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
              <Clock className="w-4 h-4 text-emerald-500" />
              {summary.total_hours.toLocaleString()} hrs
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Labor Cost</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              ${summary.labor_cost.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Expenses Cost</span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              ${summary.expense_cost.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Cost (AC)</span>
            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
              ${summary.total_cost.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Billable Value</span>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ${summary.billable_amount.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Gross Margin</span>
            <div className={`text-xl font-extrabold ${margin >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
              ${margin.toLocaleString()} <span className="text-xs font-semibold">({marginPct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('by_user')}
            className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'by_user'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            By Resource ({costsData?.by_user?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('by_task')}
            className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'by_task'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            By Task ({costsData?.by_task?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('by_week')}
            className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'by_week'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Weekly Breakdown ({costsData?.by_week?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('entries')}
            className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'entries'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Time Entries ({costsData?.entries?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('snapshots')}
            className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'snapshots'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            Snapshots Archive ({snapshots.length})
          </button>
        </div>

        <div className="p-6 overflow-x-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-sm">Calculating aggregated cost models...</p>
            </div>
          ) : activeTab === 'by_user' ? (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Team Member</th>
                  <th className="pb-3 font-semibold text-right">Logged Hours</th>
                  <th className="pb-3 font-semibold text-right">Labor Cost</th>
                  <th className="pb-3 font-semibold text-right">Billable Amount</th>
                  <th className="pb-3 font-semibold text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {costsData?.by_user?.map((u) => {
                  const net = u.billable_amount - u.cost;
                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-bold text-slate-900 dark:text-white">{u.name}</td>
                      <td className="py-3 text-right text-slate-600 dark:text-slate-300 font-medium">
                        {u.hours.toFixed(2)} hrs
                      </td>
                      <td className="py-3 text-right font-medium text-slate-900 dark:text-white">
                        ${u.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        ${u.billable_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 text-right font-bold ${net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        ${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                {(!costsData?.by_user || costsData.by_user.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">No user costs recorded for this timeframe.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === 'by_task' ? (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Task Name</th>
                  <th className="pb-3 font-semibold text-right">Hours</th>
                  <th className="pb-3 font-semibold text-right">Accumulated Cost</th>
                  <th className="pb-3 font-semibold text-right">Billable Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {costsData?.by_task?.map((t) => (
                  <tr key={t.task_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-bold text-slate-900 dark:text-white">{t.name}</td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-300 font-medium">
                      {t.hours.toFixed(2)} hrs
                    </td>
                    <td className="py-3 text-right font-medium text-slate-900 dark:text-white">
                      ${t.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      ${t.billable_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {(!costsData?.by_task || costsData.by_task.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">No task costs recorded for this timeframe.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === 'by_week' ? (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Week Identifier</th>
                  <th className="pb-3 font-semibold">Starting Date</th>
                  <th className="pb-3 font-semibold text-right">Hours</th>
                  <th className="pb-3 font-semibold text-right">Cost</th>
                  <th className="pb-3 font-semibold text-right">Billable Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {costsData?.by_week?.map((w) => (
                  <tr key={w.week} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-bold text-slate-900 dark:text-white">Week {w.week}</td>
                    <td className="py-3 text-slate-500">{w.start_date}</td>
                    <td className="py-3 text-right text-slate-600 dark:text-slate-300 font-medium">
                      {w.hours.toFixed(2)} hrs
                    </td>
                    <td className="py-3 text-right font-medium text-rose-600 dark:text-rose-400">
                      ${w.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      ${w.billable_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {(!costsData?.by_week || costsData.by_week.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">No weekly entries found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === 'entries' ? (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Member</th>
                  <th className="pb-3 font-semibold">Task</th>
                  <th className="pb-3 font-semibold text-right">Hours</th>
                  <th className="pb-3 font-semibold text-right">Cost Rate</th>
                  <th className="pb-3 font-semibold text-right">Labor Cost</th>
                  <th className="pb-3 font-semibold text-right">Billable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {costsData?.entries?.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-medium text-slate-700 dark:text-slate-300">{e.date}</td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white">{e.user.name}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">{e.task.name}</td>
                    <td className="py-3 text-right font-medium">{e.hours}h</td>
                    <td className="py-3 text-right text-slate-500">${e.cost_rate.toFixed(2)}/h</td>
                    <td className="py-3 text-right font-bold text-slate-900 dark:text-white">${e.cost.toFixed(2)}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        e.billable ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {e.billable ? `$${e.billable_amount.toFixed(2)}` : 'Non-billable'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!costsData?.entries || costsData.entries.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">No individual time entries in scope.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="space-y-3">
              {snapshots.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No snapshots captured yet. Snapshots are generated weekly via cron or manually on demand.
                </div>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {snap.snapshot_date}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Total Cost: ${parseFloat(snap.total_cost).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-4">
                        <span>Labor: ${parseFloat(snap.labor_cost).toLocaleString()}</span>
                        <span>Expenses: ${parseFloat(snap.expense_cost).toLocaleString()}</span>
                        <span>Billable: ${parseFloat(snap.billable_amount).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      Captured: {new Date(snap.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

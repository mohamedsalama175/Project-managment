import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Plus,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Sliders,
  Trash2,
  X,
  Layers,
} from 'lucide-react';
import {
  financialsApi,
  WidgetCatalogItem,
  DashboardItem,
  EvmMetrics,
  BurnRateResponse,
} from '../../api/financials';
import { EvmMetricsCard } from './EvmMetricsCard';
import { BurnRateChart } from './BurnRateChart';
import { CostTrackingTable } from './CostTrackingTable';
import { ExpenseManagement } from './ExpenseManagement';
import { InvoiceManagement } from './InvoiceManagement';
import { useAuthStore } from '../../stores/useAuthStore';

interface CustomDashboardBuilderProps {
  projectId: string;
}

export const CustomDashboardBuilder: React.FC<CustomDashboardBuilderProps> = ({ projectId }) => {
  const { can } = useAuthStore();
  const canManage = can('dashboards.manage');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [widgets, setWidgets] = useState<WidgetCatalogItem[]>([]);
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);

  // Layout state for active dashboard
  const [selectedWidgetKeys, setSelectedWidgetKeys] = useState<string[]>([
    'evm_kpi_summary',
    'burn_rate_chart',
    'invoice_pipeline',
  ]);

  // Live preview metrics
  const [evmMetrics, setEvmMetrics] = useState<EvmMetrics | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateResponse | null>(null);

  // New Dashboard Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDashboardTitle, setNewDashboardTitle] = useState('');

  useEffect(() => {
    loadCatalogAndDashboards();
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadLiveData();
    }
  }, [projectId]);

  const loadCatalogAndDashboards = async () => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, dRes] = await Promise.all([
        financialsApi.getWidgets(),
        financialsApi.getDashboards({ project_id: projectId }).catch(() => ({ dashboards: [] })),
      ]);

      setWidgets(wRes.widgets || []);
      const dbs = dRes.dashboards || [];
      setDashboards(dbs);

      if (dbs.length > 0) {
        const defaultDb = dbs.find((d) => d.is_default) || dbs[0];
        setActiveDashboardId(defaultDb.id);
        const keys = defaultDb.layout?.map((l: any) => l.widget_key) || [];
        if (keys.length > 0) {
          setSelectedWidgetKeys(keys);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboards.');
    } finally {
      setLoading(false);
    }
  };

  const loadLiveData = async () => {
    try {
      const [evm, burn] = await Promise.all([
        financialsApi.getEvmMetrics(projectId).catch(() => null),
        financialsApi.getBurnRate(projectId).catch(() => null),
      ]);
      setEvmMetrics(evm);
      setBurnRate(burn);
    } catch (err) {
      // Non-fatal preview telemetry
    }
  };

  const toggleWidget = (key: string) => {
    setSelectedWidgetKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSaveDashboard = async () => {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const layout = selectedWidgetKeys.map((k, index) => ({
        widget_key: k,
        x: (index % 2) * 6,
        y: Math.floor(index / 2) * 4,
        w: 6,
        h: 4,
      }));

      if (activeDashboardId) {
        await financialsApi.updateDashboard(activeDashboardId, {
          layout,
        });
        setSuccess('Dashboard layout saved successfully.');
      } else {
        const res = await financialsApi.createDashboard({
          title: 'Executive Financial Cockpit',
          project_id: projectId,
          layout,
          is_default: true,
        });
        setActiveDashboardId(res.dashboard.id);
        setDashboards((prev) => [res.dashboard, ...prev]);
        setSuccess('New dashboard created and saved.');
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save dashboard.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashboardTitle.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const layout = selectedWidgetKeys.map((k, index) => ({
        widget_key: k,
        x: (index % 2) * 6,
        y: Math.floor(index / 2) * 4,
        w: 6,
        h: 4,
      }));

      const res = await financialsApi.createDashboard({
        title: newDashboardTitle.trim(),
        project_id: projectId,
        layout,
        is_default: false,
      });

      setDashboards((prev) => [...prev, res.dashboard]);
      setActiveDashboardId(res.dashboard.id);
      setIsCreateOpen(false);
      setNewDashboardTitle('');
      setSuccess(`Dashboard "${res.dashboard.title}" created.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create dashboard.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Custom Financial Dashboards</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compose custom operational dashboards with dynamic widgets from the global catalog
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dashboards.length > 0 && (
            <select
              value={activeDashboardId || ''}
              onChange={(e) => {
                const id = e.target.value;
                setActiveDashboardId(id);
                const db = dashboards.find((d) => d.id === id);
                if (db?.layout) {
                  setSelectedWidgetKeys(db.layout.map((l: any) => l.widget_key));
                }
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              {dashboards.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} {d.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          )}

          {canManage && (
            <>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                New View
              </button>
              <button
                onClick={handleSaveDashboard}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition disabled:opacity-60"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Layout
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Widget Palette Filter & Selector */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
          Available Widgets ({widgets.length}) — Click to toggle on active dashboard
        </span>
        <div className="flex flex-wrap gap-2">
          {widgets.map((w) => {
            const isSelected = selectedWidgetKeys.includes(w.key);
            return (
              <button
                key={w.key}
                type="button"
                onClick={() => toggleWidget(w.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {w.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Dashboard Canvas */}
      <div className="space-y-6">
        {selectedWidgetKeys.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            No widgets selected. Enable widgets from the catalog above to populate your cockpit.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedWidgetKeys.includes('evm_kpi_summary') && (
              <div className="lg:col-span-2">
                <EvmMetricsCard metrics={evmMetrics} />
              </div>
            )}

            {selectedWidgetKeys.includes('burn_rate_chart') && (
              <div className="lg:col-span-2">
                <BurnRateChart burnRate={burnRate} />
              </div>
            )}

            {selectedWidgetKeys.includes('invoice_pipeline') && (
              <div className="lg:col-span-2">
                <InvoiceManagement projectId={projectId} />
              </div>
            )}

            {selectedWidgetKeys.includes('expense_feed') && (
              <div className="lg:col-span-2">
                <ExpenseManagement projectId={projectId} />
              </div>
            )}

            {selectedWidgetKeys.includes('cost_breakdown') && (
              <div className="lg:col-span-2">
                <CostTrackingTable projectId={projectId} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Dashboard Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">New Dashboard Canvas</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewDashboard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Dashboard Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steering Committee EVM Cockpit"
                  value={newDashboardTitle}
                  onChange={(e) => setNewDashboardTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-60"
                >
                  Create Canvas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

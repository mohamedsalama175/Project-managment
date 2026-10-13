import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  FileSpreadsheet,
  LayoutGrid,
  Settings,
  AlertTriangle,
  RefreshCw,
  FolderKanban,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { useAuthStore } from '../stores/useAuthStore';
import {
  financialsApi,
  ProjectBudget,
  EvmMetrics,
  BurnRateResponse,
  ForecastResponse,
} from '../api/financials';
import { EvmMetricsCard } from '../components/financials/EvmMetricsCard';
import { BurnRateChart } from '../components/financials/BurnRateChart';
import { CostTrackingTable } from '../components/financials/CostTrackingTable';
import { ExpenseManagement } from '../components/financials/ExpenseManagement';
import { InvoiceManagement } from '../components/financials/InvoiceManagement';
import { ReportGenerator } from '../components/financials/ReportGenerator';
import { CustomDashboardBuilder } from '../components/financials/CustomDashboardBuilder';
import { BudgetManagementModal } from '../components/financials/BudgetManagementModal';

export const FinancialsView: React.FC = () => {
  const { projects, activeProjectId } = useProjectStore();
  const { can } = useAuthStore();

  // If there's an active project in store, use it; otherwise fallback to first project
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeProjectId || (projects[0]?.id || '')
  );

  useEffect(() => {
    if (activeProjectId && activeProjectId !== selectedProjectId) {
      setSelectedProjectId(activeProjectId);
    } else if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [activeProjectId, projects]);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState<
    'evm' | 'costs' | 'expenses' | 'invoices' | 'reports' | 'dashboards'
  >('evm');

  // Budget Modal
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Financial Telemetry
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState<ProjectBudget | null>(null);
  const [evmMetrics, setEvmMetrics] = useState<EvmMetrics | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectFinancials();
    }
  }, [selectedProjectId]);

  const loadProjectFinancials = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [bRes, evmRes, burnRes, fcRes] = await Promise.all([
        financialsApi.getBudget(selectedProjectId).catch(() => null),
        financialsApi.getEvmMetrics(selectedProjectId).catch(() => null),
        financialsApi.getBurnRate(selectedProjectId).catch(() => null),
        financialsApi.getForecast(selectedProjectId).catch(() => null),
      ]);

      setBudget(bRes);
      setEvmMetrics(evmRes);
      setBurnRate(burnRes);
      setForecast(fcRes);
    } catch (err) {
      console.error('Failed to load project financials:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
        <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Projects Available</h3>
        <p className="text-sm">Create a project to activate financial tracking and budgeting.</p>
      </div>
    );
  }

  const overrunAlert = forecast?.alerts?.find((a) => a.type === 'PROJECT_BUDGET_EXCEEDED');

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Banner / Project Selector & Baseline Summary */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
              {activeProject.code || 'PROJECT'}
            </span>
            <span className="text-xs text-slate-400 font-medium">Financial Governance Engine</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeProject.name}
            </h1>

            {projects.length > 1 && (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code || 'PRJ'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeProject.clientName ? `Client: ${activeProject.clientName} • ` : ''}
            Baseline Currency: {budget?.budget_currency || 'USD'} • Model: {budget?.budget_type?.toUpperCase() || 'FIXED'}
          </p>
        </div>

        {/* Budget Pill & Configuration Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Approved Baseline Budget
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              ${(budget?.budget_amount || 0).toLocaleString()} {budget?.budget_currency || 'USD'}
            </div>
          </div>

          {can('budgets.manage') && (
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition"
            >
              <Settings className="w-4 h-4" />
              Manage Budget
            </button>
          )}

          <button
            onClick={loadProjectFinancials}
            disabled={loading}
            className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overrun Critical Alert Banner */}
      {overrunAlert && (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500 text-white">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm">{overrunAlert.message}</h4>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Forecasted Cost: ${overrunAlert.forecast_cost.toLocaleString()} vs Budget: ${overrunAlert.budget.toLocaleString()} • Estimated Overrun: ${overrunAlert.overrun_amount.toLocaleString()} (+{overrunAlert.overrun_percentage}%)
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('evm')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold whitespace-nowrap self-start sm:self-auto"
          >
            Review Forecast
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-900 border border-slate-300/40 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('evm')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'evm'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Earned Value & Runway
        </button>

        <button
          onClick={() => setActiveTab('costs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'costs'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Labor & Costs
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'expenses'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Expenses
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'invoices'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Invoicing & Billing
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'reports'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Reports Catalog
        </button>

        <button
          onClick={() => setActiveTab('dashboards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'dashboards'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Custom Dashboards
        </button>
      </div>

      {/* Main Tab Content Display */}
      <div className="space-y-6">
        {activeTab === 'evm' && (
          <div className="space-y-6">
            <EvmMetricsCard metrics={evmMetrics} loading={loading} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <BurnRateChart burnRate={burnRate} forecast={forecast} loading={loading} />
              </div>

              {/* Forecast to Complete Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      Completion Forecast
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Extrapolated completion runway based on historical weekly velocity and cost burn
                  </p>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Estimated at Completion (EAC)
                      </span>
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        ${(forecast?.eac || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Estimate to Complete (ETC)
                      </span>
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        ${(forecast?.etc || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Projected Completion Runway
                      </span>
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        {forecast?.weeks_remaining !== undefined ? `${forecast.weeks_remaining.toFixed(1)} weeks` : 'Calculating...'}
                      </div>
                      {forecast?.projected_completion_date && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Projected Date: {forecast.projected_completion_date}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Weekly Burn: ${(forecast?.average_weekly_burn || 0).toFixed(0)}/wk</span>
                  <span>BAC: ${(forecast?.bac || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'costs' && <CostTrackingTable projectId={selectedProjectId} />}

        {activeTab === 'expenses' && <ExpenseManagement projectId={selectedProjectId} />}

        {activeTab === 'invoices' && (
          <InvoiceManagement
            projectId={selectedProjectId}
            defaultClientName={activeProject.clientName || undefined}
          />
        )}

        {activeTab === 'reports' && <ReportGenerator projectId={selectedProjectId} />}

        {activeTab === 'dashboards' && <CustomDashboardBuilder projectId={selectedProjectId} />}
      </div>

      {/* Budget Modal */}
      <BudgetManagementModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        projectId={selectedProjectId}
        projectName={activeProject.name}
        onBudgetUpdated={loadProjectFinancials}
      />
    </div>
  );
};
export default FinancialsView;

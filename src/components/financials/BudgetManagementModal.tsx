import React, { useState, useEffect } from 'react';
import { X, DollarSign, History, AlertCircle, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import { financialsApi, ProjectBudget, ProjectBudgetRevision } from '../../api/financials';
import { useAuthStore } from '../../stores/useAuthStore';

interface BudgetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  onBudgetUpdated?: () => void;
}

export const BudgetManagementModal: React.FC<BudgetManagementModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  onBudgetUpdated,
}) => {
  const { can } = useAuthStore();
  const canManage = can('budgets.manage');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [budget, setBudget] = useState<ProjectBudget | null>(null);
  const [revisions, setRevisions] = useState<ProjectBudgetRevision[]>([]);

  // Form state
  const [budgetAmount, setBudgetAmount] = useState<string>('0');
  const [budgetCurrency, setBudgetCurrency] = useState<string>('USD');
  const [budgetType, setBudgetType] = useState<'fixed' | 't_and_m' | 'retainer'>('fixed');
  const [billingCurrency, setBillingCurrency] = useState<string>('USD');
  const [reason, setReason] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');

  useEffect(() => {
    if (isOpen && projectId) {
      loadBudgetData();
    }
  }, [isOpen, projectId]);

  const loadBudgetData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetRes, revisionsRes] = await Promise.all([
        financialsApi.getBudget(projectId),
        financialsApi.getBudgetRevisions(projectId).catch(() => ({ revisions: [] })),
      ]);

      setBudget(budgetRes);
      setBudgetAmount(String(budgetRes.budget_amount || 0));
      setBudgetCurrency(budgetRes.budget_currency || 'USD');
      setBudgetType(budgetRes.budget_type || 'fixed');
      setBillingCurrency(budgetRes.billing_currency || 'USD');
      setRevisions(revisionsRes.revisions || budgetRes.revisions || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load project budget details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const amountNum = parseFloat(budgetAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      setError('Please provide a valid non-negative budget amount.');
      setSaving(false);
      return;
    }

    try {
      const res = await financialsApi.updateBudget(projectId, {
        budget_amount: amountNum,
        budget_currency: budgetCurrency,
        budget_type: budgetType,
        billing_currency: billingCurrency,
        reason: reason.trim() || undefined,
      });

      setSuccess('Project budget updated successfully.');
      setReason('');
      if (res.revision) {
        setRevisions((prev) => [res.revision, ...prev]);
      }
      if (onBudgetUpdated) {
        onBudgetUpdated();
      }
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update budget.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Project Budget Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {projectName ? `${projectName} — ` : ''}Configure financial baseline and contract terms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'edit'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Budget Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Revision History ({revisions.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-sm">Loading budget specifications...</p>
            </div>
          ) : activeTab === 'edit' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Budget Amount (BAC)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                      {budgetCurrency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!canManage}
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full pl-14 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Budget Currency
                  </label>
                  <select
                    disabled={!canManage}
                    value={budgetCurrency}
                    onChange={(e) => setBudgetCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition disabled:opacity-60"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="EGP">EGP - Egyptian Pound</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Contract / Budget Model
                  </label>
                  <select
                    disabled={!canManage}
                    value={budgetType}
                    onChange={(e) => setBudgetType(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition disabled:opacity-60"
                  >
                    <option value="fixed">Fixed Price Milestone</option>
                    <option value="t_and_m">Time & Materials (T&M)</option>
                    <option value="retainer">Monthly Retainer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Client Invoicing Currency
                  </label>
                  <select
                    disabled={!canManage}
                    value={billingCurrency}
                    onChange={(e) => setBillingCurrency(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition disabled:opacity-60"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="EGP">EGP - Egyptian Pound</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Revision Note / Justification (Audit Trail)
                </label>
                <textarea
                  rows={3}
                  disabled={!canManage}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Scope adjustment per change request CR-004 approved by steering committee."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition disabled:opacity-60"
                />
              </div>

              {canManage ? (
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-60 transition flex items-center gap-2"
                  >
                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save & Record Revision
                  </button>
                </div>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900">
                  You have read-only access to budgets. Contact an administrator or project manager to update the financial baseline.
                </p>
              )}
            </form>
          ) : (
            <div className="space-y-3">
              {revisions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No revisions recorded for this project yet.
                </div>
              ) : (
                revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {rev.currency}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          ${parseFloat(rev.previous_budget).toLocaleString()} → ${parseFloat(rev.new_budget).toLocaleString()}
                        </span>
                      </div>
                      {rev.reason && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                          "{rev.reason}"
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>{rev.user?.name || 'System Admin'}</div>
                      <div>{new Date(rev.created_at).toLocaleDateString()} {new Date(rev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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

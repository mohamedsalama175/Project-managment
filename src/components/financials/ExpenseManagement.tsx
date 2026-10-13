import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  CheckCircle,
  XCircle,
  Send,
  CreditCard,
  Trash2,
  AlertCircle,
  Filter,
  DollarSign,
  Tag,
  Calendar,
  X,
  RefreshCw,
} from 'lucide-react';
import { financialsApi, Expense } from '../../api/financials';
import { useAuthStore } from '../../stores/useAuthStore';

interface ExpenseManagementProps {
  projectId: string;
}

export const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ projectId }) => {
  const { user: currentUser, can } = useAuthStore();
  const canManage = can('expenses.manage');
  const canCreate = can('expenses.create');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // New Expense Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<Expense['category']>('travel');
  const [newAmount, setNewAmount] = useState('');
  const [newCurrency, setNewCurrency] = useState('USD');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newBillable, setNewBillable] = useState(true);
  const [newDescription, setNewDescription] = useState('');

  // Rejection Modal
  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (projectId) {
      loadExpenses();
    }
  }, [projectId]);

  const loadExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financialsApi.getExpenses({ project_id: projectId });
      setExpenses(res.expenses || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load project expenses.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please provide a valid expense amount greater than 0.');
      return;
    }

    try {
      setActionLoading('create');
      const res = await financialsApi.createExpense({
        project_id: projectId,
        category: newCategory,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        amount: amt,
        currency: newCurrency,
        expense_date: newDate,
        billable: newBillable,
      });

      setSuccess('Expense claim created successfully.');
      setIsCreateModalOpen(false);
      resetCreateForm();
      setExpenses((prev) => [res.expense, ...prev]);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create expense claim.');
    } finally {
      setActionLoading(null);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewCategory('travel');
    setNewAmount('');
    setNewCurrency('USD');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewBillable(true);
    setNewDescription('');
  };

  const handleSubmitExpense = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await financialsApi.submitExpense(id);
      setExpenses((prev) => prev.map((e) => (e.id === id ? res.expense : e)));
      setSuccess('Expense submitted for approval.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit expense.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveExpense = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await financialsApi.approveExpense(id);
      setExpenses((prev) => prev.map((e) => (e.id === id ? res.expense : e)));
      setSuccess('Expense claim approved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to approve expense.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectExpenseSubmit = async () => {
    if (!rejectingExpenseId) return;
    if (!rejectionReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }

    setActionLoading(rejectingExpenseId);
    setError(null);
    try {
      const res = await financialsApi.rejectExpense(rejectingExpenseId, rejectionReason.trim());
      setExpenses((prev) => prev.map((e) => (e.id === rejectingExpenseId ? res.expense : e)));
      setSuccess('Expense claim rejected.');
      setRejectingExpenseId(null);
      setRejectionReason('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reject expense.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReimburseExpense = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await financialsApi.reimburseExpense(id);
      setExpenses((prev) => prev.map((e) => (e.id === id ? res.expense : e)));
      setSuccess('Expense claim marked as reimbursed.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reimburse expense.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft expense claim?')) return;
    setActionLoading(id);
    setError(null);
    try {
      await financialsApi.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      setSuccess('Draft expense deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete expense.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (filterStatus === 'all') return true;
    return e.status === filterStatus;
  });

  const getStatusBadge = (status: Expense['status']) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Draft
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
            Rejected
          </span>
        );
      case 'reimbursed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
            Reimbursed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Project Expense Claims</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit, review, and reimburse travel, materials, and operational expenditures
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Claim Expense
            </button>
          )}
          <button
            onClick={loadExpenses}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'draft', 'submitted', 'approved', 'rejected', 'reimbursed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
              filterStatus === st
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {st} ({st === 'all' ? expenses.length : expenses.filter((e) => e.status === st).length})
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 overflow-x-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-sm">Loading expense claims...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No expenses matching the selected status filter.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Title & Category</th>
                  <th className="pb-3 font-semibold">Claimant</th>
                  <th className="pb-3 font-semibold">Expense Date</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredExpenses.map((exp) => {
                  const isSelfClaim = currentUser?.id === exp.user_id;
                  const isBusy = actionLoading === exp.id;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{exp.title}</div>
                        <div className="text-xs text-slate-500 capitalize flex items-center gap-2 mt-0.5">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{exp.category}</span>
                          {exp.billable && (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                              Billable
                            </span>
                          )}
                        </div>
                        {exp.rejection_reason && (
                          <div className="text-xs text-rose-600 dark:text-rose-400 mt-1 italic">
                            Reason: {exp.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300 font-medium">
                        {exp.user?.name || 'Claimant'}
                      </td>
                      <td className="py-3 text-slate-500">{exp.expense_date}</td>
                      <td className="py-3 text-right font-extrabold text-slate-900 dark:text-white">
                        ${parseFloat(exp.amount).toFixed(2)} {exp.currency}
                      </td>
                      <td className="py-3 text-center">{getStatusBadge(exp.status)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {exp.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleSubmitExpense(exp.id)}
                                disabled={isBusy}
                                title="Submit Claim"
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                disabled={isBusy}
                                title="Delete Draft"
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {exp.status === 'submitted' && canManage && (
                            <>
                              <button
                                onClick={() => handleApproveExpense(exp.id)}
                                disabled={isBusy || isSelfClaim}
                                title={isSelfClaim ? 'Anti-self-approval: cannot approve your own claim' : 'Approve Claim'}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRejectingExpenseId(exp.id)}
                                disabled={isBusy}
                                title="Reject Claim"
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 transition"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {exp.status === 'approved' && canManage && (
                            <button
                              onClick={() => handleReimburseExpense(exp.id)}
                              disabled={isBusy}
                              title="Mark Reimbursed"
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-xs font-semibold transition flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Reimburse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Expense Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Claim Project Expense</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Expense Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Flight to client site in Riyadh"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="travel">Travel & Lodging</option>
                    <option value="equipment">Equipment & Hardware</option>
                    <option value="software">Software Licenses</option>
                    <option value="subcontractor">Subcontractor</option>
                    <option value="materials">Materials</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                  </input>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="SAR">SAR</option>
                    <option value="AED">AED</option>
                    <option value="EGP">EGP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={newBillable}
                    onChange={(e) => setNewBillable(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Billable to project client
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Notes / Receipt Description
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional details or vendor invoice number..."
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create'}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-60 flex items-center gap-1.5"
                >
                  {actionLoading === 'create' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Reject Expense Claim</h3>
            <p className="text-xs text-slate-500">
              Please enter an explicit reason why this expense claim is being declined.
            </p>
            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Missing valid vendor tax invoice or receipt."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingExpenseId(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectExpenseSubmit}
                disabled={!rejectionReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition disabled:opacity-60"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

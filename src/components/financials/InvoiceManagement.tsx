import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  Ban,
  Trash2,
  Download,
  AlertCircle,
  DollarSign,
  Calendar,
  Eye,
  X,
  RefreshCw,
} from 'lucide-react';
import { financialsApi, Invoice, InvoiceLineItem } from '../../api/financials';
import { useAuthStore } from '../../stores/useAuthStore';

interface InvoiceManagementProps {
  projectId: string;
  defaultClientName?: string;
}

export const InvoiceManagement: React.FC<InvoiceManagementProps> = ({
  projectId,
  defaultClientName,
}) => {
  const { can } = useAuthStore();
  const canManage = can('invoices.manage');
  const canCreate = can('invoices.create');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Detail Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientName, setClientName] = useState(defaultClientName || '');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('Payment due within 30 days of issue.');
  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; unit_price: number }>>([
    { description: 'Sprint 1 Milestones Deliverables', quantity: 1, unit_price: 5000 },
  ]);

  useEffect(() => {
    if (projectId) {
      loadInvoices();
    }
  }, [projectId]);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financialsApi.getInvoices({ project_id: projectId });
      setInvoices(res.invoices || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: string, val: any) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((acc, item) => acc + (item.quantity * item.unit_price || 0), 0);
  };

  const calculateTax = () => {
    const sub = calculateSubtotal();
    const rate = parseFloat(taxRate) || 0;
    return sub * (rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;

    if (lineItems.length === 0) {
      setError('Invoice must have at least one line item.');
      return;
    }

    setActionLoading('create');
    setError(null);
    try {
      // Generate client-side idempotency key for network deduplication
      const idempotencyKey = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const res = await financialsApi.createInvoice(
        {
          project_id: projectId,
          client_name: clientName.trim(),
          client_email: clientEmail.trim() || undefined,
          client_address: clientAddress.trim() || undefined,
          issue_date: issueDate,
          due_date: dueDate,
          currency,
          tax_rate: parseFloat(taxRate) || 0,
          notes: notes.trim() || undefined,
          line_items: lineItems.map((li) => ({
            description: li.description.trim(),
            quantity: Number(li.quantity),
            unit_price: Number(li.unit_price),
          })),
        },
        idempotencyKey
      );

      setSuccess(`Invoice ${res.invoice.invoice_number} generated successfully.`);
      setIsCreateOpen(false);
      setInvoices((prev) => [res.invoice, ...prev]);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to generate invoice.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendInvoice = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await financialsApi.sendInvoice(id);
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? res.invoice : inv)));
      setSuccess('Invoice dispatched and finalized as Sent.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to dispatch invoice.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await financialsApi.markInvoicePaid(id);
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? res.invoice : inv)));
      setSuccess('Invoice marked as Paid.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to mark invoice as paid.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVoidInvoice = async (id: string) => {
    if (!confirm('Are you sure you want to void this invoice? This action is immutable.')) return;
    setActionLoading(id);
    setError(null);
    try {
      const res = await financialsApi.voidInvoice(id);
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? res.invoice : inv)));
      setSuccess('Invoice voided.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to void invoice.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft invoice?')) return;
    setActionLoading(id);
    setError(null);
    try {
      await financialsApi.deleteInvoice(id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      setSuccess('Draft invoice removed.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete invoice.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Draft
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
            Sent
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            Paid
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
            Overdue
          </span>
        );
      case 'void':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Voided
          </span>
        );
      default:
        return null;
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Project Invoicing & Billing</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage client billing cycles, draft invoice sequences, and PDF statements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Create Invoice
            </button>
          )}
          <button
            onClick={loadInvoices}
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

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'draft', 'sent', 'paid', 'overdue', 'void'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
              statusFilter === st
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {st} ({st === 'all' ? invoices.length : invoices.filter((i) => i.status === st).length})
          </button>
        ))}
      </div>

      {/* Invoice List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 overflow-x-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-sm">Fetching invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No invoices found for this project and status.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Invoice #</th>
                  <th className="pb-3 font-semibold">Client</th>
                  <th className="pb-3 font-semibold">Issue Date</th>
                  <th className="pb-3 font-semibold">Due Date</th>
                  <th className="pb-3 font-semibold text-right">Total Amount</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredInvoices.map((inv) => {
                  const isBusy = actionLoading === inv.id;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 font-medium text-slate-900 dark:text-white">
                        {inv.client_name}
                      </td>
                      <td className="py-3 text-slate-500">{inv.issue_date}</td>
                      <td className="py-3 text-slate-500">{inv.due_date}</td>
                      <td className="py-3 text-right font-extrabold text-slate-900 dark:text-white">
                        ${parseFloat(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {inv.currency}
                      </td>
                      <td className="py-3 text-center">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            title="View Details"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={financialsApi.getInvoicePdfUrl(inv.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition inline-flex items-center"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {inv.status === 'draft' && canManage && (
                            <>
                              <button
                                onClick={() => handleSendInvoice(inv.id)}
                                disabled={isBusy}
                                title="Send Invoice"
                                className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 transition"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDraft(inv.id)}
                                disabled={isBusy}
                                title="Delete Draft"
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {(inv.status === 'sent' || inv.status === 'overdue') && canManage && (
                            <>
                              <button
                                onClick={() => handleMarkPaid(inv.id)}
                                disabled={isBusy}
                                title="Mark Paid"
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleVoidInvoice(inv.id)}
                                disabled={isBusy}
                                title="Void Invoice"
                                className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
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

      {/* Create Invoice Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Generate New Invoice</h3>
                <p className="text-xs text-slate-500">Atomic auto-sequence numbering will be allocated</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Acme Corporation"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Client Email
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="billing@acme.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Line Items Editor */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Description..."
                        value={item.description}
                        onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                        className="flex-1 min-w-[180px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-20 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-28 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <div className="w-24 text-right text-xs font-bold text-slate-800 dark:text-slate-200">
                        ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                      </div>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col items-end space-y-1 text-xs">
                <div className="flex justify-between w-48 text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-48 text-slate-600 dark:text-slate-400">
                  <span>Tax ({taxRate}%):</span>
                  <span className="font-semibold">${calculateTax().toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-48 text-sm font-extrabold text-slate-900 dark:text-white pt-1 border-t border-slate-300 dark:border-slate-700">
                  <span>Total:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ${calculateTotal().toFixed(2)} {currency}
                  </span>
                </div>
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
                  disabled={actionLoading === 'create'}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-60 flex items-center gap-1.5"
                >
                  {actionLoading === 'create' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Create Draft Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-400">INVOICE SPECIFICATION</span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {selectedInvoice.invoice_number}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedInvoice.status)}
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">BILLED TO</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedInvoice.client_name}</span>
                {selectedInvoice.client_email && <div className="text-slate-500">{selectedInvoice.client_email}</div>}
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-semibold">DATES</span>
                <div>Issue Date: {selectedInvoice.issue_date}</div>
                <div>Due Date: {selectedInvoice.due_date}</div>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedInvoice.line_items?.map((li, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{li.description}</td>
                      <td className="p-3 text-right text-slate-600 dark:text-slate-400">{li.quantity}</td>
                      <td className="p-3 text-right text-slate-600 dark:text-slate-400">${parseFloat(String(li.unit_price)).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                        ${(parseFloat(String(li.quantity)) * parseFloat(String(li.unit_price))).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <a
                href={financialsApi.getInvoicePdfUrl(selectedInvoice.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>

              <div className="text-right text-xs">
                <div className="text-slate-500">Total Due</div>
                <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  ${parseFloat(selectedInvoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedInvoice.currency}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

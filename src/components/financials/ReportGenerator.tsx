import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  Mail,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileCode,
  FileText,
  Play,
  X,
} from 'lucide-react';
import {
  financialsApi,
  ReportCatalogItem,
  ScheduledReport,
} from '../../api/financials';
import { useAuthStore } from '../../stores/useAuthStore';

interface ReportGeneratorProps {
  projectId: string;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ projectId }) => {
  const { can } = useAuthStore();
  const canReports = can('reports.view');

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);

  // Generated Report Result Modal
  const [previewContent, setPreviewContent] = useState<{
    title: string;
    format: string;
    content: any;
  } | null>(null);

  // New Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [schedType, setSchedType] = useState('budget_vs_actual');
  const [schedTitle, setSchedTitle] = useState('');
  const [schedCron, setSchedCron] = useState('0 9 * * 1');
  const [schedFormat, setSchedFormat] = useState<'pdf' | 'csv' | 'json' | 'markdown'>('pdf');
  const [schedRecipients, setSchedRecipients] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, schedRes] = await Promise.all([
        financialsApi.getReportCatalog(),
        financialsApi.getScheduledReports().catch(() => ({ scheduled_reports: [] })),
      ]);
      setCatalog(catalogRes.reports || []);
      setScheduledReports(schedRes.scheduled_reports || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load report catalog.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInstant = async (reportType: string, format: string) => {
    setGenerating(`${reportType}-${format}`);
    setError(null);
    try {
      const res = await financialsApi.generateReport({
        report_type: reportType,
        parameters: { project_id: projectId },
        format,
      });

      if (format === 'csv') {
        // Trigger direct browser download
        const blob = new Blob([res], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccess('CSV report downloaded successfully.');
      } else {
        setPreviewContent({
          title: `${reportType.replace(/_/g, ' ').toUpperCase()} (${format.toUpperCase()})`,
          format,
          content: res,
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Report generation failed.');
    } finally {
      setGenerating(null);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailList = schedRecipients
      .split(',')
      .map((e) => e.trim())
      .filter((e) => Boolean(e));

    if (emailList.length === 0) {
      setError('At least one recipient email address is required.');
      return;
    }

    try {
      const res = await financialsApi.createScheduledReport({
        report_type: schedType,
        title: schedTitle.trim() || `${schedType} Scheduled Dispatch`,
        schedule: schedCron.trim(),
        recipients: emailList,
        format: schedFormat,
        parameters: { project_id: projectId },
      });

      setSuccess('Scheduled report job configured.');
      setIsScheduleModalOpen(false);
      setScheduledReports((prev) => [res.scheduled_report, ...prev]);
      setSchedTitle('');
      setSchedRecipients('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to schedule report.');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Remove this scheduled report trigger?')) return;
    try {
      await financialsApi.deleteScheduledReport(id);
      setScheduledReports((prev) => prev.filter((s) => s.id !== id));
      setSuccess('Schedule removed.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to remove schedule.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Financial & Governance Reporting Engine</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate auditable statements across 8 catalog templates or schedule recurring automated dispatches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Schedule Report
          </button>
          <button
            onClick={loadData}
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

      {/* 8 Report Catalog Cards */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Report Catalog (Instant Generation)
        </h4>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
            <p className="text-sm">Loading catalog items...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {catalog.map((rep) => (
              <div
                key={rep.type}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {rep.name}
                    </h5>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-3">
                    {rep.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Export Formats
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {rep.formats.map((fmt) => {
                      const isBusy = generating === `${rep.type}-${fmt}`;
                      return (
                        <button
                          key={fmt}
                          onClick={() => handleGenerateInstant(rep.type, fmt)}
                          disabled={Boolean(generating)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 transition flex items-center gap-1 disabled:opacity-50"
                        >
                          {isBusy ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          {fmt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduled Reports Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Scheduled Automated Dispatches
            </h4>
          </div>
          <span className="text-xs text-slate-400">
            {scheduledReports.length} Active Cron Schedules
          </span>
        </div>

        <div className="p-6 overflow-x-auto">
          {scheduledReports.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No scheduled reports configured. Click "Schedule Report" to automate periodic executive dispatches.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 font-semibold">Report Type</th>
                  <th className="pb-3 font-semibold">Cron Schedule</th>
                  <th className="pb-3 font-semibold">Format</th>
                  <th className="pb-3 font-semibold">Recipients</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {scheduledReports.map((sched) => (
                  <tr key={sched.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-bold text-slate-900 dark:text-white">{sched.title}</td>
                    <td className="py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{sched.report_type}</td>
                    <td className="py-3 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{sched.schedule}</td>
                    <td className="py-3 uppercase text-xs font-bold text-slate-500">{sched.format}</td>
                    <td className="py-3 text-xs text-slate-600 dark:text-slate-300">
                      {sched.recipients.join(', ')}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteSchedule(sched.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Result Preview Modal */}
      {previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {previewContent.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewContent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-emerald-400 rounded-b-3xl">
              <pre className="whitespace-pre-wrap">
                {typeof previewContent.content === 'object'
                  ? JSON.stringify(previewContent.content, null, 2)
                  : String(previewContent.content)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Create Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Schedule Recurring Dispatch</h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Report Type
                </label>
                <select
                  value={schedType}
                  onChange={(e) => setSchedType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {catalog.map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Schedule Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="Weekly Executive EVM Digest"
                  value={schedTitle}
                  onChange={(e) => setSchedTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Cron Expression
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0 9 * * 1"
                    value={schedCron}
                    onChange={(e) => setSchedCron(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Default: Mon at 9:00 AM</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Delivery Format
                  </label>
                  <select
                    value={schedFormat}
                    onChange={(e) => setSchedFormat(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="pdf">PDF Statement</option>
                    <option value="csv">CSV Spreadsheet</option>
                    <option value="json">JSON Payload</option>
                    <option value="markdown">Markdown Summary</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Recipients (comma separated emails)
                </label>
                <input
                  type="text"
                  required
                  placeholder="pm@deliverops.com, cfo@company.com"
                  value={schedRecipients}
                  onChange={(e) => setSchedRecipients(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

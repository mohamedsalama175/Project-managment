import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Plus,
  Send,
  CheckCheck,
  XCircle,
  FileText,
  DollarSign,
  AlertTriangle,
  Loader2,
  RefreshCw,
  User,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  resourcesApi,
  TimesheetGridResponse,
  TimesheetTaskRow,
  TimesheetDayCell,
  TimeOffRequest,
} from '../../api/resources';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { ClayButton } from '../common/ClayButton';
import { EmptyState } from '../common/EmptyState';

// Helper: Get ISO Week string YYYY-Www from a date
export function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Helper: Shift ISO week string by N weeks
export function shiftISOWeek(isoWeek: string, deltaWeeks: number): string {
  const [yearStr, weekPart] = isoWeek.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart, 10);
  // Estimate date of that week, then add days
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayNum = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4.getTime() - (dayNum - 1) * 86400000);
  const currentWeekMonday = new Date(mondayWeek1.getTime() + (week - 1) * 7 * 86400000);
  currentWeekMonday.setUTCDate(currentWeekMonday.getUTCDate() + deltaWeeks * 7);
  return getISOWeekString(currentWeekMonday);
}

interface QuickEditState {
  taskId: string;
  taskName: string;
  projectName: string;
  projectId?: string;
  date: string;
  entryId?: string | null;
  hours: number;
  description: string;
  billable: boolean;
  isImmutable: boolean;
  status: string;
  rejectionReason?: string | null;
}

export const TimesheetGrid: React.FC = () => {
  const { user: currentAuthUser } = useAuthStore();
  const { teamMembers, projects } = useProjectStore();

  const [currentWeek, setCurrentWeek] = useState<string>(() => getISOWeekString(new Date()));
  const [selectedUserId, setSelectedUserId] = useState<string>(() => currentAuthUser?.id || '');

  // Keep selectedUserId updated once currentAuthUser loads
  useEffect(() => {
    if (!selectedUserId && currentAuthUser?.id) {
      setSelectedUserId(currentAuthUser.id);
    }
  }, [currentAuthUser?.id, selectedUserId]);

  const [gridData, setGridData] = useState<TimesheetGridResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Time-off overlapping detection
  const [overlappingDays, setOverlappingDays] = useState<string[]>([]);

  // Cell editing modal / popover
  const [editState, setEditState] = useState<QuickEditState | null>(null);
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);

  // Add Task Row Modal
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState<boolean>(false);
  const [selectedProjectIdForAdd, setSelectedProjectIdForAdd] = useState<string>('');
  const [selectedTaskIdForAdd, setSelectedTaskIdForAdd] = useState<string>('');

  // Bulk Actions
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [bulkRejectReason, setBulkRejectReason] = useState<string>('');
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);

  // Fetch timesheet grid
  const loadTimesheet = useCallback(async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await resourcesApi.getTimesheetGrid(selectedUserId, currentWeek);
      setGridData(res);
      setSelectedEntryIds([]);

      // Check for overlapping time-off in this week
      try {
        const timeOffRes = await resourcesApi.getTimeOffRequests('approved', selectedUserId);
        const approvedOff = timeOffRes.data || [];
        const overlaps: string[] = [];
        res.days_meta.forEach((d) => {
          const hasTimeOff = approvedOff.some(
            (req) => req.start_date <= d.date && req.end_date >= d.date
          );
          if (hasTimeOff) {
            // Check if any hours are logged on this day
            const hasHoursLogged = res.tasks.some(
              (t) => (t.days[d.date]?.hours || 0) > 0
            );
            if (hasHoursLogged) {
              overlaps.push(d.date);
            }
          }
        });
        setOverlappingDays(overlaps);
      } catch {
        // Non-fatal
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load timesheet grid');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, currentWeek]);

  useEffect(() => {
    loadTimesheet();
  }, [loadTimesheet]);

  // Collect all draft and rejected entry IDs for "Submit Week"
  const draftAndRejectedEntryIds = useMemo(() => {
    if (!gridData) return [];
    const ids: string[] = [];
    gridData.tasks.forEach((t) => {
      Object.values(t.days).forEach((cell) => {
        if (cell.entry_id && (cell.status === 'draft' || cell.status === 'rejected')) {
          ids.push(cell.entry_id);
        }
      });
    });
    return ids;
  }, [gridData]);

  // Collect all submitted entry IDs for Manager Approvals
  const submittedEntryIds = useMemo(() => {
    if (!gridData) return [];
    const ids: string[] = [];
    gridData.tasks.forEach((t) => {
      Object.values(t.days).forEach((cell) => {
        if (cell.entry_id && cell.status === 'submitted') {
          ids.push(cell.entry_id);
        }
      });
    });
    return ids;
  }, [gridData]);

  // Handle cell click / open quick edit
  const handleCellClick = (
    task: TimesheetTaskRow,
    date: string,
    cell: TimesheetDayCell
  ) => {
    setEditState({
      taskId: task.task_id,
      taskName: task.task_name,
      projectName: task.project_name || 'Project',
      projectId: task.project_id,
      date,
      entryId: cell.entry_id,
      hours: cell.hours || 0,
      description: '',
      billable: cell.billable ?? false,
      isImmutable: cell.status === 'approved',
      status: cell.status,
      rejectionReason: cell.rejection_reason,
    });
  };

  // Save or Update Entry
  const handleSaveCell = async () => {
    if (!editState) return;
    setIsSavingCell(true);
    setError(null);
    try {
      // Must round to nearest 15 mins (0.25)
      const roundedHours = Math.round(editState.hours * 4) / 4;

      if (editState.entryId) {
        if (roundedHours <= 0) {
          // Delete entry
          await resourcesApi.deleteTimeEntry(editState.entryId);
        } else {
          // Update entry
          await resourcesApi.updateTimeEntry(editState.entryId, {
            hours: roundedHours,
            description: editState.description,
            billable: editState.billable,
          });
        }
      } else if (roundedHours > 0) {
        // Create entry
        await resourcesApi.createTimeEntry(editState.taskId, {
          date: editState.date,
          hours: roundedHours,
          description: editState.description,
          billable: editState.billable,
          task_name: editState.taskName,
          project_id: editState.projectId,
          project_name: editState.projectName,
        });
      }

      setEditState(null);
      await loadTimesheet();
      setSuccessMsg('Timesheet entry updated.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save timesheet entry.');
    } finally {
      setIsSavingCell(false);
    }
  };

  // Submit Week
  const handleSubmitWeek = async () => {
    if (draftAndRejectedEntryIds.length === 0) return;
    setIsProcessingBulk(true);
    setError(null);
    try {
      const res = await resourcesApi.submitTimesheet(draftAndRejectedEntryIds);
      setSuccessMsg(`Submitted ${res.submitted_count} entries for approval.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadTimesheet();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit timesheet.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    const ids = selectedEntryIds.length > 0 ? selectedEntryIds : submittedEntryIds;
    if (ids.length === 0) return;
    setIsProcessingBulk(true);
    setError(null);
    try {
      const res = await resourcesApi.bulkApproveTimesheets(ids);
      if (res.failed_count > 0 && res.reason_summary.self_approval_prohibited > 0) {
        setError(
          `Approved ${res.approved_count} entries. Note: ${res.reason_summary.self_approval_prohibited} entries were skipped due to self-approval prohibition.`
        );
      } else {
        setSuccessMsg(`Approved ${res.approved_count} timesheet entries.`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
      setSelectedEntryIds([]);
      await loadTimesheet();
    } catch (err: any) {
      setError(err?.message || 'Failed to bulk-approve timesheets.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Bulk Reject
  const handleBulkReject = async () => {
    const ids = selectedEntryIds.length > 0 ? selectedEntryIds : submittedEntryIds;
    if (ids.length === 0 || !bulkRejectReason.trim()) return;
    setIsProcessingBulk(true);
    setError(null);
    try {
      const res = await resourcesApi.bulkRejectTimesheets(ids, bulkRejectReason.trim());
      setSuccessMsg(`Rejected ${res.rejected_count} timesheet entries.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setIsRejectModalOpen(false);
      setBulkRejectReason('');
      setSelectedEntryIds([]);
      await loadTimesheet();
    } catch (err: any) {
      setError(err?.message || 'Failed to bulk-reject timesheets.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Add Task Row to view
  const handleAddTaskRow = () => {
    if (!selectedTaskIdForAdd) return;
    // Set cell edit for Monday of this week so user can start logging
    const targetProject = projects.find((p) => p.id === selectedProjectIdForAdd);
    const targetTask = targetProject?.tasks.find((t) => t.id === selectedTaskIdForAdd);
    if (targetTask && gridData) {
      setEditState({
        taskId: targetTask.id,
        taskName: targetTask.name,
        projectName: targetProject?.name || 'Project',
        projectId: targetProject?.id,
        date: gridData.start_date,
        hours: 1.0,
        description: '',
        billable: false,
        isImmutable: false,
        status: 'draft',
      });
    }
    setIsAddTaskModalOpen(false);
    setSelectedTaskIdForAdd('');
  };

  // Filter tasks for Add Task Modal
  const availableTasksForAdd = useMemo(() => {
    if (!selectedProjectIdForAdd) return [];
    const proj = projects.find((p) => p.id === selectedProjectIdForAdd);
    return proj?.tasks || [];
  }, [projects, selectedProjectIdForAdd]);

  // Capacity calculations
  const weeklyCapacity = gridData?.user.weekly_capacity_hours || 40.0;
  const totalHours = gridData?.summary.total_hours || 0.0;
  const billableHours = gridData?.summary.billable_hours || 0.0;
  const nonBillableHours = gridData?.summary.non_billable_hours || 0.0;
  const billablePercent = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
  const capacityPercent = Math.min(Math.round((totalHours / weeklyCapacity) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Top Header: Controls & Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Week Navigator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 rounded-2xl p-1 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <button
              onClick={() => setCurrentWeek((w) => shiftISOWeek(w, -1))}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>{currentWeek}</span>
              {gridData && (
                <span className="text-[11px] font-normal text-slate-400">
                  ({gridData.start_date} → {gridData.end_date})
                </span>
              )}
            </div>
            <button
              onClick={() => setCurrentWeek((w) => shiftISOWeek(w, 1))}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <ClayButton
            variant="ghost"
            size="sm"
            onClick={() => setCurrentWeek(getISOWeekString(new Date()))}
            className="text-xs"
          >
            Today
          </ClayButton>

          <button
            onClick={loadTimesheet}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Refresh Timesheet"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Member Selector & Add Task */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 border-none outline-none focus:ring-0 cursor-pointer"
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id} className="dark:bg-slate-900">
                  {m.name} {m.id === currentAuthUser?.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          <ClayButton
            variant="primary"
            size="sm"
            onClick={() => setIsAddTaskModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task Row
          </ClayButton>
        </div>
      </div>

      {/* Overlapping Warning Alert */}
      {overlappingDays.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-700 dark:text-amber-400 text-xs font-semibold animate-in fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-2">
              <span>TIME_OFF_OVERLAPS_TIMESHEET Notice</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px]">Warning</span>
            </div>
            <p>
              Hours have been logged on date(s) with approved time-off: {overlappingDays.join(', ')}. Please verify if this was intended.
            </p>
          </div>
        </div>
      )}

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-bold">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards: Hours & Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Hours */}
        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Total Logged</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalHours.toFixed(2)}h
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Target: {weeklyCapacity.toFixed(0)}h</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{capacityPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>

        {/* Billable Hours */}
        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Billable Hours</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {billableHours.toFixed(2)}h
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Non-Billable: {nonBillableHours.toFixed(2)}h</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{billablePercent}% Rate</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${billablePercent}%` }}
            />
          </div>
        </div>

        {/* Submission & Approvals */}
        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Workflow Queue</span>
            <Send className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {draftAndRejectedEntryIds.length}
            </span>
            <span className="text-xs text-slate-400">draft/rejected entries</span>
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
            {submittedEntryIds.length} awaiting approval
          </div>
        </div>

        {/* Fast Actions Bar */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Week Completion
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              Lock in your draft hours for approval
            </div>
          </div>
          <ClayButton
            variant="primary"
            size="sm"
            onClick={handleSubmitWeek}
            disabled={isProcessingBulk || draftAndRejectedEntryIds.length === 0}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold mt-2"
          >
            {isProcessingBulk ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Submit Week ({draftAndRejectedEntryIds.length})
          </ClayButton>
        </div>
      </div>

      {/* Manager Approvals Toolbar (Surfaces when submitted entries exist) */}
      {submittedEntryIds.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                Manager Review Mode
              </div>
              <div className="text-[11px] text-indigo-700 dark:text-indigo-400">
                {selectedEntryIds.length > 0
                  ? `${selectedEntryIds.length} entries selected`
                  : `${submittedEntryIds.length} entries submitted for this week`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ClayButton
              variant="default"
              size="sm"
              onClick={() => {
                if (selectedEntryIds.length === submittedEntryIds.length) {
                  setSelectedEntryIds([]);
                } else {
                  setSelectedEntryIds(submittedEntryIds);
                }
              }}
              className="text-xs"
            >
              {selectedEntryIds.length === submittedEntryIds.length ? 'Deselect All' : 'Select All Submitted'}
            </ClayButton>

            <ClayButton
              variant="primary"
              size="sm"
              onClick={handleBulkApprove}
              disabled={isProcessingBulk}
              className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Approve {selectedEntryIds.length > 0 ? `(${selectedEntryIds.length})` : 'All'}
            </ClayButton>

            <ClayButton
              variant="default"
              size="sm"
              onClick={() => setIsRejectModalOpen(true)}
              disabled={isProcessingBulk}
              className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject {selectedEntryIds.length > 0 ? `(${selectedEntryIds.length})` : 'All'}
            </ClayButton>
          </div>
        </div>
      )}

      {/* Main Timesheet Grid Table */}
      <div className="rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <span className="text-xs font-semibold">Loading weekly timesheet...</span>
          </div>
        ) : !gridData || gridData.tasks.length === 0 ? (
          <div className="py-16 px-4">
            <EmptyState
              icon={<Clock className="w-8 h-8 text-emerald-500" />}
              title="No Logged Time for This Week"
              description="Click 'Add Task Row' above to select a project task and log hours in 15-minute increments."
              primaryAction={{
                label: 'Add Task Row',
                onClick: () => setIsAddTaskModalOpen(true),
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 min-w-[260px]">Task & Project</th>
                  {gridData.days_meta.map((day) => {
                    const isToday = day.date === new Date().toISOString().split('T')[0];
                    return (
                      <th
                        key={day.date}
                        className={`py-3.5 px-3 text-center min-w-[90px] ${
                          day.is_weekend ? 'bg-slate-100/50 dark:bg-slate-800/60 text-slate-400' : ''
                        } ${isToday ? 'text-emerald-600 dark:text-emerald-400 font-black' : ''}`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{day.day_name}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-normal">
                            {day.date.slice(5)}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-3.5 px-4 text-center min-w-[90px]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {gridData.tasks.map((task) => (
                  <tr
                    key={task.task_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Task & Project Name */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{task.task_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          {task.project_code && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                              {task.project_code}
                            </span>
                          )}
                          <span>{task.project_name || 'Project'}</span>
                        </div>
                      </div>
                    </td>

                    {/* 7 Days of the Week */}
                    {gridData.days_meta.map((day) => {
                      const cell = task.days[day.date] || {
                        hours: 0,
                        billable: false,
                        status: 'none',
                      };
                      const hasHours = cell.hours > 0;
                      const isSubmitted = cell.status === 'submitted';
                      const isApproved = cell.status === 'approved';
                      const isRejected = cell.status === 'rejected';
                      const isDraft = cell.status === 'draft';

                      return (
                        <td
                          key={day.date}
                          className={`py-2 px-2 text-center align-middle ${
                            day.is_weekend ? 'bg-slate-50/40 dark:bg-slate-800/20' : ''
                          }`}
                        >
                          <button
                            onClick={() => handleCellClick(task, day.date, cell)}
                            className={`w-full py-2 px-1.5 rounded-xl text-center font-bold transition-all relative group flex flex-col items-center justify-center gap-0.5 ${
                              isApproved
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : isSubmitted
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                                : isRejected
                                ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30'
                                : hasHours
                                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                                : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-500'
                            }`}
                          >
                            <span className="text-xs">
                              {hasHours ? `${cell.hours.toFixed(2)}h` : '—'}
                            </span>

                            {/* Status Icon / Tag */}
                            {isApproved && (
                              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <Lock className="w-2.5 h-2.5" />
                                Locked
                              </span>
                            )}
                            {isSubmitted && (
                              <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400">
                                Submitted
                              </span>
                            )}
                            {isRejected && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-600 dark:text-red-400">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Rejected
                              </span>
                            )}
                            {isDraft && hasHours && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                                Draft
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}

                    {/* Row Total */}
                    <td className="py-3 px-4 text-center font-black text-slate-900 dark:text-white">
                      {task.total_hours.toFixed(2)}h
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Bottom Daily Totals Footer */}
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 font-black text-xs text-slate-800 dark:text-slate-100">
                  <td className="py-3.5 px-4">Daily Total Hours</td>
                  {gridData.days_meta.map((day) => {
                    const dayTotal = gridData.tasks.reduce(
                      (acc, t) => acc + (t.days[day.date]?.hours || 0),
                      0
                    );
                    const isOver = dayTotal > 8.0;
                    return (
                      <td
                        key={day.date}
                        className={`py-3.5 px-3 text-center ${
                          isOver ? 'text-amber-600 dark:text-amber-400' : ''
                        }`}
                      >
                        {dayTotal > 0 ? `${dayTotal.toFixed(2)}h` : '0h'}
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-4 text-center text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {totalHours.toFixed(2)}h
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Quick Cell Entry Modal / Popover */}
      {editState && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {editState.projectName} • {editState.date}
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {editState.taskName}
                </div>
              </div>
              <button
                onClick={() => setEditState(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* If cell is approved and immutable */}
            {editState.isImmutable ? (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>This entry has been approved and is immutable. Hours cannot be altered.</span>
              </div>
            ) : null}

            {/* If cell was rejected, show rejection reason */}
            {editState.status === 'rejected' && editState.rejectionReason && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span>Rejection Reason:</span>
                </div>
                <p>{editState.rejectionReason}</p>
              </div>
            )}

            {/* Hours Input with 15-minute quick chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Hours (15-Minute Increments)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  disabled={editState.isImmutable}
                  value={editState.hours}
                  onChange={(e) =>
                    setEditState({
                      ...editState,
                      hours: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full text-base font-black px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-400">hours</span>
              </div>

              {!editState.isImmutable && (
                <div className="flex items-center gap-1.5 pt-1">
                  {[0.5, 1.0, 2.0, 4.0, 8.0].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setEditState({ ...editState, hours: h })}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-all"
                    >
                      {h}h
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditState({ ...editState, hours: 0 })}
                    className="px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/30 text-[11px] font-bold text-red-600 hover:bg-red-100 transition-all"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Billable Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="billable_check"
                disabled={editState.isImmutable}
                checked={editState.billable}
                onChange={(e) =>
                  setEditState({ ...editState, billable: e.target.checked })
                }
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label
                htmlFor="billable_check"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Mark as Billable Hours
              </label>
            </div>

            {/* Description Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Work Notes / Summary (Optional)
              </label>
              <textarea
                rows={2}
                disabled={editState.isImmutable}
                value={editState.description}
                onChange={(e) =>
                  setEditState({ ...editState, description: e.target.value })
                }
                placeholder="What did you work on?"
                className="w-full text-xs p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <ClayButton
                variant="default"
                size="sm"
                onClick={() => setEditState(null)}
              >
                Cancel
              </ClayButton>
              {!editState.isImmutable && (
                <ClayButton
                  variant="primary"
                  size="sm"
                  onClick={handleSaveCell}
                  disabled={isSavingCell}
                  className="flex items-center gap-1.5"
                >
                  {isSavingCell && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Entry
                </ClayButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Task Row Modal */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Add Task to Timesheet</span>
              </div>
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Select Project */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Project
                </label>
                <select
                  value={selectedProjectIdForAdd}
                  onChange={(e) => {
                    setSelectedProjectIdForAdd(e.target.value);
                    setSelectedTaskIdForAdd('');
                  }}
                  className="w-full text-xs p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose a Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || 'PRJ'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Task */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Task
                </label>
                <select
                  value={selectedTaskIdForAdd}
                  disabled={!selectedProjectIdForAdd}
                  onChange={(e) => setSelectedTaskIdForAdd(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose a Task --</option>
                  {availableTasksForAdd.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <ClayButton
                variant="default"
                size="sm"
                onClick={() => setIsAddTaskModalOpen(false)}
              >
                Cancel
              </ClayButton>
              <ClayButton
                variant="primary"
                size="sm"
                disabled={!selectedTaskIdForAdd}
                onClick={handleAddTaskRow}
              >
                Add to Timesheet
              </ClayButton>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Prompt Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>Reject Timesheet Entries</span>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Please specify the reason for rejecting these timesheet entries. The submitter will be able to review this reason and re-submit.
            </p>

            <textarea
              rows={3}
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              placeholder="e.g. Hours exceed project budget, please adjust..."
              className="w-full text-xs p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <ClayButton
                variant="default"
                size="sm"
                onClick={() => setIsRejectModalOpen(false)}
              >
                Cancel
              </ClayButton>
              <ClayButton
                variant="danger"
                size="sm"
                disabled={!bulkRejectReason.trim() || isProcessingBulk}
                onClick={handleBulkReject}
                className="bg-red-600 hover:bg-red-700 text-white border-none"
              >
                {isProcessingBulk && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                Confirm Rejection
              </ClayButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

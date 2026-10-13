import React, { useState } from 'react';
import {
  X,
  User,
  Clock,
  Calendar,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  FileCheck,
  Send,
  Trash2,
  History,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  Plus,
  Users,
} from 'lucide-react';
import {
  Task,
  TaskStatus,
  TaskPriority,
  ReviewStatus,
  TaskEffortAllocation,
} from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { ClayButton } from '../common/ClayButton';
import { getTodayUTC, diffCalendarDays } from '../../utils/dateUtils';
import { isTaskEntirelyNonWorkingDays } from '../../utils/capacityUtils';

interface TaskDetailDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const {
    projects,
    activeProjectId,
    teamMembers,
    updateTask,
    reviewTask,
    reassignTask,
    taskComments,
    addTaskComment,
    deleteTaskComment,
    auditLogs,
    activePersonaId,
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
  const [commentText, setCommentText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Review Reject Form
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectPct, setRejectPct] = useState(90);

  // Blocker Reason Prompt
  const [isBlockerPromptOpen, setIsBlockerPromptOpen] = useState(false);
  const [blockerReasonInput, setBlockerReasonInput] = useState('');

  if (!isOpen || !task) return null;

  const project = projects.find((p) => p.id === activeProjectId) || projects[0];
  const comments = taskComments[task.id] || [];
  const taskAudits = auditLogs.filter((a) => a.taskId === task.id);

  const primaryOwner = (teamMembers || []).find((m) => m.id === task.primaryOwnerId);
  const reviewer = (teamMembers || []).find((m) => m.id === task.reviewerId);
  const isWeekendSchedule = project?.config?.weekendDays ? isTaskEntirelyNonWorkingDays(task, project.config.weekendDays) : false;

  // Total allocated effort calculation
  const totalAllocated =
    (task.primaryOwnerHours || 0) +
    (task.contributorAllocations || []).reduce((sum, c) => sum + (c.allocatedHours || 0), 0);

  const unallocatedBalance =
    task.estimatedHours !== null && task.estimatedHours !== undefined
      ? task.estimatedHours - totalAllocated
      : null;

  const handleStatusChange = (newStatus: TaskStatus) => {
    setValidationError(null);

    // Invariant TC-1.2: Blocker validation
    if (newStatus === 'Blocked') {
      if (!task.blockReason && !project.risks?.some((r) => r.linkedTaskIds.includes(task.id))) {
        setIsBlockerPromptOpen(true);
        return;
      }
    }

    // In Review requires reviewerId
    if (newStatus === 'In Review') {
      if (!task.reviewerId) {
        setValidationError('A sign-off reviewer must be assigned before submitting task for review.');
        return;
      }
    }

    let nextPct = task.pct;
    if (newStatus === 'Not Started') nextPct = 0;
    if (newStatus === 'Completed') nextPct = 100;
    if (newStatus === 'In Progress' && nextPct === 100) nextPct = 95;

    updateTask(task.id, {
      status: newStatus,
      pct: nextPct,
      reviewStatus: newStatus === 'In Review' ? 'pending_review' : task.reviewStatus,
    });
  };

  const handleConfirmBlocker = () => {
    if (!blockerReasonInput.trim()) {
      setValidationError('A non-empty blocker reason is mandatory.');
      return;
    }
    updateTask(task.id, {
      status: 'Blocked',
      blockReason: blockerReasonInput.trim(),
    });
    setIsBlockerPromptOpen(false);
    setBlockerReasonInput('');
    setValidationError(null);
  };

  const handleApproveReview = () => {
    reviewTask(task.id, 'approved', 'Approved sign-off.');
  };

  const handleRejectReview = () => {
    if (!rejectNote.trim()) {
      setValidationError('A feedback note explaining required changes is mandatory.');
      return;
    }
    reviewTask(task.id, 'changes_requested', rejectNote.trim(), Math.min(95, Math.max(0, rejectPct)));
    setIsRejecting(false);
    setRejectNote('');
    setValidationError(null);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addTaskComment(task.id, commentText);
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-full bg-[#f8fafc] dark:bg-[#11161b] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
              {project.code}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Task Details & Workflow
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Title & Status Bar */}
        <div className="p-6 pb-4 bg-white dark:bg-slate-900/30 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">{task.category}</span>
              {task.isMilestone && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Milestone
                </span>
              )}
              {isWeekendSchedule && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                  ⚠️ Overtime (Weekend)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-500">Status:</label>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
            {task.name}
          </h2>

          {/* Validation Notice */}
          {validationError && (
            <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Blocker Callout if status is Blocked */}
          {task.status === 'Blocked' && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertOctagon className="w-4 h-4 text-red-500" />
                <span>Task is Blocked</span>
              </div>
              <p className="text-[11px]">{task.blockReason || 'Waiting for linked risk resolution.'}</p>
            </div>
          )}

          {/* In Review Sign-off Banner */}
          {task.status === 'In Review' && (
            <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4" /> Pending Sign-Off by Reviewer
                </span>
                <span className="text-[10px] text-slate-500">
                  {reviewer ? reviewer.name : 'No reviewer assigned'}
                </span>
              </div>

              {!isRejecting ? (
                <div className="flex items-center gap-2 pt-1">
                  <ClayButton
                    size="sm"
                    variant="primary"
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={handleApproveReview}
                  >
                    Approve Task (100%)
                  </ClayButton>
                  <ClayButton
                    size="sm"
                    variant="default"
                    onClick={() => setIsRejecting(true)}
                  >
                    Request Changes
                  </ClayButton>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-500/30 space-y-2 mt-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Changes Feedback & Capped Progress (TC-1.3)
                  </span>
                  <textarea
                    rows={2}
                    placeholder="State exact changes required before re-submitting..."
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span>Remaining Progress:</span>
                      <input
                        type="number"
                        min={0}
                        max={95}
                        value={rejectPct}
                        onChange={(e) => setRejectPct(Number(e.target.value))}
                        className="w-14 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-center text-xs"
                      />
                      <span>%</span>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsRejecting(false)}
                        className="px-2 py-1 text-xs text-slate-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleRejectReview}
                        className="px-3 py-1 bg-red-600 text-white font-bold text-xs rounded-lg"
                      >
                        Send Feedback
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-1 border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Task Information
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>Discussion</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
                {comments.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-1 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>Audit Trail</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800">
                {taskAudits.length}
              </span>
            </button>
          </div>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Ownership & Accountability */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Accountability & Effort
                  </span>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>

                {/* Primary Accountable Owner */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Primary Accountable Owner
                  </label>
                  <select
                    value={task.primaryOwnerId || ''}
                    onChange={(e) => reassignTask(task.id, e.target.value || null, 'Reassigned via Task Drawer')}
                    className="w-full text-xs font-semibold p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Unassigned</option>
                    {(teamMembers || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantitative Hours Allocation (Option C) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Total Estimated Hours
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 40"
                      value={task.estimatedHours ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
                        updateTask(task.id, { estimatedHours: val });
                      }}
                      className="w-full text-xs font-mono font-bold p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Primary Owner Hours
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Personal hours"
                      value={task.primaryOwnerHours ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
                        updateTask(task.id, { primaryOwnerHours: val });
                      }}
                      className="w-full text-xs font-mono font-bold p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Unallocated balance indicator */}
                {task.estimatedHours !== null && task.estimatedHours !== undefined && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-medium flex items-center justify-between ${
                      (unallocatedBalance || 0) < 0
                        ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>
                      {task.estimatedHours}h estimated: {totalAllocated}h assigned
                    </span>
                    <span className="font-bold font-mono">
                      {(unallocatedBalance || 0) < 0
                        ? `⚠️ Exceeded by ${Math.abs(unallocatedBalance!)}h`
                        : `${unallocatedBalance}h unallocated`}
                    </span>
                  </div>
                )}

                {/* Reviewer */}
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Sign-Off Reviewer (Quality Gate)
                  </label>
                  <select
                    value={task.reviewerId || ''}
                    onChange={(e) => updateTask(task.id, { reviewerId: e.target.value || null })}
                    className="w-full text-xs font-semibold p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">No reviewer required</option>
                    {(teamMembers || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.systemRole.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Schedule & Dates */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
                  Schedule & Dates
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={task.start}
                      onChange={(e) => updateTask(task.id, { start: e.target.value })}
                      className="w-full text-xs font-semibold p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={task.end}
                      onChange={(e) => updateTask(task.id, { end: e.target.value })}
                      className="w-full text-xs font-semibold p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                  <span>Duration: <strong className="text-slate-700 dark:text-slate-200">{diffCalendarDays(task.start, task.end) + 1} days</strong></span>
                  {task.baselineStart && (
                    <span>Baseline: {task.baselineStart} → {task.baselineEnd}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Discussion Tab (Comments Feed) */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <form onSubmit={handleAddComment} className="space-y-2">
                <textarea
                  rows={3}
                  placeholder="Add an internal note or update about this task..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-inner"
                />
                <div className="flex justify-end">
                  <ClayButton
                    size="sm"
                    variant="primary"
                    type="submit"
                    icon={<Send className="w-3.5 h-3.5" />}
                    disabled={!commentText.trim()}
                  >
                    Post Comment
                  </ClayButton>
                </div>
              </form>

              <div className="space-y-3 pt-2">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No comments yet. Start the conversation!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                          {c.authorAvatar ? (
                            <img
                              src={c.authorAvatar}
                              alt={c.authorName}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          ) : (
                            <span className="w-4 h-4 rounded-full bg-slate-700 text-[8px] font-bold text-white flex items-center justify-center">
                              {c.authorName.substring(0, 1)}
                            </span>
                          )}
                          <span>{c.authorName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => deleteTaskComment(c.id, task.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Audit Trail Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {taskAudits.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No audit log entries recorded for this task.
                </div>
              ) : (
                taskAudits.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{a.actorName} ({a.actorRole})</span>
                      <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="font-semibold text-slate-700 dark:text-slate-200 capitalize">
                      {a.action.replace(/_/g, ' ')}
                    </div>
                    {a.reason && (
                      <div className="text-[10px] text-slate-500 italic">
                        Reason: {a.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Blocker Reason Mandatory Prompt Modal */}
        {isBlockerPromptOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="clay-card w-full max-w-md p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-red-600 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" />
                <span>Mandatory Blocker Reason (TC-1.2)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                To move this task to "Blocked", please specify the operational cause stopping progress:
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Waiting for hardware vendor delivery..."
                value={blockerReasonInput}
                onChange={(e) => setBlockerReasonInput(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              />
              <div className="flex justify-end gap-2">
                <ClayButton
                  size="sm"
                  variant="default"
                  onClick={() => setIsBlockerPromptOpen(false)}
                >
                  Cancel
                </ClayButton>
                <ClayButton
                  size="sm"
                  variant="primary"
                  onClick={handleConfirmBlocker}
                >
                  Confirm Blocked State
                </ClayButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

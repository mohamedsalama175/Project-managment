import React, { useState, useRef, useEffect } from 'react';
import {
  GripVertical,
  Trash2,
  Diamond,
  Link2,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  User,
  ArrowRight,
  Flame,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority, CategoryDef, DurationMode } from '../../types';
import { useProjectStore } from '../../stores/useProjectStore';
import { calculateDuration } from '../../utils/dateUtils';
import { AssigneeCombobox } from '../team/AssigneeCombobox';

interface WBSRowProps {
  task: Task;
  index: number;
  rowHeight: number;
  categories: CategoryDef[];
  allTasks: Task[];
  durationMode: DurationMode;
  weekendDays: number[];
  isCritical: boolean;
  isSorted?: boolean;
  isRowHovered?: boolean;
  onRowHover?: (taskId: string | null) => void;
  onHoverPred?: (predId: string | null) => void;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  onOpenDetails?: (task: Task) => void;
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  return `${day} ${monthNames[monthIdx] || parts[1]}`;
}

export const WBSRow: React.FC<WBSRowProps> = ({
  task,
  index,
  rowHeight = 40,
  categories,
  allTasks,
  durationMode,
  weekendDays,
  isCritical,
  isSorted = false,
  isRowHovered = false,
  onRowHover,
  onHoverPred,
  onDragStart,
  onDragOver,
  onDrop,
  onOpenDetails,
}) => {
  const { updateTask, deleteTask, teamMembers, reassignTask } = useProjectStore();

  const [isPredOpen, setIsPredOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEffortOpen, setIsEffortOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const duration = calculateDuration(task.start, task.end, durationMode, weekendDays);

  const primaryOwner = teamMembers.find((m) => m.id === task.primaryOwnerId);

  // Short Owner Name formatting (e.g. Sara N.)
  const shortOwnerName = React.useMemo(() => {
    if (!primaryOwner) {
      if (task.assignee && task.assignee !== 'Unassigned') {
        const parts = task.assignee.split(' ');
        if (parts.length > 1) {
          return `${parts[0]} ${parts[1][0]}.`;
        }
        return task.assignee;
      }
      return 'Unassigned';
    }
    const parts = primaryOwner.name.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return primaryOwner.name;
  }, [primaryOwner, task.assignee]);

  const ownerRole = primaryOwner?.jobTitle || (task.assignee && task.assignee !== 'Unassigned' ? 'Member' : '');

  // Predecessor index mapping
  const predIndices = React.useMemo(() => {
    if (!task.dependsOn || task.dependsOn.length === 0) return [];
    return task.dependsOn
      .map((predId) => {
        const found = allTasks.find((t) => t.id === predId);
        return found ? `#${found.order ?? (allTasks.indexOf(found) + 1)}` : null;
      })
      .filter(Boolean);
  }, [task.dependsOn, allTasks]);

  const togglePredecessor = (predId: string) => {
    const current = task.dependsOn || [];
    const next = current.includes(predId)
      ? current.filter((id) => id !== predId)
      : [...current, predId];
    updateTask(task.id, { dependsOn: next });
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    const updates: Partial<Task> = { status: newStatus };
    if (newStatus === 'Completed') updates.pct = 100;
    else if (newStatus === 'Not Started') updates.pct = 0;
    else if (task.pct === 0 && newStatus === 'In Progress') updates.pct = 25;
    updateTask(task.id, updates);
    setIsStatusOpen(false);
  };

  // Circular SVG progress ring calculation
  const radius = 6.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (task.pct / 100) * circumference;
  const progressRingColor =
    task.pct === 100
      ? '#10b981'
      : task.status === 'Blocked'
      ? '#ef4444'
      : task.status === 'In Progress'
      ? '#3b82f6'
      : task.status === 'In Review'
      ? '#a855f7'
      : '#94a3b8';

  // Priority semantic pill styling
  const priorityMeta: Record<
    TaskPriority,
    { label: string; bg: string; text: string; dot: string }
  > = {
    Urgent: {
      label: 'Urgent',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
      text: 'text-rose-700 dark:text-rose-300 font-bold',
      dot: 'bg-rose-500',
    },
    High: {
      label: 'High',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
      text: 'text-indigo-700 dark:text-indigo-300 font-semibold',
      dot: 'bg-indigo-500',
    },
    Medium: {
      label: 'Med',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300 font-medium',
      dot: 'bg-amber-500',
    },
    Low: {
      label: 'Low',
      bg: 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700',
      text: 'text-slate-600 dark:text-slate-400 font-normal',
      dot: 'bg-slate-400',
    },
  };

  const priorityStyle = priorityMeta[task.priority || 'Medium'] || priorityMeta.Medium;

  return (
    <div
      draggable={!isSorted}
      onDragStart={(e) => !isSorted && onDragStart && onDragStart(e, index)}
      onDragOver={(e) => !isSorted && onDragOver && onDragOver(e, index)}
      onDrop={(e) => !isSorted && onDrop && onDrop(e, index)}
      onMouseEnter={() => onRowHover?.(task.id)}
      onMouseLeave={() => onRowHover?.(null)}
      style={{ height: `${rowHeight}px` }}
      className={`group relative flex items-center text-xs border-b border-slate-200/70 dark:border-slate-800/80 transition-colors select-none ${
        isRowHovered
          ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
          : index % 2 === 0
          ? 'bg-white dark:bg-[#121820]'
          : 'bg-slate-50/50 dark:bg-[#141b24]'
      } ${isCritical ? 'border-l-2 border-l-amber-500' : ''}`}
    >
      {/* 1. # (w-10, sticky left): Row number at rest; transforms into drag-handle + checkbox on row hover */}
      <div
        style={{ width: '40px' }}
        className={`sticky left-0 z-10 h-full flex items-center justify-center shrink-0 border-r border-slate-200/50 dark:border-slate-800/50 transition-colors ${
          isRowHovered
            ? 'bg-emerald-50 dark:bg-emerald-950'
            : index % 2 === 0
            ? 'bg-white dark:bg-[#121820]'
            : 'bg-slate-50 dark:bg-[#141b24]'
        }`}
      >
        {/* At rest: tabular number */}
        <span className="font-mono text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums group-hover:hidden">
          {task.order ?? index + 1}
        </span>

        {/* On hover: Drag Handle or Checkbox */}
        <div className="hidden group-hover:flex items-center justify-center gap-0.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => setIsSelected(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
            title="Select row"
          />
          <div
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title={isSorted ? 'Clear sorting to drag' : 'Drag to reorder row'}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* 2. Task / Deliverable (min-w-[220px] max-w-[320px] flex-1, sticky left) */}
      <div
        style={{ left: '40px' }}
        className={`sticky z-10 h-full min-w-[220px] max-w-[320px] flex-1 px-2.5 flex items-center gap-1.5 border-r border-slate-200/50 dark:border-slate-800/50 transition-colors overflow-hidden ${
          isRowHovered
            ? 'bg-emerald-50 dark:bg-emerald-950'
            : index % 2 === 0
            ? 'bg-white dark:bg-[#121820]'
            : 'bg-slate-50 dark:bg-[#141b24]'
        }`}
      >
        {task.isMilestone && (
          <span title="Milestone deliverable">
            <Diamond className="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500/20" />
          </span>
        )}

        <input
          type="text"
          value={task.name}
          onChange={(e) => updateTask(task.id, { name: e.target.value })}
          title={task.name}
          placeholder="Deliverable name..."
          aria-label="Deliverable name"
          className="w-full bg-transparent border border-transparent rounded px-1.5 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-100 truncate hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
        />
      </div>

      {/* 3. Category (w-36 min-w-[130px]): Clean subtle badge without select chevron until hovered */}
      <div className="w-36 min-w-[130px] px-2 flex items-center shrink-0 relative">
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="w-full px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 truncate text-left flex items-center justify-between transition-colors group/cat"
            title={`Category: ${task.category}`}
          >
            <span className="truncate">{task.category || 'General'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 opacity-0 group-hover/cat:opacity-100 transition-opacity shrink-0 ml-1" />
          </button>

          {isCategoryOpen && (
            <div className="absolute left-0 top-full mt-1 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    updateTask(task.id, { category: c.name });
                    setIsCategoryOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] truncate transition-colors ${
                    task.category === c.name
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Priority (w-24): Semantic pill with icon + full non-truncated text */}
      <div className="w-24 px-2 flex items-center justify-center shrink-0 relative">
        <button
          type="button"
          onClick={() => setIsPriorityOpen(!isPriorityOpen)}
          className={`px-2 py-0.5 rounded-full border text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer ${priorityStyle.bg} ${priorityStyle.text}`}
          title={`Priority: ${task.priority || 'Medium'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
          <span>{priorityStyle.label}</span>
        </button>

        {isPriorityOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
            {(['Urgent', 'High', 'Medium', 'Low'] as TaskPriority[]).map((p) => {
              const meta = priorityMeta[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    updateTask(task.id, { priority: p });
                    setIsPriorityOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-[10px] flex items-center gap-1.5 transition-colors ${
                    (task.priority || 'Medium') === p
                      ? 'bg-slate-100 dark:bg-slate-800 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  <span className={meta.text}>{p}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Owner / Team (w-40): 24px avatar circle + name + muted role pill. Style Unassigned with dashed placeholder */}
      <div className="w-40 px-2 flex items-center shrink-0">
        <AssigneeCombobox
          primaryOwnerId={task.primaryOwnerId}
          primaryOwnerHours={task.primaryOwnerHours}
          contributorAllocations={task.contributorAllocations || []}
          estimatedHours={task.estimatedHours}
          legacyAssignee={task.assignee}
          assigneeUnresolved={task.assigneeUnresolved}
          teamMembers={teamMembers}
          onAssignChange={(newOwnerId, newOwnerHours, newContributors) => {
            if (newOwnerId !== task.primaryOwnerId) {
              reassignTask(task.id, newOwnerId);
            }
            updateTask(task.id, {
              primaryOwnerId: newOwnerId,
              primaryOwnerHours: newOwnerHours,
              contributorAllocations: newContributors,
            });
          }}
        />
      </div>

      {/* 6. Schedule (Start -> End) (w-44): Single compact range cell (09 Oct -> 12 Nov) in tabular-nums */}
      <div className="w-44 px-2 flex items-center justify-center shrink-0 relative font-mono text-[11px] tabular-nums">
        <button
          type="button"
          onClick={() => setIsScheduleOpen(!isScheduleOpen)}
          title={`Schedule: ${task.start} to ${task.end}. Click to edit dates.`}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <span>{formatShortDate(task.start)}</span>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{formatShortDate(task.end)}</span>
        </button>

        {isScheduleOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Deliverable Schedule
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Start Date</label>
                <input
                  type="date"
                  value={task.start}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const updates: Partial<Task> = { start: newStart };
                    if (task.end < newStart) updates.end = newStart;
                    updateTask(task.id, updates);
                  }}
                  className="w-full text-xs font-mono px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">End Date</label>
                <input
                  type="date"
                  value={task.end}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    const updates: Partial<Task> = { end: newEnd };
                    if (task.start > newEnd) updates.start = newEnd;
                    updateTask(task.id, updates);
                  }}
                  className="w-full text-xs font-mono px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsScheduleOpen(false)}
              className="mt-2.5 w-full py-1 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors text-center"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* 7. Dur. / Effort (w-28): Dual-value pill (28d · 22d eff) with tabular-nums and whitespace-nowrap */}
      <div className="w-28 px-1.5 flex items-center justify-center shrink-0 relative font-mono text-[11px] tabular-nums">
        <button
          type="button"
          onClick={() => setIsEffortOpen(!isEffortOpen)}
          title={`Duration: ${duration}d | Effort: ${task.estimatedHours != null ? task.estimatedHours + 'h' : 'Unestimated'}`}
          className="whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-emerald-400 transition-colors flex items-center gap-1"
        >
          <span>{task.isMilestone ? '0d' : `${duration}d`}</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className={task.estimatedHours == null ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}>
            {task.estimatedHours != null ? `${Math.round(task.estimatedHours / 8)}d` : '—'} eff
          </span>
        </button>

        {isEffortOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Effort & Duration
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Estimated Effort (Hours)</label>
                <input
                  type="number"
                  min={0}
                  value={task.estimatedHours ?? ''}
                  placeholder="e.g. 176"
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
                    updateTask(task.id, { estimatedHours: val });
                  }}
                  className="w-full text-xs font-mono px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEffortOpen(false)}
              className="mt-2.5 w-full py-1 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors text-center"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* 8. Progress & Status (w-36): Unified interactive pill containing SVG circular ring + full status label */}
      <div className="w-36 px-2 flex items-center justify-center shrink-0 relative">
        <button
          type="button"
          onClick={() => setIsStatusOpen(!isStatusOpen)}
          className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          title={`Progress: ${task.pct}% (${task.status})`}
        >
          {/* Circular SVG Ring */}
          <div className="relative w-4 h-4 shrink-0 flex items-center justify-center">
            <svg className="w-4 h-4 -rotate-90" viewBox="0 0 18 18">
              <circle
                cx="9"
                cy="9"
                r={radius}
                className="stroke-slate-200 dark:stroke-slate-700"
                strokeWidth="2.5"
                fill="none"
              />
              <circle
                cx="9"
                cy="9"
                r={radius}
                stroke={progressRingColor}
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>

          {/* Full status label: zero truncation */}
          <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap text-[11px]">
            {task.pct}% {task.status}
          </span>
        </button>

        {isStatusOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Set Status & Progress
            </div>
            <div className="space-y-1 mb-2">
              {(['Not Started', 'In Progress', 'In Review', 'Blocked', 'Completed'] as TaskStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors flex items-center justify-between ${
                    task.status === st
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{st}</span>
                  {task.status === st && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-medium text-slate-500 block mb-1">
                Progress: {task.pct}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={task.pct}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateTask(task.id, {
                    pct: val,
                    status: val === 100 ? 'Completed' : val > 0 ? 'In Progress' : 'Not Started',
                  });
                }}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* 9. Pred. (w-14): Compact monospace badge (#1, #2) that highlights dependency line on Gantt when hovered */}
      <div className="w-14 px-1 flex items-center justify-center shrink-0 relative">
        <button
          type="button"
          onClick={() => setIsPredOpen(!isPredOpen)}
          onMouseEnter={() => {
            if (task.dependsOn && task.dependsOn.length > 0) {
              onHoverPred?.(task.dependsOn[0]);
            }
          }}
          onMouseLeave={() => onHoverPred?.(null)}
          title={`Predecessors: ${predIndices.join(', ') || 'None'}. Click to edit.`}
          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-400 hover:text-emerald-700 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          {predIndices.length > 0 ? predIndices.join(',') : '—'}
        </button>

        {isPredOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
              Select Predecessors
            </div>
            <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
              {allTasks
                .filter((t) => t.id !== task.id)
                .map((t, idx) => {
                  const isChecked = task.dependsOn?.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePredecessor(t.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      />
                      <span className="truncate text-[11px] text-slate-700 dark:text-slate-300">
                        #{t.order ?? idx + 1} {t.name}
                      </span>
                    </label>
                  );
                })}
            </div>
            <button
              type="button"
              onClick={() => setIsPredOpen(false)}
              className="mt-2 w-full text-center py-1 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* 10. Contextual Hover Actions (Floating Right Overlay):
          Hide 3 row action icons at rest; reveal sleek floating pill anchored to right edge on hover */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 pointer-events-none group-hover:pointer-events-auto">
        <div className="flex items-center gap-0.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur shadow-sm border border-slate-200 dark:border-slate-700 rounded-md px-1 py-0.5">
          {/* Action 1: Predecessor link */}
          <button
            type="button"
            onClick={() => setIsPredOpen(!isPredOpen)}
            title="Predecessors & Dependencies"
            className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>

          {/* Action 2: Comments / Drawer Details */}
          <button
            type="button"
            onClick={() => onOpenDetails?.(task)}
            title="Open Details & Comments"
            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Action 3: Delete */}
          <button
            type="button"
            onClick={() => deleteTask(task.id)}
            title="Delete deliverable"
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

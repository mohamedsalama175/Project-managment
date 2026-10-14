import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Check,
  Diamond,
  Plus,
  Minus,
  Calendar,
  User,
  ArrowRight,
  Link2,
} from 'lucide-react';
import { Task, CategoryDef } from '../../types';
import {
  diffCalendarDays,
  addCalendarDays,
  isTaskOverdue,
} from '../../utils/dateUtils';
import { useProjectStore } from '../../stores/useProjectStore';

interface GanttBarProps {
  task: Task;
  allTasks?: Task[];
  timelineStart: Date;
  dayWidth: number;
  rowHeight: number;
  isCritical: boolean;
  highlightCritical: boolean;
  categories: CategoryDef[];
  todayStr: string;
  isRowHovered?: boolean;
}

type DragMode = 'move' | 'resize-left' | 'resize-right' | 'pct' | null;

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  return `${day} ${monthNames[monthIdx] || parts[1]}`;
}

export const GanttBar: React.FC<GanttBarProps> = ({
  task,
  allTasks = [],
  timelineStart,
  dayWidth,
  rowHeight = 40,
  isCritical,
  highlightCritical,
  categories,
  todayStr,
  isRowHovered = false,
}) => {
  const { updateTask, teamMembers } = useProjectStore();
  const primaryOwner = (teamMembers || []).find((m) => m.id === task.primaryOwnerId);

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [tempStart, setTempStart] = useState<string>(task.start);
  const [tempEnd, setTempEnd] = useState<string>(task.end);
  const [tempPct, setTempPct] = useState<number>(task.pct);

  // 200ms Hover Card State
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const dragStartRef = useRef<{
    startX: number;
    initialStartDate: string;
    initialEndDate: string;
    initialPct: number;
  }>({
    startX: 0,
    initialStartDate: task.start,
    initialEndDate: task.end,
    initialPct: task.pct,
  });

  const rafRef = useRef<number | null>(null);

  const effectiveStart = dragMode ? tempStart : task.start;
  const effectiveEnd = dragMode ? tempEnd : task.end;
  const effectivePct = dragMode ? tempPct : task.pct;

  const startDiff = diffCalendarDays(
    timelineStart.toISOString().slice(0, 10),
    effectiveStart
  );
  const duration = Math.max(1, diffCalendarDays(effectiveStart, effectiveEnd) + 1);

  const left = startDiff * dayWidth;
  const width = task.isMilestone ? 24 : Math.max(dayWidth, duration * dayWidth);

  const overdue = isTaskOverdue(task, todayStr);

  const handlePointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setDragMode(mode);
    setTempStart(task.start);
    setTempEnd(task.end);
    setTempPct(task.pct);
    setShowHoverCard(false);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    dragStartRef.current = {
      startX: e.clientX,
      initialStartDate: task.start,
      initialEndDate: task.end,
      initialPct: task.pct,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragMode) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragStartRef.current.startX;
    const dayDelta = Math.round(deltaX / dayWidth);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (dragMode === 'move') {
        const newStart = addCalendarDays(dragStartRef.current.initialStartDate, dayDelta);
        const newEnd = addCalendarDays(dragStartRef.current.initialEndDate, dayDelta);
        setTempStart(newStart);
        setTempEnd(newEnd);
      } else if (dragMode === 'resize-left') {
        const newStart = addCalendarDays(dragStartRef.current.initialStartDate, dayDelta);
        if (newStart <= dragStartRef.current.initialEndDate) {
          setTempStart(newStart);
        }
      } else if (dragMode === 'resize-right') {
        const newEnd = addCalendarDays(dragStartRef.current.initialEndDate, dayDelta);
        if (newEnd >= dragStartRef.current.initialStartDate) {
          setTempEnd(newEnd);
        }
      } else if (dragMode === 'pct') {
        const barTotalWidth = duration * dayWidth;
        const currentProgressWidth = (dragStartRef.current.initialPct / 100) * barTotalWidth;
        const newProgressWidth = Math.max(0, Math.min(barTotalWidth, currentProgressWidth + deltaX));
        const newPct = Math.round((newProgressWidth / barTotalWidth) * 100);
        setTempPct(newPct);
      }
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragMode) return;
    e.stopPropagation();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (dragMode === 'move' || dragMode === 'resize-left' || dragMode === 'resize-right') {
      updateTask(task.id, {
        start: tempStart,
        end: tempEnd,
      });
    } else if (dragMode === 'pct') {
      updateTask(task.id, {
        pct: tempPct,
        status: tempPct === 100 ? 'Completed' : tempPct > 0 ? 'In Progress' : 'Not Started',
      });
    }

    setDragMode(null);
  };

  // Hover Card 200ms Delay Handlers with Portal Coordinates
  const handleMouseEnter = () => {
    if (dragMode) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        setTooltipPos({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
        setShowHoverCard(true);
      }
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowHoverCard(false);
  };

  // Quick Action Handlers
  const handleShiftDay = (deltaDays: number) => {
    const newEnd = addCalendarDays(task.end, deltaDays);
    if (newEnd >= task.start) {
      updateTask(task.id, { end: newEnd });
    }
  };

  const handleMarkComplete = () => {
    updateTask(task.id, { pct: 100, status: 'Completed' });
  };

  // Predecessor display text
  const predText = React.useMemo(() => {
    if (!task.dependsOn || task.dependsOn.length === 0) return 'None';
    return task.dependsOn
      .map((id) => {
        const found = allTasks.find((t) => t.id === id);
        return found ? `#${found.order ?? id}` : id;
      })
      .join(', ');
  }, [task.dependsOn, allTasks]);

  // Hover Card rendered via Portal directly in document.body
  const renderHoverCard = () => {
    if (!showHoverCard || dragMode || !tooltipPos) return null;
    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
          transform: 'translate(-50%, -100%)',
          zIndex: 9999,
        }}
        onMouseEnter={() => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          setShowHoverCard(true);
        }}
        onMouseLeave={handleMouseLeave}
        className="w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-3 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
      >
        {/* Task Name & Status */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
            {task.name}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              task.status === 'Completed'
                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {task.status}
          </span>
        </div>

        {/* Owner + Role */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-1">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {primaryOwner?.name || task.assignee || 'Unassigned'}
          </span>
          {primaryOwner?.jobTitle && (
            <span className="text-[10px] text-slate-400">
              · {primaryOwner.jobTitle}
            </span>
          )}
        </div>

        {/* Dates & Effort Metrics */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400 mb-1">
          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
          <span>
            {formatShortDate(task.start)} → {formatShortDate(task.end)}
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span>
            {duration}d / {task.estimatedHours != null ? `${Math.round(task.estimatedHours / 8)}d` : '—'}
          </span>
        </div>

        {/* Predecessors */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2.5">
          <Link2 className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Pred: {predText}</span>
        </div>

        {/* Quick-Action Buttons (+1d, -1d, Mark 100%) */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleShiftDay(-1)}
            className="flex-1 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
            title="Reduce duration by 1 day"
          >
            <Minus className="w-3 h-3" />
            <span>-1d</span>
          </button>
          <button
            type="button"
            onClick={() => handleShiftDay(1)}
            className="flex-1 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
            title="Extend duration by 1 day"
          >
            <Plus className="w-3 h-3" />
            <span>+1d</span>
          </button>
          <button
            type="button"
            onClick={handleMarkComplete}
            className="flex-1 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
            title="Mark task 100% complete"
          >
            <Check className="w-3 h-3" />
            <span>100%</span>
          </button>
        </div>
      </div>,
      document.body
    );
  };

  // Milestone Render
  if (task.isMilestone) {
    return (
      <>
        <div
          ref={barRef}
          style={{
            left: `${left}px`,
            top: '8px',
            height: '24px',
            width: '24px',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute z-20 flex items-center justify-center cursor-grab active:cursor-grabbing group ${
            isRowHovered ? 'scale-110' : ''
          }`}
        >
          <div
            onPointerDown={(e) => handlePointerDown(e, 'move')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`w-5 h-5 rotate-45 border-2 rounded-xs flex items-center justify-center shadow-xs transition-transform ${
              effectivePct === 100
                ? 'bg-emerald-600 border-emerald-700'
                : 'bg-amber-500 border-amber-600'
            }`}
          >
            {effectivePct === 100 && (
              <Check className="w-3 h-3 text-white -rotate-45 stroke-[3]" />
            )}
          </div>

          {/* Milestone External Label: if close to right edge (left > 600px), display on the left */}
          {left > 600 ? (
            <div className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-slate-800 dark:text-slate-100 pointer-events-none drop-shadow-xs text-right">
              <span className="text-[10px] font-mono text-slate-500">
                ({formatShortDate(effectiveStart)})
              </span>
              <span>{task.name}</span>
            </div>
          ) : (
            <div className="absolute left-7 top-1/2 -translate-y-1/2 flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-slate-800 dark:text-slate-100 pointer-events-none drop-shadow-xs">
              <span>{task.name}</span>
              <span className="text-[10px] font-mono text-slate-500">
                ({formatShortDate(effectiveStart)})
              </span>
            </div>
          )}
        </div>
        {renderHoverCard()}
      </>
    );
  }

  // Normal Deliverable Bar (Strict h-6 / 24px centered vertically inside 40px row: top = (40 - 24)/2 = 8px)
  return (
    <>
      <div
        ref={barRef}
        style={{
          left: `${left}px`,
          top: '8px',
          width: `${width}px`,
          height: '24px',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`absolute z-20 group transition-shadow ${
          isRowHovered ? 'ring-2 ring-emerald-500/30' : ''
        } ${overdue ? 'ring-1 ring-rose-500' : ''}`}
      >
        {/* 3. Bar Body with Two-Tone Fill: dark emerald (completed) + soft emerald (remaining) */}
        <div
          onPointerDown={(e) => handlePointerDown(e, 'move')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`relative w-full h-full rounded-md shadow-xs overflow-hidden flex items-center cursor-grab active:cursor-grabbing border ${
            highlightCritical && isCritical
              ? 'bg-amber-100 border-amber-400 dark:bg-amber-950/80 dark:border-amber-500/60'
              : 'bg-emerald-100 border-emerald-400 dark:bg-emerald-950/80 dark:border-emerald-500/60'
          }`}
        >
          {/* Completed Progress Fill (Dark Emerald) */}
          <div
            style={{ width: `${effectivePct}%` }}
            className={`h-full transition-[width] duration-75 relative ${
              highlightCritical && isCritical
                ? 'bg-amber-500 dark:bg-amber-600'
                : 'bg-emerald-600 dark:bg-emerald-600'
            }`}
          >
            {/* Subtle tactile gradient gloss */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          </div>

          {/* Sticky Inner Bar Label: only when width >= 140px */}
          {width >= 140 ? (
            <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
              <div
                style={{ position: 'sticky', left: '8px' }}
                className="flex items-center gap-1.5 px-1.5 text-xs font-semibold whitespace-nowrap z-10"
              >
                {overdue && (
                  <AlertTriangle className="w-3 h-3 text-rose-300 dark:text-rose-400 shrink-0 animate-pulse" />
                )}
                {effectivePct === 100 && (
                  <Check className="w-3 h-3 text-white shrink-0 stroke-[2.5]" />
                )}
                <span className="truncate font-semibold text-[11px] max-w-[190px] text-white dark:text-slate-100 drop-shadow-xs">
                  {task.name}
                </span>
                <span className="font-mono text-[10px] tabular-nums font-medium text-emerald-100 dark:text-slate-200 drop-shadow-xs">
                  {effectivePct}% · {duration}d
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* External Label if bar < 140px: rendered to the right of the bar */}
        {width < 140 && (
          <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-200 pointer-events-none drop-shadow-xs z-20 px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs border border-slate-200/50 dark:border-slate-700/50">
            {overdue && (
              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
            )}
            <span className="font-semibold text-[11px]">{task.name}</span>
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
              {effectivePct}% · {duration}d
            </span>
          </div>
        )}

        {/* 4. Left / Right Resize Handles & Connector Nodes on Bar Hover */}
        <div
          onPointerDown={(e) => handlePointerDown(e, 'resize-left')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Resize start date"
          className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-ew-resize z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100"
        >
          <div className="w-1.5 h-3.5 bg-white dark:bg-slate-200 rounded-full shadow-sm border border-slate-400" />
        </div>

        <div
          onPointerDown={(e) => handlePointerDown(e, 'resize-right')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Resize end date"
          className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-ew-resize z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100"
        >
          <div className="w-1.5 h-3.5 bg-white dark:bg-slate-200 rounded-full shadow-sm border border-slate-400" />
        </div>

        {/* Circular Dependency Connector Nodes */}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 border border-white shadow-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 border border-white shadow-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
      </div>

      {/* Portal Hover Card */}
      {renderHoverCard()}
    </>
  );
};

import React, { useState, useRef } from 'react';
import { AlertTriangle, Check, Diamond } from 'lucide-react';
import { Task, CategoryDef } from '../../types';
import {
  diffCalendarDays,
  addCalendarDays,
  isTaskOverdue,
} from '../../utils/dateUtils';
import { useProjectStore } from '../../stores/useProjectStore';

interface GanttBarProps {
  task: Task;
  timelineStart: Date;
  dayWidth: number;
  rowHeight: number;
  isCritical: boolean;
  highlightCritical: boolean;
  categories: CategoryDef[];
  todayStr: string;
}

type DragMode = 'move' | 'resize-left' | 'resize-right' | 'pct' | null;

export const GanttBar: React.FC<GanttBarProps> = ({
  task,
  timelineStart,
  dayWidth,
  isCritical,
  highlightCritical,
  categories,
  todayStr,
}) => {
  const { updateTask } = useProjectStore();

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [tempStart, setTempStart] = useState<string>(task.start);
  const [tempEnd, setTempEnd] = useState<string>(task.end);
  const [tempPct, setTempPct] = useState<number>(task.pct);

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

  // Sync state if task props change while not dragging
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

  // Overdue check
  const overdue = isTaskOverdue(task, todayStr);

  // Category Color
  const catDef = categories.find((c) => c.name === task.category);
  const barColor = catDef?.color || '#1f8a70';

  // Handle Drag Pointer Events
  const handlePointerDown = (
    e: React.PointerEvent,
    mode: DragMode
  ) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setDragMode(mode);
    setTempStart(task.start);
    setTempEnd(task.end);
    setTempPct(task.pct);

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

    if (dragMode === 'move') {
      updateTask(task.id, { start: tempStart, end: tempEnd });
    } else if (dragMode === 'resize-left') {
      updateTask(task.id, { start: tempStart });
    } else if (dragMode === 'resize-right') {
      updateTask(task.id, { end: tempEnd });
    } else if (dragMode === 'pct') {
      updateTask(task.id, {
        pct: tempPct,
        status: tempPct === 100 ? 'Completed' : tempPct > 0 ? 'In Progress' : 'Not Started',
      });
    }

    setDragMode(null);
  };

  // Milestone Render
  if (task.isMilestone) {
    return (
      <div
        style={{
          left: `${left + dayWidth / 2 - 12}px`,
          top: '11px',
        }}
        onPointerDown={(e) => handlePointerDown(e, 'move')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title={`Milestone: ${task.name} • Priority: ${task.priority || 'Medium'} (${effectiveStart})`}
        className={`absolute z-10 cursor-grab active:cursor-grabbing group`}
      >
        <div
          style={{ backgroundColor: barColor }}
          className={`clay-milestone flex items-center justify-center ${
            highlightCritical && isCritical ? 'critical-glow' : ''
          }`}
        >
          <Diamond className="w-2.5 h-2.5 text-white transform -rotate-45" />
        </div>
        {/* Milestone Name Tooltip/Badge */}
        <div className="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-bold text-slate-700 dark:text-slate-200 pointer-events-none drop-shadow-sm flex items-center gap-1">
          <span>{task.name}</span>
          <span className="text-[10px] text-slate-400 font-mono">({effectiveStart})</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        left: `${left}px`,
        width: `${width}px`,
        top: '5px',
        height: '26px',
      }}
      title={`${task.name} • Priority: ${task.priority || 'Medium'} • ${effectivePct}% • ${duration}d`}
      className={`absolute z-10 select-none group transition-shadow ${
        highlightCritical && isCritical ? 'critical-glow' : ''
      } ${overdue ? 'ring-2 ring-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.5)]' : ''}`}
    >
      {/* Outer Clay Bar Body */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'move')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          backgroundColor: `${barColor}25`,
          border: `1.5px solid ${barColor}`,
        }}
        className="clay-gantt-bar relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden flex items-center"
      >
        {/* Progress Fill Bar */}
        <div
          style={{
            width: `${effectivePct}%`,
            backgroundColor: barColor,
          }}
          className="h-full transition-[width] duration-75 relative"
        >
          {/* Tactile Highlight gloss */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
        </div>

        {/* Progress Drag Handle (Tactile Knob) */}
        <div
          onPointerDown={(e) => handlePointerDown(e, 'pct')}
          style={{ left: `calc(${effectivePct}% - 4px)` }}
          title={`Drag progress: ${effectivePct}%`}
          className="absolute top-0 bottom-0 w-2.5 bg-white/90 dark:bg-slate-200 shadow-sm border border-slate-400/50 rounded-full cursor-ew-resize hover:scale-125 transition-transform z-20 opacity-0 group-hover:opacity-100"
        />

        {/* Text inside the bar */}
        {width >= 85 ? (
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none text-xs font-semibold whitespace-nowrap overflow-hidden">
            <div className="flex items-center gap-1.5 truncate">
              {overdue && (
                <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0 animate-pulse" />
              )}
              {effectivePct === 100 && (
                <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-300 shrink-0" />
              )}
              <span
                className="truncate text-[11px] font-bold text-slate-800 dark:text-slate-100"
                style={{
                  textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                }}
              >
                {task.name}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono text-slate-600 dark:text-slate-300 ml-1">
              <span>{effectivePct}%</span>
              {width > 120 && <span>· {duration}d</span>}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">
            {effectivePct}%
          </div>
        )}
      </div>

      {/* External Label for Short Bars */}
      {width < 85 && (
        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold text-slate-700 dark:text-slate-200 pointer-events-none drop-shadow-sm z-20">
          {overdue && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 animate-pulse" />
          )}
          <span>{task.name}</span>
          <span className="text-[10px] font-mono text-slate-400">({duration}d)</span>
        </div>
      )}

      {/* Left Edge Resize Handle */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'resize-left')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Resize start date"
        className="absolute -left-1.5 top-1 bottom-1 w-3.5 cursor-w-resize z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100"
      >
        <div className="w-1.5 h-4 bg-white dark:bg-slate-300 rounded-full shadow-md border border-slate-400" />
      </div>

      {/* Right Edge Resize Handle */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'resize-right')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Resize end date"
        className="absolute -right-1.5 top-1 bottom-1 w-3.5 cursor-e-resize z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100"
      >
        <div className="w-1.5 h-4 bg-white dark:bg-slate-300 rounded-full shadow-md border border-slate-400" />
      </div>
    </div>
  );
};

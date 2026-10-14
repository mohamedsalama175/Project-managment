import React, { useRef, useEffect } from 'react';
import { Task, CategoryDef } from '../../types';
import { TimelineHeader } from './TimelineHeader';
import { GanttBar } from './GanttBar';
import { BaselineBar } from './BaselineBar';
import { DependencyCurves } from './DependencyCurves';
import { diffCalendarDays, getTodayUTC, isWeekendDay } from '../../utils/dateUtils';
import { EmptyState } from '../common/EmptyState';

interface GanttChartProps {
  tasks: Task[];
  timelineStart: Date;
  totalDays: number;
  dayWidth: number;
  rowHeight?: number;
  weekendDays: number[];
  criticalTaskIds: Set<string>;
  highlightCritical: boolean;
  categories: CategoryDef[];
  hasLockedBaseline: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  hoveredTaskId?: string | null;
  hoveredPredId?: string | null;
  onRowHover?: (taskId: string | null) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  timelineStart,
  totalDays,
  dayWidth,
  rowHeight = 40,
  weekendDays,
  criticalTaskIds,
  highlightCritical,
  categories,
  hasLockedBaseline,
  scrollRef,
  onScroll,
  hoveredTaskId,
  hoveredPredId,
  onRowHover,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = scrollRef || containerRef;

  const totalWidth = totalDays * dayWidth;
  const todayStr = getTodayUTC();
  const timelineStartStr = timelineStart.toISOString().slice(0, 10);
  const todayOffsetDays = diffCalendarDays(timelineStartStr, todayStr);
  const isTodayVisible = todayOffsetDays >= 0 && todayOffsetDays < totalDays;
  const todayLeft = todayOffsetDays * dayWidth + dayWidth / 2;

  // Jump to today helper
  const scrollToToday = () => {
    if (activeRef.current && isTodayVisible) {
      activeRef.current.scrollTo({
        left: Math.max(0, todayLeft - activeRef.current.clientWidth / 2),
        behavior: 'smooth',
      });
    }
  };

  // Auto-scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday();
    }, 150);
    return () => clearTimeout(timer);
  }, [timelineStartStr]);

  return (
    <div
      ref={activeRef}
      onScroll={onScroll}
      className="relative flex-1 h-full overflow-x-auto overflow-y-auto select-none bg-slate-50/50 dark:bg-[#131920]/60"
    >
      <div style={{ width: `${totalWidth}px` }} className="relative min-w-full">
        {/* Two-Tier Sticky Timeline Header (48px high, aligns with table header) */}
        <TimelineHeader
          timelineStart={timelineStart}
          totalDays={totalDays}
          dayWidth={dayWidth}
          weekendDays={weekendDays}
          todayStr={todayStr}
        />

        {/* Canvas Body with Strict 40px Row Heights */}
        <div
          className="relative"
          style={{ height: `${Math.max(300, tasks.length * rowHeight)}px` }}
        >
          {/* Background Grid Columns & Weekend Vertical Stripes */}
          <div className="absolute inset-0 flex pointer-events-none">
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = new Date(timelineStart.getTime() + i * 86400000);
              const isWk = isWeekendDay(d, weekendDays);
              const isToday = i === todayOffsetDays;

              return (
                <div
                  key={i}
                  style={{ width: `${dayWidth}px` }}
                  className={`h-full border-r border-slate-200/50 dark:border-slate-800/40 ${
                    isWk ? 'bg-slate-100/60 dark:bg-slate-800/40' : ''
                  } ${isToday ? 'bg-rose-500/5' : ''}`}
                />
              );
            })}
          </div>

          {/* 2. High-Visibility 2px Solid Rose "Today" Marker Line */}
          {isTodayVisible && (
            <div
              style={{ left: `${todayLeft}px` }}
              className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.6)]"
            />
          )}

          {/* Horizontal Row Guides (Strict 40px rowHeight) with Cross-Pane Hover Highlight */}
          <div className="absolute inset-0 pointer-events-none">
            {tasks.map((task, idx) => (
              <div
                key={task.id}
                style={{ top: `${idx * rowHeight}px`, height: `${rowHeight}px` }}
                className={`absolute inset-x-0 border-b border-slate-200/50 dark:border-slate-800/50 transition-colors ${
                  hoveredTaskId === task.id
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                    : ''
                }`}
              />
            ))}
          </div>

          {/* Orthogonal SVG Dependency Curves Overlay */}
          <DependencyCurves
            tasks={tasks}
            timelineStart={timelineStart}
            dayWidth={dayWidth}
            rowHeight={rowHeight}
            criticalTaskIds={criticalTaskIds}
            highlightCritical={highlightCritical}
            hoveredTaskId={hoveredTaskId}
            hoveredPredId={hoveredPredId}
          />

          {/* Deliverable Bars & Baseline Bars */}
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <EmptyState
                title="Timeline Empty"
                description="Add deliverables to see interactive timeline bars."
              />
            </div>
          ) : (
            tasks.map((task, idx) => (
              <div
                key={task.id}
                style={{
                  top: `${idx * rowHeight}px`,
                  height: `${rowHeight}px`,
                }}
                onMouseEnter={() => onRowHover?.(task.id)}
                onMouseLeave={() => onRowHover?.(null)}
                className="absolute inset-x-0"
              >
                {/* Optional Baseline Ghost Bar */}
                {hasLockedBaseline && task.baselineStart && task.baselineEnd && (
                  <BaselineBar
                    task={task}
                    timelineStart={timelineStart}
                    dayWidth={dayWidth}
                  />
                )}

                {/* Interactive Deliverable Gantt Bar */}
                <GanttBar
                  task={task}
                  allTasks={tasks}
                  timelineStart={timelineStart}
                  dayWidth={dayWidth}
                  rowHeight={rowHeight}
                  isCritical={criticalTaskIds.has(task.id)}
                  highlightCritical={highlightCritical}
                  categories={categories}
                  todayStr={todayStr}
                  isRowHovered={hoveredTaskId === task.id}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

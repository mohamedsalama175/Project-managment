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
  rowHeight: number;
  weekendDays: number[];
  criticalTaskIds: Set<string>;
  highlightCritical: boolean;
  categories: CategoryDef[];
  hasLockedBaseline: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  timelineStart,
  totalDays,
  dayWidth,
  rowHeight,
  weekendDays,
  criticalTaskIds,
  highlightCritical,
  categories,
  hasLockedBaseline,
  scrollRef,
  onScroll,
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
      className="relative flex-1 overflow-x-auto overflow-y-auto select-none bg-slate-50/50 dark:bg-[#131920]/60"
      style={{ minHeight: '400px' }}
    >
      <div style={{ width: `${totalWidth}px` }} className="relative min-w-full">
        {/* Sticky Timeline Header */}
        <TimelineHeader
          timelineStart={timelineStart}
          totalDays={totalDays}
          dayWidth={dayWidth}
          weekendDays={weekendDays}
          todayStr={todayStr}
        />

        {/* Canvas Body with Vertical Grid Lines */}
        <div
          className="relative"
          style={{ height: `${Math.max(300, tasks.length * rowHeight)}px` }}
        >
          {/* Background Grid Columns */}
          <div className="absolute inset-0 flex pointer-events-none">
            {Array.from({ length: totalDays }).map((_, i) => {
              const d = new Date(timelineStart.getTime() + i * 86400000);
              const isWk = isWeekendDay(d, weekendDays);
              return (
                <div
                  key={i}
                  style={{ width: `${dayWidth}px` }}
                  className={`h-full border-r border-slate-200/40 dark:border-slate-800/40 ${
                    isWk ? 'bg-slate-200/25 dark:bg-slate-800/25' : ''
                  }`}
                />
              );
            })}
          </div>

          {/* Vertical "Today" Marker Line */}
          {isTodayVisible && (
            <div
              style={{ left: `${todayLeft}px` }}
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.7)]"
            >
              <div className="sticky top-14 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black uppercase tracking-wider shadow-md pointer-events-auto">
                Today
              </div>
            </div>
          )}

          {/* SVG Dependency Curves Overlay */}
          <DependencyCurves
            tasks={tasks}
            timelineStart={timelineStart}
            dayWidth={dayWidth}
            rowHeight={rowHeight}
            criticalTaskIds={criticalTaskIds}
            highlightCritical={highlightCritical}
          />

          {/* Task Rows & Bars */}
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <EmptyState
                compact
                title="No Tasks to Visualize"
                description="Schedule tasks in the Work Breakdown Structure to project them on the Gantt timeline."
              />
            </div>
          ) : (
            tasks.map((task, idx) => (
              <div
                key={task.id}
                style={{
                  height: `${rowHeight}px`,
                  top: `${idx * rowHeight}px`,
                }}
                className="absolute left-0 right-0 border-b border-slate-200/30 dark:border-slate-800/30 hover:bg-slate-200/20 dark:hover:bg-slate-800/20 transition-colors"
              >
                {/* Baseline Ghost Bar */}
                {hasLockedBaseline && (
                  <BaselineBar
                    task={task}
                    timelineStart={timelineStart}
                    dayWidth={dayWidth}
                  />
                )}

                {/* Main Interactive Gantt Bar */}
                <GanttBar
                  task={task}
                  timelineStart={timelineStart}
                  dayWidth={dayWidth}
                  rowHeight={rowHeight}
                  isCritical={criticalTaskIds.has(task.id)}
                  highlightCritical={highlightCritical}
                  categories={categories}
                  todayStr={todayStr}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

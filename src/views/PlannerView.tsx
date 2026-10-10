import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Flame,
  AlertTriangle,
  Lock,
  Unlock,
} from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { WBSTable } from '../components/wbs/WBSTable';
import { GanttChart } from '../components/gantt/GanttChart';
import { calculateCPM } from '../utils/cpmUtils';
import {
  parseDateUTC,
  getBaselineVariance,
  getTodayUTC,
} from '../utils/dateUtils';
import { Task, Project, TaskCPMInfo } from '../types';
import { SortConfig, sortTasks } from '../utils/sortUtils';
import { TaskFilters, filterTasks, INITIAL_FILTERS } from '../utils/filterUtils';

export const PlannerView: React.FC = () => {
  const {
    projects,
    activeProjectId,
    zoomLevel,
    updateProjectConfig,
    lockBaseline,
  } = useProjectStore();

  const activeProject = projects.find((p: Project) => p.id === activeProjectId) || projects[0];

  // Draggable Splitter Width State
  const [tableWidth, setTableWidth] = useState<number>(760);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Sync Vertical Scrolling between WBS Table and Gantt Timeline
  const wbsScrollRef = useRef<HTMLDivElement | null>(null);
  const ganttScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScroll = useRef<boolean>(false);

  const handleWBSScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (ganttScrollRef.current) {
      ganttScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleGanttScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (wbsScrollRef.current) {
      wbsScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  // Draggable boundary splitter handlers
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = tableWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(420, Math.min(1100, startWidth + deltaX));
      setTableWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [tableWidth]);

  // Column Sort State
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: 'asc',
  });

  // Column Filters State
  const [filters, setFilters] = useState<TaskFilters>(INITIAL_FILTERS);

  // Filtered tasks based on active column filters
  const filteredTasks = useMemo(() => {
    if (!activeProject?.tasks) return [];
    return filterTasks(
      activeProject.tasks,
      filters,
      activeProject.config.durationMode,
      activeProject.config.weekendDays
    );
  }, [activeProject, filters]);

  // Tasks sorted by active column sort or natural WBS order
  const displayedTasks = useMemo(() => {
    return sortTasks(
      filteredTasks,
      sortConfig,
      activeProject.config.durationMode,
      activeProject.config.weekendDays
    );
  }, [filteredTasks, sortConfig, activeProject]);

  const allProjectTasks = activeProject?.tasks || [];

  // Compute CPM (Critical Path Method) across full project network
  const cpmMap = useMemo(() => {
    return calculateCPM(allProjectTasks);
  }, [allProjectTasks]);

  const criticalTaskIds = useMemo(() => {
    const set = new Set<string>();
    cpmMap.forEach((info: TaskCPMInfo, taskId: string) => {
      if (info.isCritical) set.add(taskId);
    });
    return set;
  }, [cpmMap]);

  // Dynamic Timeline Range based on full project tasks
  const { timelineStart, totalDays } = useMemo(() => {
    const today = parseDateUTC(getTodayUTC());
    if (!allProjectTasks.length) {
      const start = new Date(today.getTime() - 7 * 86400000);
      return { timelineStart: start, totalDays: 30 };
    }

    let minMs = today.getTime();
    let maxMs = today.getTime();

    allProjectTasks.forEach((t: Task) => {
      if (t.start) {
        const ms = parseDateUTC(t.start).getTime();
        if (ms < minMs) minMs = ms;
      }
      if (t.end) {
        const ms = parseDateUTC(t.end).getTime();
        if (ms > maxMs) maxMs = ms;
      }
      if (t.baselineStart) {
        const ms = parseDateUTC(t.baselineStart).getTime();
        if (ms < minMs) minMs = ms;
      }
      if (t.baselineEnd) {
        const ms = parseDateUTC(t.baselineEnd).getTime();
        if (ms > maxMs) maxMs = ms;
      }
    });

    // 4 days buffer before earliest start, 8 days buffer after latest end
    const start = new Date(minMs - 4 * 86400000);
    const end = new Date(maxMs + 8 * 86400000);
    const days = Math.max(20, Math.round((end.getTime() - start.getTime()) / 86400000));

    return { timelineStart: start, totalDays: days };
  }, [allProjectTasks]);

  // Project KPI Metrics
  const overallProgress = useMemo(() => {
    if (!allProjectTasks.length) return 0;
    const sum = allProjectTasks.reduce((acc: number, t: Task) => acc + (t.pct || 0), 0);
    return Math.round(sum / allProjectTasks.length);
  }, [allProjectTasks]);

  const overdueCount = useMemo(() => {
    const today = getTodayUTC();
    return allProjectTasks.filter(
      (t: Task) => t.end && t.end < today && (t.pct || 0) < 100 && t.status !== 'Completed'
    ).length;
  }, [allProjectTasks]);

  const baselineMetrics = useMemo(() => {
    return getBaselineVariance(allProjectTasks);
  }, [allProjectTasks]);

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-slate-500">No project selected.</div>
    );
  }

  const highlightCritical = !!activeProject.config.highlightCriticalPath;
  const hasLockedBaseline = !!activeProject.config.hasLockedBaseline;

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden">
      {/* Top Interactive KPI & Stats Bar */}
      <div className="px-5 py-2.5 bg-white/70 dark:bg-[#151c23]/80 backdrop-blur border-b border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Project Profile Summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
              {activeProject.name}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {activeProject.code}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

          {/* Overall Progress Meter */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-inner">
              <div
                style={{ width: `${overallProgress}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {overallProgress}% Done
            </span>
          </div>
        </div>

        {/* Action Badges & Toggles */}
        <div className="flex items-center gap-2.5">
          {/* Overdue Alert Badge */}
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{overdueCount} Overdue</span>
            </div>
          )}

          {/* Baseline Drift Pill */}
          {hasLockedBaseline ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 text-xs">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Baseline Locked:
              </span>
              <span
                className={`font-mono font-bold ${
                  baselineMetrics.totalSlippageDays > 0
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}
              >
                {baselineMetrics.totalSlippageDays > 0
                  ? `+${baselineMetrics.totalSlippageDays}d Drift`
                  : 'On Track'}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={lockBaseline}
              title="Snapshot current dates as baseline"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-300/60 dark:border-slate-700 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-colors"
            >
              <Unlock className="w-3.5 h-3.5 text-slate-400" />
              <span>Lock Baseline</span>
            </button>
          )}

          {/* Critical Path Toggle Button */}
          <button
            type="button"
            onClick={() =>
              updateProjectConfig({
                highlightCriticalPath: !highlightCritical,
              })
            }
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              highlightCritical
                ? 'clay-card !p-1 !px-2.5 bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-300/40 dark:border-slate-800'
            }`}
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                highlightCritical ? 'text-amber-500 animate-bounce' : 'text-slate-400'
              }`}
            />
            <span>Critical Path ({criticalTaskIds.size})</span>
          </button>
        </div>
      </div>

      {/* Main Split-Pane Workspace (WBS Left Table + Gantt Right Timeline) */}
      <div
        ref={splitContainerRef}
        className={`flex-1 flex overflow-hidden ${
          isResizing ? 'cursor-col-resize select-none' : ''
        }`}
      >
        {/* Left Sticky WBS Table Pane */}
        <div
          style={{ width: `${tableWidth}px`, flexShrink: 0 }}
          className="flex flex-col h-full overflow-hidden"
        >
          <WBSTable
            tasks={displayedTasks}
            allProjectTasks={activeProject.tasks}
            totalTaskCount={activeProject.tasks.length}
            rowHeight={44}
            categories={activeProject.config.categories}
            durationMode={activeProject.config.durationMode}
            weekendDays={activeProject.config.weekendDays}
            criticalTaskIds={criticalTaskIds}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            filters={filters}
            onFilterChange={setFilters}
            scrollRef={wbsScrollRef}
            onScroll={handleWBSScroll}
          />
        </div>

        {/* Draggable Column Boundary Splitter */}
        <div
          onMouseDown={handleSplitterMouseDown}
          onDoubleClick={() => setTableWidth(760)}
          title="Drag to resize pane, double click to reset"
          className="relative w-2 hover:w-2.5 z-30 cursor-col-resize group bg-slate-300/50 dark:bg-slate-800 hover:bg-emerald-500 transition-all flex items-center justify-center shrink-0"
        >
          <div className="w-0.5 h-8 bg-slate-400 dark:bg-slate-600 group-hover:bg-white rounded-full transition-colors" />
        </div>

        {/* Right Interactive Gantt Chart Canvas Pane */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-[300px]">
          <GanttChart
            tasks={displayedTasks}
            timelineStart={timelineStart}
            totalDays={totalDays}
            dayWidth={zoomLevel}
            rowHeight={44}
            weekendDays={activeProject.config.weekendDays}
            criticalTaskIds={criticalTaskIds}
            highlightCritical={highlightCritical}
            categories={activeProject.config.categories}
            hasLockedBaseline={hasLockedBaseline}
            scrollRef={ganttScrollRef}
            onScroll={handleGanttScroll}
          />
        </div>
      </div>
    </div>
  );
};

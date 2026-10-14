import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import { useAuthStore } from '../stores/useAuthStore';
import { WBSTable } from '../components/wbs/WBSTable';
import { GanttChart } from '../components/gantt/GanttChart';
import { TaskDetailDrawer } from '../components/wbs/TaskDetailDrawer';
import { PlannerToolbar, ResourceWorkload } from '../components/planner/PlannerToolbar';
import { calculateCPM } from '../utils/cpmUtils';
import {
  parseDateUTC,
  getBaselineVariance,
  getTodayUTC,
  addCalendarDays,
  calculateDuration,
  diffCalendarDays,
} from '../utils/dateUtils';
import { Task, Project, TaskCPMInfo } from '../types';
import { SortConfig, sortTasks } from '../utils/sortUtils';
import { TaskFilters, filterTasks, INITIAL_FILTERS } from '../utils/filterUtils';
import { EmptyState } from '../components/common/EmptyState';

export const PlannerView: React.FC = () => {
  const {
    projects,
    activeProjectId,
    zoomLevel,
    setZoomLevel,
    updateProjectConfig,
    lockBaseline,
    addTask,
    teamMembers,
  } = useProjectStore();

  const activeProject = projects.find((p: Project) => p.id === activeProjectId) || projects[0];

  // Mobile Segmented Mode (Table vs Timeline)
  const [mobileMode, setMobileMode] = useState<'table' | 'timeline'>('table');

  // Selected Task for Drawer
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<Task | null>(null);

  // Selected Task Index for Keyboard Navigation
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Cross-Pane Hover State
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [hoveredPredId, setHoveredPredId] = useState<string | null>(null);

  // Section 2: Split-Pane Ratio (Default 46% Left WBS / 54% Right Gantt)
  const [splitRatio, setSplitRatio] = useState<number>(46);
  const [layoutPreset, setLayoutPreset] = useState<'grid' | 'split' | 'gantt'>('split');
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Search & Filter State in Toolbar
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  // Synchronized Scrolling between WBS Table and Gantt Timeline
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

  // 6px Interactive Resizable Divider Handlers
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setLayoutPreset('split');

    const container = splitContainerRef.current;
    if (!container) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const relativeX = moveEvent.clientX - rect.left;
      const newRatio = Math.max(20, Math.min(80, Math.round((relativeX / rect.width) * 100)));
      setSplitRatio(newRatio);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  // Reset to default 46/54 split on double click
  const handleResetSplit = () => {
    setSplitRatio(46);
    setLayoutPreset('split');
  };

  // Layout preset changes
  const handleLayoutPresetChange = (preset: 'grid' | 'split' | 'gantt') => {
    setLayoutPreset(preset);
    if (preset === 'split') {
      setSplitRatio(46);
    }
  };

  // Column Sort & Filter State
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: 'asc',
  });
  const [filters, setFilters] = useState<TaskFilters>(INITIAL_FILTERS);

  // URL Drilldown Filter State (overdue, critical, blocked, my-tasks)
  const [urlFilter, setUrlFilter] = useState<'overdue' | 'critical' | 'blocked' | 'my-tasks' | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get('filter');
      if (filterParam === 'overdue' || filterParam === 'critical' || filterParam === 'blocked' || filterParam === 'my-tasks') {
        setUrlFilter(filterParam);
      }
      const projParam = params.get('project');
      if (projParam && projParam !== activeProjectId) {
        useProjectStore.getState().setActiveProject(projParam);
      }
    }
  }, [activeProjectId]);

  const allProjectTasks = activeProject?.tasks || [];

  // Compute CPM across full project network
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

  // Dynamic Timeline Range
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

    const start = new Date(minMs - 4 * 86400000);
    const end = new Date(maxMs + 8 * 86400000);
    const days = Math.max(20, Math.round((end.getTime() - start.getTime()) / 86400000));

    return { timelineStart: start, totalDays: days };
  }, [allProjectTasks]);

  // Overdue count calculation
  const overdueCount = useMemo(() => {
    const today = getTodayUTC();
    return allProjectTasks.filter(
      (t: Task) => t.end && t.end < today && (t.pct || 0) < 100 && t.status !== 'Completed'
    ).length;
  }, [allProjectTasks]);

  // Baseline metrics
  const baselineMetrics = useMemo(() => {
    return getBaselineVariance(allProjectTasks);
  }, [allProjectTasks]);

  // Interactive Resource Capacity Chips calculation: bound to active project tasks + team members
  const resourceWorkloads = useMemo<ResourceWorkload[]>(() => {
    const tasks = activeProject?.tasks || [];
    const members = teamMembers || [];
    if (!members.length) return [];

    const memberDaysMap = new Map<string, number>();

    tasks.forEach((t: Task) => {
      const dur = calculateDuration(
        t.start,
        t.end,
        activeProject?.config?.durationMode || 'working_days',
        activeProject?.config?.weekendDays || [5, 6]
      );

      // Match primary owner
      let matchedMemberId: string | null = t.primaryOwnerId || null;
      if (!matchedMemberId && t.assignee && t.assignee !== 'Unassigned') {
        const assLower = (t.assignee || '').toLowerCase();
        const matched = members.find((m) =>
          m.id === t.assignee ||
          m.name.toLowerCase() === assLower ||
          m.name.toLowerCase().includes(assLower) ||
          assLower.includes(m.name.toLowerCase())
        );
        if (matched) matchedMemberId = matched.id;
      }

      if (matchedMemberId) {
        memberDaysMap.set(matchedMemberId, (memberDaysMap.get(matchedMemberId) || 0) + dur);
      }

      if (t.contributorAllocations) {
        t.contributorAllocations.forEach((c) => {
          const contribDays = Math.max(1, Math.round((c.allocatedHours || 8) / 8));
          memberDaysMap.set(c.memberId, (memberDaysMap.get(c.memberId) || 0) + contribDays);
        });
      }
    });

    const list: ResourceWorkload[] = members.map((m) => {
      const days = memberDaysMap.get(m.id) || 0;
      let displayName = m.name;
      const parts = m.name.trim().split(/\s+/);
      if (parts.length > 1) {
        displayName = `${parts[0][0]}.${parts[parts.length - 1][0]}.`;
      }

      const threshold: 'emerald' | 'amber' | 'rose' =
        days > 30 ? 'rose' : days >= 20 ? 'amber' : 'emerald';

      return {
        memberId: m.id,
        displayName,
        days,
        threshold,
      };
    });

    return list.sort((a, b) => b.days - a.days);
  }, [activeProject?.tasks, activeProject?.config, teamMembers]);

  // Filter tasks based on search, active filters, URL drilldown, and resource chip selection
  const filteredTasks = useMemo(() => {
    if (!activeProject?.tasks || !activeProject?.config) return [];
    let tasks = filterTasks(
      activeProject.tasks,
      filters,
      activeProject.config.durationMode || 'working_days',
      activeProject.config.weekendDays || [5, 6]
    );

    // Quick search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(
        (t: Task) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.assignee && t.assignee.toLowerCase().includes(q))
      );
    }

    // Resource chip filter: filters table & Gantt to selected member's tasks
    if (selectedResourceId) {
      const targetMember = (teamMembers || []).find((m) => m.id === selectedResourceId);
      tasks = tasks.filter((t: Task) => {
        if (t.primaryOwnerId === selectedResourceId) return true;
        if (targetMember && t.assignee) {
          const a = t.assignee.toLowerCase();
          const m = targetMember.name.toLowerCase();
          if (a === m || a.includes(m) || m.includes(a)) return true;
        }
        if (t.assignee && t.assignee.toLowerCase().includes(selectedResourceId.toLowerCase())) return true;
        if (t.contributorAllocations?.some((c) => c.memberId === selectedResourceId)) return true;
        return false;
      });
    }

    // URL Drilldown filters
    if (urlFilter) {
      const today = getTodayUTC();
      if (urlFilter === 'overdue') {
        tasks = tasks.filter((t: Task) => t.end && t.end < today && t.status !== 'Completed');
      } else if (urlFilter === 'critical') {
        tasks = tasks.filter((t: Task) => {
          const info = cpmMap.get(t.id);
          return (info?.totalFloat ?? 1) <= 0 || info?.isCritical;
        });
      } else if (urlFilter === 'blocked') {
        tasks = tasks.filter((t: Task) => t.status === 'Blocked');
      } else if (urlFilter === 'my-tasks') {
        const authUser = useAuthStore.getState().user;
        if (authUser) {
          tasks = tasks.filter((t: Task) => {
            const assigned = (t as any).assigned_to || (t as any).assignedTo;
            if (assigned && (String(assigned) === String(authUser.id) || assigned === authUser.name || assigned === authUser.email)) {
              return true;
            }
            if (t.primaryOwnerId && String(t.primaryOwnerId) === String(authUser.id)) {
              return true;
            }
            if (t.assignee && (t.assignee.toLowerCase() === authUser.name.toLowerCase() || t.assignee.toLowerCase() === authUser.email.toLowerCase())) {
              return true;
            }
            if (t.contributorAllocations?.some((c) => String(c.memberId) === String(authUser.id))) {
              return true;
            }
            return false;
          });
        }
      }
    }

    return tasks;
  }, [activeProject, filters, searchQuery, selectedResourceId, urlFilter, cpmMap]);

  // Tasks sorted by active column sort or natural WBS order
  const displayedTasks = useMemo(() => {
    if (!activeProject?.config) return filteredTasks;
    return sortTasks(
      filteredTasks,
      sortConfig,
      activeProject.config.durationMode || 'working_days',
      activeProject.config.weekendDays || [5, 6]
    );
  }, [filteredTasks, sortConfig, activeProject]);

  // Quick Add Deliverable (Cmd+N CTA)
  const handleAddDeliverable = () => {
    const today = getTodayUTC();
    const lastTask = allProjectTasks[allProjectTasks.length - 1];
    const startDate = lastTask ? lastTask.end : today;
    const endDate = addCalendarDays(startDate, 5);

    addTask({
      parentId: null,
      name: `New Deliverable ${allProjectTasks.length + 1}`,
      category: activeProject?.config?.categories[0]?.name || 'General',
      priority: 'Medium',
      assignee: 'Unassigned',
      start: startDate,
      end: endDate,
      pct: 0,
      isMilestone: false,
      dependsOn: lastTask ? [lastTask.id] : [],
      status: 'Not Started',
    });
  };

  // Keyboard navigation listener (Section 5: Arrow keys, Space, 'F' key focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+N or Ctrl+N to add deliverable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddDeliverable();
        return;
      }

      // If user is typing in an input or textarea, ignore single key triggers
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }

      // 'F' key: auto-scroll Gantt timeline horizontally to focus on selected row's bar
      if (e.key.toLowerCase() === 'f') {
        const activeTask = displayedTasks[selectedIndex] || displayedTasks[0];
        if (activeTask && activeTask.start && ganttScrollRef.current) {
          e.preventDefault();
          const startDiff = diffCalendarDays(timelineStart.toISOString().slice(0, 10), activeTask.start);
          const targetLeft = startDiff * zoomLevel - ganttScrollRef.current.clientWidth / 3;
          ganttScrollRef.current.scrollTo({
            left: Math.max(0, targetLeft),
            behavior: 'smooth',
          });
        }
      }

      // Space key: open active task details drawer
      if (e.key === ' ' && displayedTasks[selectedIndex]) {
        e.preventDefault();
        setSelectedTaskForDrawer(displayedTasks[selectedIndex]);
      }

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(displayedTasks.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedTasks, selectedIndex, timelineStart, zoomLevel]);

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 h-full">
        <EmptyState
          title="No Project Selected"
          description="Select an existing project or create a new delivery schedule to start planning with WBS and Gantt."
          primaryAction={{
            label: 'Go to Dashboard',
            onClick: () => useProjectStore.getState().setActiveView('dashboard'),
          }}
        />
      </div>
    );
  }

  const highlightCritical = !!activeProject.config.highlightCriticalPath;
  const hasLockedBaseline = !!activeProject.config.hasLockedBaseline;

  // Compute pane widths based on layout preset and splitRatio
  const leftPaneStyle =
    layoutPreset === 'grid'
      ? { width: '100%', flex: 'none' }
      : layoutPreset === 'gantt'
      ? { display: 'none' }
      : { width: `${splitRatio}%`, flex: 'none' };

  const rightPaneStyle =
    layoutPreset === 'gantt'
      ? { width: '100%', flex: '1' }
      : layoutPreset === 'grid'
      ? { display: 'none' }
      : { width: `${100 - splitRatio}%`, flex: '1' };

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] overflow-hidden bg-white dark:bg-[#11161b]">
      
      {/* 1. Unified Command & Resource Toolbar (h-11, px-4, border-b border-slate-200 bg-slate-50/80 backdrop-blur) */}
      <PlannerToolbar
        onAddDeliverable={handleAddDeliverable}
        activeFiltersCount={Object.values(filters).filter(Boolean).length}
        onToggleFilters={() => setIsFiltersOpen(!isFiltersOpen)}
        isFiltersOpen={isFiltersOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        overdueCount={overdueCount}
        isOverdueActive={urlFilter === 'overdue'}
        onToggleOverdue={() => {
          setUrlFilter(urlFilter === 'overdue' ? null : 'overdue');
        }}
        criticalCount={criticalTaskIds.size}
        isCriticalActive={highlightCritical}
        onToggleCritical={() => {
          updateProjectConfig({ highlightCriticalPath: !highlightCritical });
        }}
        hasLockedBaseline={hasLockedBaseline}
        baselineDriftDays={baselineMetrics.totalSlippageDays}
        onLockBaseline={lockBaseline}
        layoutPreset={layoutPreset}
        onLayoutPresetChange={handleLayoutPresetChange}
        resourceWorkloads={resourceWorkloads}
        selectedResourceId={selectedResourceId}
        onSelectResource={setSelectedResourceId}
      />

      {/* 2. Main Split-Pane Workspace (46% Left WBS / 54% Right Gantt Canvas, strict 40px row height) */}
      <div
        ref={splitContainerRef}
        className={`flex-1 flex overflow-hidden flex-col md:flex-row relative ${
          isResizing ? 'cursor-col-resize select-none' : ''
        }`}
      >
        {/* Left WBS Data Grid Pane ("View at Rest, Edit on Focus") */}
        <div
          id="planner-wbs-container"
          style={leftPaneStyle}
          className={`h-full overflow-hidden flex-col ${
            mobileMode === 'table' ? 'flex w-full md:w-auto' : 'hidden md:flex'
          }`}
        >
          <WBSTable
            tasks={displayedTasks}
            allProjectTasks={activeProject.tasks}
            totalTaskCount={activeProject.tasks.length}
            rowHeight={40}
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
            onOpenDetails={setSelectedTaskForDrawer}
            hoveredTaskId={hoveredTaskId}
            onRowHover={setHoveredTaskId}
            onHoverPred={setHoveredPredId}
          />
        </div>

        {/* 2. Resizable 6px Interactive Drag Handle (Desktop Only) */}
        {layoutPreset === 'split' && (
          <div
            onMouseDown={handleSplitterMouseDown}
            onDoubleClick={handleResetSplit}
            title="Drag to resize pane (Double click to reset to 46% / 54%)"
            className="hidden md:flex relative w-1.5 hover:w-2 z-30 cursor-col-resize group bg-slate-200 dark:bg-slate-800 hover:bg-emerald-500/40 transition-all items-center justify-center shrink-0 select-none"
          >
            {/* Center grip indicator */}
            <div className="w-0.5 h-8 bg-slate-400 dark:bg-slate-600 group-hover:bg-emerald-600 rounded-full transition-colors" />
          </div>
        )}

        {/* Right Gantt Timeline Canvas Pane */}
        <div
          id="planner-gantt-container"
          style={rightPaneStyle}
          className={`flex-col h-full overflow-hidden min-w-[300px] ${
            mobileMode === 'timeline' ? 'flex w-full' : 'hidden md:flex'
          }`}
        >
          <GanttChart
            tasks={displayedTasks}
            timelineStart={timelineStart}
            totalDays={totalDays}
            dayWidth={zoomLevel}
            rowHeight={40}
            weekendDays={activeProject.config.weekendDays}
            criticalTaskIds={criticalTaskIds}
            highlightCritical={highlightCritical}
            categories={activeProject.config.categories}
            hasLockedBaseline={hasLockedBaseline}
            scrollRef={ganttScrollRef}
            onScroll={handleGanttScroll}
            hoveredTaskId={hoveredTaskId}
            hoveredPredId={hoveredPredId}
            onRowHover={setHoveredTaskId}
          />
        </div>
      </div>

      {/* Task Details Drawer */}
      <TaskDetailDrawer
        task={selectedTaskForDrawer}
        isOpen={!!selectedTaskForDrawer}
        onClose={() => setSelectedTaskForDrawer(null)}
      />
    </div>
  );
};

import React from 'react';
import {
  Plus,
  Undo2,
  Redo2,
  Filter,
  Search,
  X,
  Flame,
  AlertTriangle,
  Lock,
  Unlock,
  Columns,
  Table as TableIcon,
  BarChart3,
} from 'lucide-react';
import { Task, TeamMember } from '../../types';

export interface ResourceWorkload {
  memberId: string;
  displayName: string;
  days: number;
  threshold: 'emerald' | 'amber' | 'rose';
}

interface PlannerToolbarProps {
  onAddDeliverable: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  activeFiltersCount: number;
  onToggleFilters: () => void;
  isFiltersOpen: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  zoomLevel: number;
  onZoomChange: (level: number) => void;
  overdueCount: number;
  isOverdueActive: boolean;
  onToggleOverdue: () => void;
  criticalCount: number;
  isCriticalActive: boolean;
  onToggleCritical: () => void;
  hasLockedBaseline: boolean;
  baselineDriftDays: number;
  onLockBaseline: () => void;
  layoutPreset: 'grid' | 'split' | 'gantt';
  onLayoutPresetChange: (preset: 'grid' | 'split' | 'gantt') => void;
  resourceWorkloads: ResourceWorkload[];
  selectedResourceId: string | null;
  onSelectResource: (id: string | null) => void;
}

export const PlannerToolbar: React.FC<PlannerToolbarProps> = ({
  onAddDeliverable,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  activeFiltersCount,
  onToggleFilters,
  isFiltersOpen,
  searchQuery,
  onSearchChange,
  zoomLevel,
  onZoomChange,
  overdueCount,
  isOverdueActive,
  onToggleOverdue,
  criticalCount,
  isCriticalActive,
  onToggleCritical,
  hasLockedBaseline,
  baselineDriftDays,
  onLockBaseline,
  layoutPreset,
  onLayoutPresetChange,
  resourceWorkloads,
  selectedResourceId,
  onSelectResource,
}) => {
  // Zoom mode detection
  const currentZoomMode =
    zoomLevel >= 32
      ? 'day'
      : zoomLevel >= 22
      ? 'week'
      : zoomLevel >= 15
      ? 'month'
      : 'fit';

  return (
    <div className="h-11 px-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 select-none overflow-x-auto text-xs">
      
      {/* 1. Left (Table & View Controls) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Primary CTA button: + Add Deliverable with Cmd+N shortcut */}
        <button
          type="button"
          onClick={onAddDeliverable}
          title="Add Deliverable (Cmd+N / Ctrl+N)"
          className="h-7 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Deliverable</span>
          <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.2 text-[9px] font-mono font-medium bg-emerald-700/80 text-emerald-100 rounded">
            ⌘N
          </kbd>
        </button>

        {/* Undo / Redo icon buttons */}
        <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className={`p-1 rounded text-slate-600 dark:text-slate-300 transition-colors ${
              canUndo
                ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            className={`p-1 rounded text-slate-600 dark:text-slate-300 transition-colors ${
              canRedo
                ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Filter Popover Button: Filter (0) */}
        <button
          type="button"
          onClick={onToggleFilters}
          title="Toggle Filters"
          className={`h-7 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${
            activeFiltersCount > 0 || isFiltersOpen
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Filter ({activeFiltersCount})</span>
        </button>

        {/* Search / Quick Filter Input: w-44 focus:w-64 transition-all */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Quick search..."
            className="w-36 sm:w-44 focus:w-60 h-7 pl-7 pr-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 top-1.5 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Center (Timeline & Diagnostic Toggles) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Segmented Zoom Switcher: Day | Week | Month | Fit */}
        <div className="hidden lg:flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            type="button"
            onClick={() => onZoomChange(36)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              currentZoomMode === 'day'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(24)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              currentZoomMode === 'week'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(14)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              currentZoomMode === 'month'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(20)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              currentZoomMode === 'fit'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Fit
          </button>
        </div>

        {/* Single Overdue (6) interactive filter pill */}
        <button
          type="button"
          onClick={onToggleOverdue}
          title={isOverdueActive ? 'Click to show all tasks' : 'Filter overdue tasks'}
          className={`h-7 px-2.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            isOverdueActive
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue ({overdueCount})</span>
        </button>

        {/* Single Critical Path (0) toggle pill */}
        <button
          id="planner-critical-path-btn"
          type="button"
          onClick={onToggleCritical}
          title="Toggle Critical Path highlighting on Gantt"
          className={`h-7 px-2.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            isCriticalActive
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${isCriticalActive ? 'animate-bounce' : ''}`} />
          <span>Critical Path ({criticalCount})</span>
        </button>

        {/* Lock Baseline Toggle Button */}
        {hasLockedBaseline ? (
          <div className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span className="font-medium text-[11px]">Locked:</span>
            <span
              className={`font-mono font-bold text-[11px] tabular-nums ${
                baselineDriftDays > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {baselineDriftDays > 0 ? `+${baselineDriftDays}d Drift` : 'On Track'}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLockBaseline}
            title="Snapshot current dates as baseline"
            className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <Unlock className="w-3 h-3 text-slate-400" />
            <span>Lock Baseline</span>
          </button>
        )}

        {/* Layout Ratio Preset Switcher: Grid | 50:50 | Gantt */}
        <div className="hidden xl:flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            type="button"
            onClick={() => onLayoutPresetChange('grid')}
            title="WBS Table only"
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              layoutPreset === 'grid'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <TableIcon className="w-3 h-3" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => onLayoutPresetChange('split')}
            title="50:50 Split View"
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              layoutPreset === 'split'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>50:50</span>
          </button>
          <button
            type="button"
            onClick={() => onLayoutPresetChange('gantt')}
            title="Gantt Timeline only"
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
              layoutPreset === 'gantt'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>Gantt</span>
          </button>
        </div>
      </div>

      {/* 3. Right (Interactive Resource Capacity Chips) */}
      <div className="hidden xl:flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
          Capacity:
        </span>
        {resourceWorkloads.map((res) => {
          const isSelected = selectedResourceId === res.memberId;
          const ringClass =
            res.threshold === 'rose'
              ? 'ring-2 ring-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse font-bold'
              : res.threshold === 'amber'
              ? 'ring-1 ring-amber-500/60 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-semibold'
              : 'ring-1 ring-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-medium';

          return (
            <button
              key={res.memberId}
              type="button"
              onClick={() => onSelectResource(isSelected ? null : res.memberId)}
              title={`${res.displayName}: ${res.days}d allocated this month. Click to ${
                isSelected ? 'clear filter' : 'filter tasks'
              }`}
              className={`h-6 px-2 rounded-full text-[11px] flex items-center gap-1 transition-all cursor-pointer ${ringClass} ${
                isSelected ? 'scale-105 shadow-sm !ring-2 !ring-slate-900 dark:!ring-white font-extrabold' : 'hover:opacity-90'
              }`}
            >
              <span>{res.displayName}</span>
              <span className="font-mono text-[10px] opacity-90 tabular-nums">
                {res.days}d
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

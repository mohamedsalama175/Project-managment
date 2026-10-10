import React from 'react';
import { Search, Filter, X, RotateCcw, AlertTriangle, Diamond } from 'lucide-react';
import { CategoryDef, TaskPriority, TaskStatus, Task } from '../../types';
import {
  TaskFilters,
  getActiveFiltersCount,
  INITIAL_FILTERS,
} from '../../utils/filterUtils';
import { getTodayUTC } from '../../utils/dateUtils';

interface QuickFilterBarProps {
  filters: TaskFilters;
  onFilterChange: (filters: TaskFilters) => void;
  categories: CategoryDef[];
  allTasks: Task[];
  totalCount: number;
  filteredCount: number;
  onClose?: () => void;
}

export const QuickFilterBar: React.FC<QuickFilterBarProps> = ({
  filters,
  onFilterChange,
  categories,
  allTasks,
  totalCount,
  filteredCount,
}) => {
  const activeCount = getActiveFiltersCount(filters);
  const todayStr = getTodayUTC();

  const distinctAssignees = Array.from(
    new Set(allTasks.map((t) => t.assignee || 'Unassigned'))
  ).sort();

  return (
    <div className="px-3 py-2 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
      {/* 1. Search by Name Input */}
      <div className="relative min-w-[160px] max-w-[220px] flex-1">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter by name..."
          value={filters.name || ''}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              name: e.target.value || undefined,
            })
          }
          className="w-full pl-8 pr-6 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {filters.name && (
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, name: undefined })}
            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 2. Category Select */}
      <select
        value={filters.categories?.[0] || ''}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            categories: e.target.value ? [e.target.value] : undefined,
          })
        }
        className={`py-1 px-2 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
          filters.categories?.length
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
            : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }`}
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      {/* 3. Priority Select */}
      <select
        value={filters.priorities?.[0] || ''}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            priorities: e.target.value ? [e.target.value as TaskPriority] : undefined,
          })
        }
        className={`py-1 px-2 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
          filters.priorities?.length
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
            : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }`}
      >
        <option value="">All Priorities</option>
        <option value="Urgent">Urgent</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>

      {/* 4. Status Select */}
      <select
        value={filters.status?.[0] || ''}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            status: e.target.value ? [e.target.value as TaskStatus] : undefined,
          })
        }
        className={`py-1 px-2 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
          filters.status?.length
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
            : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }`}
      >
        <option value="">All Statuses</option>
        <option value="Not Started">Not Started</option>
        <option value="In Progress">In Progress</option>
        <option value="Blocked">Blocked</option>
        <option value="Completed">Completed</option>
      </select>

      {/* 5. Assignee Select */}
      <select
        value={filters.assignees?.[0] || ''}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            assignees: e.target.value ? [e.target.value] : undefined,
          })
        }
        className={`py-1 px-2 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
          filters.assignees?.length
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
            : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300'
        }`}
      >
        <option value="">All Assignees</option>
        {distinctAssignees.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      {/* Quick Filter: Overdue Tasks Toggle */}
      <button
        type="button"
        onClick={() => {
          const isOverdueActive =
            filters.endTo === todayStr && filters.maxPct === 99;
          if (isOverdueActive) {
            onFilterChange({
              ...filters,
              endTo: undefined,
              maxPct: undefined,
              status: undefined,
            });
          } else {
            onFilterChange({
              ...filters,
              endTo: todayStr,
              maxPct: 99,
              status: ['In Progress', 'Not Started', 'Blocked'],
            });
          }
        }}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
          filters.endTo === todayStr && filters.maxPct === 99
            ? 'bg-red-500 text-white shadow-sm'
            : 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20'
        }`}
      >
        <AlertTriangle className="w-3 h-3" />
        <span>Overdue</span>
      </button>

      {/* Quick Filter: Milestones Only Toggle */}
      <button
        type="button"
        onClick={() => {
          const isM = filters.isMilestone === 'milestone_only';
          onFilterChange({
            ...filters,
            isMilestone: isM ? undefined : 'milestone_only',
          });
        }}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
          filters.isMilestone === 'milestone_only'
            ? 'bg-amber-500 text-white shadow-sm'
            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20'
        }`}
      >
        <Diamond className="w-3 h-3" />
        <span>Milestones</span>
      </button>

      {/* Results Count & Reset All */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          {filteredCount} / {totalCount} shown
        </span>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange(INITIAL_FILTERS)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};

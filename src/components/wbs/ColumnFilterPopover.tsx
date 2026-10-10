import React, { useMemo, useRef, useEffect } from 'react';
import { X, RotateCcw, Search, Check, AlertCircle } from 'lucide-react';
import { Task, CategoryDef, TaskPriority, TaskStatus, DurationMode } from '../../types';
import {
  TaskFilters,
  clearColumnFilter,
  isColumnFilterActive,
} from '../../utils/filterUtils';
import { getTodayUTC, addCalendarDays } from '../../utils/dateUtils';

interface ColumnFilterPopoverProps {
  column: string;
  label: string;
  filters: TaskFilters;
  onFilterChange: (updated: TaskFilters) => void;
  onClose: () => void;
  allTasks: Task[];
  categories: CategoryDef[];
  durationMode: DurationMode;
  weekendDays: number[];
}

export const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({
  column,
  label,
  filters,
  onFilterChange,
  onClose,
  allTasks,
  categories,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Delay listener slightly to prevent the opening click from immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const isActive = isColumnFilterActive(filters, column);

  const handleClear = () => {
    onFilterChange(clearColumnFilter(filters, column));
  };

  // Distinct assignees in allTasks
  const distinctAssignees = useMemo(() => {
    const set = new Set<string>();
    allTasks.forEach((t) => set.add(t.assignee || 'Unassigned'));
    return Array.from(set).sort();
  }, [allTasks]);

  // Counts for priority
  const priorityCounts = useMemo(() => {
    const map: Record<TaskPriority, number> = { Urgent: 0, High: 0, Medium: 0, Low: 0 };
    allTasks.forEach((t) => {
      const p = t.priority || 'Medium';
      map[p] = (map[p] || 0) + 1;
    });
    return map;
  }, [allTasks]);

  // Counts for status
  const statusCounts = useMemo(() => {
    const map: Record<TaskStatus, number> = {
      'Not Started': 0,
      'In Progress': 0,
      Blocked: 0,
      Completed: 0,
    };
    allTasks.forEach((t) => {
      map[t.status] = (map[t.status] || 0) + 1;
    });
    return map;
  }, [allTasks]);

  // Counts for categories
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allTasks.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + 1;
    });
    return map;
  }, [allTasks]);

  const todayStr = getTodayUTC();

  return (
    <div
      ref={popoverRef}
      className="absolute top-full mt-1.5 z-50 min-w-[240px] max-w-[320px] bg-white dark:bg-[#1a232e] rounded-xl shadow-2xl border border-slate-300/80 dark:border-slate-700 p-3 text-xs text-slate-800 dark:text-slate-100 font-normal animate-in fade-in zoom-in-95 duration-150 select-text"
      style={{
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200/70 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span>Filter: {label}</span>
          {isActive && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-1">
          {isActive && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear this filter"
              className="text-[10px] text-slate-500 hover:text-red-500 flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Popover Content Specific to Column */}
      <div className="space-y-2.5">
        {/* --- Task Name Filter --- */}
        {column === 'name' && (
          <div className="space-y-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search task name..."
                value={filters.name || ''}
                onChange={(e) => onFilterChange({ ...filters, name: e.target.value })}
                className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[10px] text-slate-400">Matches any task containing text</p>
          </div>
        )}

        {/* --- Category Filter --- */}
        {column === 'category' && (
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-1 text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    categories: categories.map((c) => c.name),
                  })
                }
                className="hover:text-emerald-500 font-semibold"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = { ...filters };
                  delete next.categories;
                  onFilterChange(next);
                }}
                className="hover:text-red-500 font-semibold"
              >
                Clear
              </button>
            </div>

            {categories.map((cat) => {
              const selected = filters.categories?.includes(cat.name) ?? false;
              const count = categoryCounts[cat.name] || 0;
              return (
                <label
                  key={cat.id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        const current = filters.categories || [];
                        const next = e.target.checked
                          ? [...current, cat.name]
                          : current.filter((c) => c !== cat.name);
                        onFilterChange({
                          ...filters,
                          categories: next.length > 0 ? next : undefined,
                        });
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{count}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* --- Priority Filter --- */}
        {column === 'priority' && (
          <div className="space-y-1">
            {(['Urgent', 'High', 'Medium', 'Low'] as TaskPriority[]).map((p) => {
              const selected = filters.priorities?.includes(p) ?? false;
              const count = priorityCounts[p] || 0;
              const badgeColors: Record<TaskPriority, string> = {
                Urgent: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
                High: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
                Medium: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
                Low: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
              };

              return (
                <label
                  key={p}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        const current = filters.priorities || [];
                        const next = e.target.checked
                          ? [...current, p]
                          : current.filter((item) => item !== p);
                        onFilterChange({
                          ...filters,
                          priorities: next.length > 0 ? next : undefined,
                        });
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColors[p]}`}
                    >
                      {p}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{count}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* --- Assignee Filter --- */}
        {column === 'assignee' && (
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            <div className="flex items-center justify-between pb-1 text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    assignees: distinctAssignees,
                  })
                }
                className="hover:text-emerald-500 font-semibold"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = { ...filters };
                  delete next.assignees;
                  onFilterChange(next);
                }}
                className="hover:text-red-500 font-semibold"
              >
                Clear
              </button>
            </div>

            {distinctAssignees.map((assignee) => {
              const selected = filters.assignees?.includes(assignee) ?? false;
              const count = allTasks.filter(
                (t) => (t.assignee || 'Unassigned') === assignee
              ).length;
              return (
                <label
                  key={assignee}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        const current = filters.assignees || [];
                        const next = e.target.checked
                          ? [...current, assignee]
                          : current.filter((a) => a !== assignee);
                        onFilterChange({
                          ...filters,
                          assignees: next.length > 0 ? next : undefined,
                        });
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span className="truncate">{assignee}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{count}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* --- Start Date Filter --- */}
        {column === 'start' && (
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                Earliest Start Date (From):
              </label>
              <input
                type="date"
                value={filters.startFrom || ''}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    startFrom: e.target.value || undefined,
                  })
                }
                className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                Latest Start Date (To):
              </label>
              <input
                type="date"
                value={filters.startTo || ''}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    startTo: e.target.value || undefined,
                  })
                }
                className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
            </div>

            {/* Quick shortcuts */}
            <div className="pt-1 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    startFrom: todayStr,
                    startTo: addCalendarDays(todayStr, 7),
                  })
                }
                className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
              >
                Next 7 Days
              </button>
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    startFrom: todayStr,
                    startTo: addCalendarDays(todayStr, 30),
                  })
                }
                className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
              >
                Next 30 Days
              </button>
            </div>
          </div>
        )}

        {/* --- End Date Filter --- */}
        {column === 'end' && (
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                Earliest End Date (From):
              </label>
              <input
                type="date"
                value={filters.endFrom || ''}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    endFrom: e.target.value || undefined,
                  })
                }
                className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                Latest End Date (To):
              </label>
              <input
                type="date"
                value={filters.endTo || ''}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    endTo: e.target.value || undefined,
                  })
                }
                className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
              />
            </div>

            {/* Quick Overdue Preset */}
            <div className="pt-1 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    endTo: todayStr,
                    maxPct: 99,
                    status: ['In Progress', 'Not Started', 'Blocked'],
                  })
                }
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold border border-red-500/20"
              >
                <AlertCircle className="w-2.5 h-2.5" />
                <span>Overdue Only</span>
              </button>
            </div>
          </div>
        )}

        {/* --- Duration Filter --- */}
        {column === 'duration' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Min Days:
                </label>
                <input
                  type="number"
                  min="0"
                  value={filters.minDuration ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      minDuration: e.target.value !== '' ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Max Days:
                </label>
                <input
                  type="number"
                  min="0"
                  value={filters.maxDuration ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      maxDuration: e.target.value !== '' ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex gap-1 pt-1">
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, maxDuration: 5 })}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
              >
                &le; 5 days
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, minDuration: 10 })}
                className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
              >
                &ge; 10 days
              </button>
            </div>
          </div>
        )}

        {/* --- Progress (%) Filter --- */}
        {column === 'pct' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Min %:
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minPct ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      minPct: e.target.value !== '' ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Max %:
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.maxPct ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      maxPct: e.target.value !== '' ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>
            </div>

            {/* Quick Progress Presets */}
            <div className="space-y-1 pt-1">
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, minPct: 0, maxPct: 0 })}
                className="w-full text-left px-2 py-1 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-between"
              >
                <span>Not Started (0%)</span>
                {filters.minPct === 0 && filters.maxPct === 0 && (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, minPct: 1, maxPct: 99 })}
                className="w-full text-left px-2 py-1 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-between"
              >
                <span>In Progress (1% – 99%)</span>
                {filters.minPct === 1 && filters.maxPct === 99 && (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, minPct: 100, maxPct: 100 })}
                className="w-full text-left px-2 py-1 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-between"
              >
                <span>Completed (100%)</span>
                {filters.minPct === 100 && filters.maxPct === 100 && (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- Status Filter --- */}
        {column === 'status' && (
          <div className="space-y-1">
            {(['Not Started', 'In Progress', 'Blocked', 'Completed'] as TaskStatus[]).map(
              (st) => {
                const selected = filters.status?.includes(st) ?? false;
                const count = statusCounts[st] || 0;
                const statusPills: Record<TaskStatus, string> = {
                  'Not Started':
                    'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                  'In Progress':
                    'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
                  Blocked: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
                  Completed:
                    'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
                };

                return (
                  <label
                    key={st}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const current = filters.status || [];
                          const next = e.target.checked
                            ? [...current, st]
                            : current.filter((s) => s !== st);
                          onFilterChange({
                            ...filters,
                            status: next.length > 0 ? next : undefined,
                          });
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      />
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusPills[st]}`}
                      >
                        {st}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{count}</span>
                  </label>
                );
              }
            )}
          </div>
        )}

        {/* --- Predecessors Filter --- */}
        {column === 'dependsOn' && (
          <div className="space-y-1">
            {[
              { id: 'all', label: 'All Tasks' },
              { id: 'has_pred', label: 'Has Predecessors (Dependent)' },
              { id: 'no_pred', label: 'No Predecessors (Root/Start)' },
            ].map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer text-xs"
              >
                <input
                  type="radio"
                  name="predMode"
                  checked={(filters.predMode || 'all') === opt.id}
                  onChange={() =>
                    onFilterChange({
                      ...filters,
                      predMode: opt.id as any,
                    })
                  }
                  className="text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* --- WBS # / Order Filter --- */}
        {column === 'order' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  From #:
                </label>
                <input
                  type="number"
                  min="1"
                  value={filters.orderMin ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      orderMin: e.target.value !== '' ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  To #:
                </label>
                <input
                  type="number"
                  min="1"
                  value={filters.orderMax ?? ''}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      orderMax: e.target.value !== '' ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* --- Actions / Milestone Filter --- */}
        {column === 'actions' && (
          <div className="space-y-1">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'milestone_only', label: 'Milestones Only (◆)' },
              { id: 'task_only', label: 'Standard Tasks Only' },
            ].map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer text-xs"
              >
                <input
                  type="radio"
                  name="milestoneFilter"
                  checked={(filters.isMilestone || 'all') === opt.id}
                  onChange={() =>
                    onFilterChange({
                      ...filters,
                      isMilestone: opt.id as any,
                    })
                  }
                  className="text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Popover Footer */}
      <div className="pt-2.5 mt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={handleClear}
          className="text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
        >
          Reset Filter
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};

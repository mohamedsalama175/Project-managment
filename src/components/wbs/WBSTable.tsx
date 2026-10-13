import React, { useState } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  ArrowDownUp,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';

import { Task, CategoryDef, DurationMode } from '../../types';
import { WBSRow } from './WBSRow';
import { useProjectStore } from '../../stores/useProjectStore';
import { EmptyState } from '../common/EmptyState';
import { addCalendarDays, getTodayUTC } from '../../utils/dateUtils';
import {
  SortConfig,
  SortColumn,
  getNextSortConfig,
  getColumnTitle,
  getColumnSortLabel,
  getDefaultSortDirection,
} from '../../utils/sortUtils';
import {
  TaskFilters,
  INITIAL_FILTERS,
  isColumnFilterActive,
  getActiveFiltersCount,
} from '../../utils/filterUtils';
import { ColumnFilterPopover } from './ColumnFilterPopover';
import { QuickFilterBar } from './QuickFilterBar';

interface WBSTableProps {
  tasks: Task[];
  allProjectTasks?: Task[];
  rowHeight: number;
  categories: CategoryDef[];
  durationMode: DurationMode;
  weekendDays: number[];
  criticalTaskIds: Set<string>;
  sortConfig?: SortConfig;
  onSortChange?: (config: SortConfig) => void;
  filters?: TaskFilters;
  onFilterChange?: (filters: TaskFilters) => void;
  totalTaskCount?: number;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onOpenDetails?: (task: Task) => void;
}

interface ColumnHeaderProps {
  column: string;
  label: string;
  sortColumn?: SortColumn;
  activeSort: SortConfig;
  onSort?: (col: SortColumn) => void;
  filters: TaskFilters;
  onOpenFilter: (col: string) => void;
  openFilterCol: string | null;
  onFilterChange: (filters: TaskFilters) => void;
  onCloseFilter: () => void;
  allTasks: Task[];
  categories: CategoryDef[];
  durationMode: DurationMode;
  weekendDays: number[];
  align?: 'left' | 'center';
  popoverAlign?: 'left' | 'right';
  className?: string;
  hideFilter?: boolean;
}

const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  column,
  label,
  sortColumn,
  activeSort,
  onSort,
  filters,
  onOpenFilter,
  openFilterCol,
  onFilterChange,
  onCloseFilter,
  allTasks,
  categories,
  durationMode,
  weekendDays,
  align = 'left',
  popoverAlign = 'left',
  className = '',
  hideFilter = false,
}) => {
  const isSorted = sortColumn && activeSort.column === sortColumn;
  const dir = activeSort.direction;
  const isFiltered = isColumnFilterActive(filters, column);
  const isPopoverOpen = openFilterCol === column;

  return (
    <div
      className={`relative h-full flex items-center justify-between group px-1 select-none ${className}`}
    >
      {/* Sortable Column Label Button */}
      {sortColumn && onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortColumn)}
          title={`Click to sort by ${label}`}
          className={`flex-1 flex items-center gap-1 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-left truncate ${
            align === 'center' ? 'justify-center' : 'justify-start'
          } ${
            isSorted
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className="truncate">{label}</span>
          {isSorted ? (
            dir === 'asc' ? (
              <ArrowUp className="w-2.5 h-2.5 shrink-0 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            ) : (
              <ArrowDown className="w-2.5 h-2.5 shrink-0 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            )
          ) : (
            <ArrowUpDown className="w-2 h-2 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity text-slate-400" />
          )}
        </button>
      ) : (
        <span
          className={`flex-1 truncate ${
            align === 'center' ? 'text-center' : 'text-left'
          }`}
        >
          {label}
        </span>
      )}

      {/* Filter Button for this column */}
      {!hideFilter && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isPopoverOpen) onCloseFilter();
            else onOpenFilter(column);
          }}
          title={isFiltered ? `Active filter on ${label}. Click to modify or reset.` : `Filter by ${label}`}
          aria-label={`Filter ${label}`}
          className={`p-1 rounded transition-all shrink-0 ml-0.5 ${
            isFiltered
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold opacity-100 ring-1 ring-emerald-500/40'
              : isPopoverOpen
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 opacity-100'
              : 'opacity-0 group-hover:opacity-70 hover:!opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Filter className="w-2.5 h-2.5" />
        </button>
      )}

      {/* Anchor for ColumnFilterPopover */}
      {isPopoverOpen && (
        <div
          className={`absolute top-full mt-1 ${
            popoverAlign === 'right' ? 'right-0' : 'left-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <ColumnFilterPopover
            column={column}
            label={label}
            filters={filters}
            onFilterChange={onFilterChange}
            onClose={onCloseFilter}
            allTasks={allTasks}
            categories={categories}
            durationMode={durationMode}
            weekendDays={weekendDays}
          />
        </div>
      )}
    </div>
  );
};

export const WBSTable: React.FC<WBSTableProps> = ({
  tasks,
  allProjectTasks,
  rowHeight,
  categories,
  durationMode,
  weekendDays,
  criticalTaskIds,
  sortConfig,
  onSortChange,
  filters: parentFilters,
  onFilterChange: parentOnFilterChange,
  totalTaskCount,
  scrollRef,
  onScroll,
  onOpenDetails,
}) => {
  const { addTask, reorderTasks } = useProjectStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Controlled/Uncontrolled Sort State
  const [internalSort, setInternalSort] = useState<SortConfig>({ column: null, direction: 'asc' });
  const activeSort = sortConfig !== undefined ? sortConfig : internalSort;

  // Controlled/Uncontrolled Filter State
  const [internalFilters, setInternalFilters] = useState<TaskFilters>(INITIAL_FILTERS);
  const activeFilters = parentFilters !== undefined ? parentFilters : internalFilters;

  // Active open filter popover column name
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);

  // Toggle for Quick Filter Bar toolbar
  const [showQuickFilterBar, setShowQuickFilterBar] = useState<boolean>(false);

  const updateSort = (newConfig: SortConfig) => {
    if (onSortChange) onSortChange(newConfig);
    else setInternalSort(newConfig);
  };

  const updateFilters = (newFilters: TaskFilters) => {
    if (parentOnFilterChange) parentOnFilterChange(newFilters);
    else setInternalFilters(newFilters);
  };

  const handleSortClick = (column: SortColumn) => {
    const next = getNextSortConfig(activeSort, column);
    updateSort(next);
  };

  const handleClearSort = () => {
    updateSort({ column: null, direction: 'asc' });
  };

  const handleClearAllFilters = () => {
    updateFilters(INITIAL_FILTERS);
    setOpenFilterCol(null);
  };

  const isSorted = activeSort.column !== null;
  const activeFiltersCount = getActiveFiltersCount(activeFilters);
  const isFiltered = activeFiltersCount > 0;

  const datasetTasks = allProjectTasks || tasks;
  const totalCount = totalTaskCount ?? datasetTasks.length;

  const handleDragStart = (_e: React.DragEvent, index: number) => {
    if (isSorted || isFiltered) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isSorted || isFiltered) return;
    e.preventDefault();
  };

  const handleDrop = (_e: React.DragEvent, targetIndex: number) => {
    if (isSorted || isFiltered) return;
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderTasks(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  const handleQuickAddTask = () => {
    const today = getTodayUTC();
    const lastTask = tasks[tasks.length - 1];
    const startDate = lastTask ? lastTask.end : today;
    const endDate = addCalendarDays(startDate, 5);

    addTask({
      parentId: null,
      name: `New Task ${datasetTasks.length + 1}`,
      category: categories[0]?.name || 'General',
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

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex flex-col bg-slate-50 dark:bg-[#141b22] border-r border-slate-300/80 dark:border-slate-800 overflow-x-auto overflow-y-auto select-none"
      style={{ minWidth: '880px' }}
    >
      {/* Table Header (Two tiers to align with Gantt timeline header + collapsible Quick Filter Bar) */}
      <div className="sticky top-0 z-30 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800">
        {/* Tier 1 Header: Title, Active Filter & Sort Badges, Actions */}
        <div className="h-8 flex items-center justify-between px-3 border-b border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wider text-[11px] text-slate-500">
              Work Breakdown Structure (WBS)
            </span>

            {/* Total / Filtered items badge */}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isFiltered
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {isFiltered ? `${tasks.length} of ${totalCount} items` : `${tasks.length} items`}
            </span>

            {/* Quick Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowQuickFilterBar(!showQuickFilterBar)}
              title="Toggle Quick Filter Bar"
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                showQuickFilterBar || isFiltered
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
            </button>

            {/* Clear All Filters button if active */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                title="Clear all column filters"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-300/60 dark:border-slate-700 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
                <span>Reset Filters</span>
              </button>
            )}

            {/* Active Sort Pill with One-Click Clear */}
            {isSorted && (
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-150"
                title="Active column sorting. Click X to restore natural WBS order."
              >
                <ArrowDownUp className="w-3 h-3 shrink-0" />
                <span>
                  Sorted: {getColumnTitle(activeSort.column!)} (
                  {getColumnSortLabel(activeSort.column!, activeSort.direction)})
                </span>
                <button
                  type="button"
                  onClick={handleClearSort}
                  title="Clear sort and restore natural WBS order"
                  className="p-0.5 hover:bg-emerald-500/20 rounded transition-colors text-emerald-700 dark:text-emerald-300 ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleQuickAddTask}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>

        {/* Optional Collapsible Quick Filter Toolbar */}
        {showQuickFilterBar && (
          <QuickFilterBar
            filters={activeFilters}
            onFilterChange={updateFilters}
            categories={categories}
            allTasks={datasetTasks}
            totalCount={totalCount}
            filteredCount={tasks.length}
            onClose={() => setShowQuickFilterBar(false)}
          />
        )}

        {/* Tier 2 Header: Interactive Column Labels with Per-Column Sorting & Filtering */}
        <div className="h-9 flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <div className="w-7 text-center"></div>

          {/* WBS # */}
          <div className="w-9 px-0.5 text-center flex items-center justify-center">
            <ColumnHeader
              column="order"
              label="#"
              sortColumn="order"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="center"
              popoverAlign="left"
            />
          </div>

          {/* Task Name */}
          <div className="flex-1 min-w-[170px] px-1 flex items-center">
            <ColumnHeader
              column="name"
              label="Task Name"
              sortColumn="name"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="left"
              popoverAlign="left"
            />
          </div>

          {/* Category */}
          <div className="w-32 px-1 flex items-center">
            <ColumnHeader
              column="category"
              label="Category"
              sortColumn="category"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="left"
              popoverAlign="left"
            />
          </div>

          {/* Priority */}
          <div className="w-24 px-1 text-center flex items-center justify-center">
            <ColumnHeader
              column="priority"
              label="Priority"
              sortColumn="priority"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="center"
              popoverAlign="left"
            />
          </div>

          {/* Owner / Team */}
          <div className="w-44 px-1 flex items-center">
            <ColumnHeader
              column="assignee"
              label="Owner / Team"
              sortColumn="assignee"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="left"
              popoverAlign="left"
            />
          </div>

          {/* Start Date */}
          <div className="w-28 px-1 flex items-center">
            <ColumnHeader
              column="start"
              label="Start"
              sortColumn="start"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="left"
              popoverAlign="left"
            />
          </div>

          {/* End Date */}
          <div className="w-28 px-1 flex items-center">
            <ColumnHeader
              column="end"
              label="End"
              sortColumn="end"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="left"
              popoverAlign="left"
            />
          </div>

          {/* Duration */}
          <div className="w-14 text-center flex items-center justify-center">
            <ColumnHeader
              column="duration"
              label="Dur"
              sortColumn="duration"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="center"
              popoverAlign="left"
            />
          </div>

          {/* Effort */}
          <div className="w-16 px-0.5 text-center flex items-center justify-center">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Effort
            </span>
          </div>

          {/* Progress (%) */}
          <div className="w-16 px-0.5 text-center flex items-center justify-center">
            <ColumnHeader
              column="pct"
              label="%"
              sortColumn="pct"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="center"
              popoverAlign="right"
            />
          </div>

          {/* Status */}
          <div className="w-28 px-1 text-center flex items-center justify-center">
            <ColumnHeader
              column="status"
              label="Status"
              sortColumn="status"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="center"
              popoverAlign="right"
            />
          </div>

          {/* Predecessors */}
          <div className="w-20 px-1 text-center flex items-center justify-center">
            <ColumnHeader
              column="dependsOn"
              label="Pred"
              sortColumn="dependsOn"
              activeSort={activeSort}
              onSort={handleSortClick}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="center"
              popoverAlign="right"
            />
          </div>

          {/* Actions / Milestone Filter */}
          <div className="w-16 text-center flex items-center justify-center">
            <ColumnHeader
              column="actions"
              label="Act"
              activeSort={activeSort}
              filters={activeFilters}
              onOpenFilter={setOpenFilterCol}
              openFilterCol={openFilterCol}
              onFilterChange={updateFilters}
              onCloseFilter={() => setOpenFilterCol(null)}
              allTasks={datasetTasks}
              categories={categories}
              durationMode={durationMode}
              weekendDays={weekendDays}
              align="center"
              popoverAlign="right"
            />
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {tasks.length === 0 ? (
          isFiltered ? (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/20">
              <p className="font-semibold">No tasks match the active filters.</p>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="mt-2 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <EmptyState
              compact
              title="No Tasks in Work Breakdown Structure"
              description="This project currently has no task rows scheduled. Add your first task row to begin mapping dependencies and critical paths."
              primaryAction={{
                label: 'Add First Task Row',
                onClick: handleQuickAddTask,
                icon: <Plus className="w-4 h-4" />,
              }}
            />
          )
        ) : (
          tasks.map((task, idx) => (
            <WBSRow
              key={task.id}
              task={task}
              index={idx}
              rowHeight={rowHeight}
              categories={categories}
              allTasks={datasetTasks}
              durationMode={durationMode}
              weekendDays={weekendDays}
              isCritical={criticalTaskIds.has(task.id)}
              isSorted={isSorted || isFiltered}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onOpenDetails={onOpenDetails}
            />
          ))
        )}

        {/* Bottom Quick Add Bar */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={handleQuickAddTask}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Task Row</span>
          </button>
        </div>
      </div>
    </div>
  );
};

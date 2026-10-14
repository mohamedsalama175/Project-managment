import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { Task, CategoryDef, DurationMode } from '../../types';
import { WBSRow } from './WBSRow';
import { useProjectStore } from '../../stores/useProjectStore';
import { EmptyState } from '../common/EmptyState';
import {
  SortConfig,
  SortColumn,
} from '../../utils/sortUtils';
import {
  TaskFilters,
  INITIAL_FILTERS,
  isColumnFilterActive,
} from '../../utils/filterUtils';
import { ColumnFilterPopover } from './ColumnFilterPopover';

interface WBSTableProps {
  tasks: Task[];
  allProjectTasks?: Task[];
  rowHeight?: number;
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
  hoveredTaskId?: string | null;
  onRowHover?: (taskId: string | null) => void;
  onHoverPred?: (predId: string | null) => void;
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
    <div className={`relative h-full flex items-center justify-between group px-1 select-none ${className}`}>
      {/* Sortable Column Label Button */}
      {sortColumn && onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortColumn)}
          title={`Click to sort by ${label}`}
          className={`flex-1 flex items-center gap-1 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer truncate ${
            align === 'center' ? 'justify-center text-center' : 'justify-start text-left'
          } ${
            isSorted
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
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
            <ArrowUpDown className="w-2.5 h-2.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity text-slate-400" />
          )}
        </button>
      ) : (
        <span className={`flex-1 truncate ${align === 'center' ? 'text-center' : 'text-left'}`}>
          {label}
        </span>
      )}

      {/* Filter Button for this column */}
      {!hideFilter && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFilter(column);
          }}
          title={isFiltered ? `Active filter on ${label}. Click to modify.` : `Filter by ${label}`}
          className={`p-1 rounded transition-all shrink-0 ${
            isFiltered
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 opacity-100'
              : isPopoverOpen
              ? 'text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-800 opacity-100'
              : 'text-slate-400 opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Filter className="w-2.5 h-2.5 stroke-[2.5]" />
        </button>
      )}

      {/* Column Filter Popover */}
      {isPopoverOpen && (
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
      )}
    </div>
  );
};

export const WBSTable: React.FC<WBSTableProps> = ({
  tasks,
  allProjectTasks,
  rowHeight = 40,
  categories,
  durationMode,
  weekendDays,
  criticalTaskIds,
  sortConfig,
  onSortChange,
  filters,
  onFilterChange,
  totalTaskCount,
  scrollRef,
  onScroll,
  onOpenDetails,
  hoveredTaskId,
  onRowHover,
  onHoverPred,
}) => {
  const { reorderTasks } = useProjectStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);

  const datasetTasks = allProjectTasks || tasks;
  const isSorted = !!(sortConfig && sortConfig.column);
  const isFiltered = filters ? Object.values(filters).some((v) => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true)) : false;

  const activeSort: SortConfig = sortConfig || { column: null, direction: 'asc' };
  const activeFilters: TaskFilters = filters || INITIAL_FILTERS;

  const handleSortClick = (col: SortColumn) => {
    if (!onSortChange) return;
    let nextDir: 'asc' | 'desc' = 'asc';
    if (activeSort.column === col) {
      if (activeSort.direction === 'asc') nextDir = 'desc';
      else {
        onSortChange({ column: null, direction: 'asc' });
        return;
      }
    }
    onSortChange({ column: col, direction: nextDir });
  };

  const updateFilters = (newFilters: TaskFilters) => {
    onFilterChange?.(newFilters);
  };

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

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex flex-col h-full bg-slate-50 dark:bg-[#141b22] border-r border-slate-200 dark:border-slate-800 overflow-x-auto overflow-y-auto select-none"
      style={{ minWidth: '880px' }}
    >
      {/* 48px Sticky Column Header (Matches Timeline Two-Tier Header height: 24px + 24px = 48px) */}
      <div className="sticky top-0 z-20 h-12 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
        
        {/* 1. # (w-10 = 40px, sticky left: 0) */}
        <div
          style={{ width: '40px' }}
          className="sticky left-0 z-30 h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0"
        >
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
            hideFilter
          />
        </div>

        {/* 2. Task / Deliverable (min-w-[220px] max-w-[320px] flex-1, sticky left: 40px) */}
        <div
          style={{ left: '40px' }}
          className="sticky z-30 h-full min-w-[220px] max-w-[320px] flex-1 px-2.5 flex items-center bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"
        >
          <ColumnHeader
            column="name"
            label="Deliverable"
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

        {/* 3. Category (w-36 min-w-[130px]) */}
        <div className="w-36 min-w-[130px] px-2 flex items-center shrink-0">
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

        {/* 4. Priority (w-24) */}
        <div className="w-24 px-1 flex items-center justify-center shrink-0">
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

        {/* 5. Owner / Team (w-40) */}
        <div className="w-40 px-1 flex items-center shrink-0">
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

        {/* 6. Schedule (Start -> End) (w-44) */}
        <div className="w-44 px-1 flex items-center justify-center shrink-0">
          <ColumnHeader
            column="start"
            label="Schedule"
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
            align="center"
            popoverAlign="left"
          />
        </div>

        {/* 7. Dur. / Effort (w-28) */}
        <div className="w-28 px-1 flex items-center justify-center shrink-0">
          <ColumnHeader
            column="duration"
            label="Dur. / Eff"
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

        {/* 8. Progress & Status (w-36) */}
        <div className="w-36 px-1 flex items-center justify-center shrink-0">
          <ColumnHeader
            column="status"
            label="Status & %"
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

        {/* 9. Pred. (w-14) */}
        <div className="w-14 px-1 flex items-center justify-center shrink-0">
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
      </div>

      {/* Rows Container */}
      <div className="flex-1">
        {tasks.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No Deliverables Found"
              description={
                isFiltered
                  ? 'No tasks match your active filters. Try resetting column filters.'
                  : 'Get started by creating your first deliverable using + Add Deliverable.'
              }
            />
          </div>
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
              isRowHovered={hoveredTaskId === task.id}
              onRowHover={onRowHover}
              onHoverPred={onHoverPred}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onOpenDetails={onOpenDetails}
            />
          ))
        )}
      </div>
    </div>
  );
};

import { Task, TaskPriority, TaskStatus, DurationMode } from '../types';
import { calculateDuration } from './dateUtils';

export interface TaskFilters {
  orderMin?: number;
  orderMax?: number;
  name?: string;
  categories?: string[];
  priorities?: TaskPriority[];
  assignees?: string[];
  startFrom?: string;
  startTo?: string;
  endFrom?: string;
  endTo?: string;
  minDuration?: number;
  maxDuration?: number;
  minPct?: number;
  maxPct?: number;
  status?: TaskStatus[];
  predMode?: 'all' | 'has_pred' | 'no_pred';
  isMilestone?: 'all' | 'milestone_only' | 'task_only';
}

export const INITIAL_FILTERS: TaskFilters = {};

/**
 * Checks whether a filter is active for a given column name.
 */
export function isColumnFilterActive(filters: TaskFilters, column: string): boolean {
  switch (column) {
    case 'order':
      return filters.orderMin !== undefined || filters.orderMax !== undefined;
    case 'name':
      return Boolean(filters.name && filters.name.trim().length > 0);
    case 'category':
      return Boolean(filters.categories && filters.categories.length > 0);
    case 'priority':
      return Boolean(filters.priorities && filters.priorities.length > 0);
    case 'assignee':
      return Boolean(filters.assignees && filters.assignees.length > 0);
    case 'start':
      return Boolean(filters.startFrom || filters.startTo);
    case 'end':
      return Boolean(filters.endFrom || filters.endTo);
    case 'duration':
      return filters.minDuration !== undefined || filters.maxDuration !== undefined;
    case 'pct':
      return filters.minPct !== undefined || filters.maxPct !== undefined;
    case 'status':
      return Boolean(filters.status && filters.status.length > 0);
    case 'dependsOn':
      return Boolean(filters.predMode && filters.predMode !== 'all');
    case 'actions':
      return Boolean(filters.isMilestone && filters.isMilestone !== 'all');
    default:
      return false;
  }
}

/**
 * Returns total count of active column filters.
 */
export function getActiveFiltersCount(filters: TaskFilters): number {
  const columns = [
    'order',
    'name',
    'category',
    'priority',
    'assignee',
    'start',
    'end',
    'duration',
    'pct',
    'status',
    'dependsOn',
    'actions',
  ];
  return columns.filter((col) => isColumnFilterActive(filters, col)).length;
}

/**
 * Returns a new filters object with the specified column filter cleared.
 */
export function clearColumnFilter(filters: TaskFilters, column: string): TaskFilters {
  const next = { ...filters };
  switch (column) {
    case 'order':
      delete next.orderMin;
      delete next.orderMax;
      break;
    case 'name':
      delete next.name;
      break;
    case 'category':
      delete next.categories;
      break;
    case 'priority':
      delete next.priorities;
      break;
    case 'assignee':
      delete next.assignees;
      break;
    case 'start':
      delete next.startFrom;
      delete next.startTo;
      break;
    case 'end':
      delete next.endFrom;
      delete next.endTo;
      break;
    case 'duration':
      delete next.minDuration;
      delete next.maxDuration;
      break;
    case 'pct':
      delete next.minPct;
      delete next.maxPct;
      break;
    case 'status':
      delete next.status;
      break;
    case 'dependsOn':
      delete next.predMode;
      break;
    case 'actions':
      delete next.isMilestone;
      break;
  }
  return next;
}

/**
 * Filters the list of tasks according to active filter parameters.
 */
export function filterTasks(
  tasks: Task[],
  filters: TaskFilters,
  durationMode: DurationMode = 'working_days',
  weekendDays: number[] = [5, 6]
): Task[] {
  if (!tasks || tasks.length === 0) return [];
  if (getActiveFiltersCount(filters) === 0) return tasks;

  return tasks.filter((task) => {
    // 1. Order / ID
    if (filters.orderMin !== undefined && (task.order ?? 0) < filters.orderMin) {
      return false;
    }
    if (filters.orderMax !== undefined && (task.order ?? 0) > filters.orderMax) {
      return false;
    }

    // 2. Name search
    if (filters.name?.trim()) {
      const q = filters.name.trim().toLowerCase();
      if (!task.name.toLowerCase().includes(q)) return false;
    }

    // 3. Category
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(task.category)) return false;
    }

    // 4. Priority
    if (filters.priorities && filters.priorities.length > 0) {
      if (!filters.priorities.includes(task.priority || 'Medium')) return false;
    }

    // 5. Assignee
    if (filters.assignees && filters.assignees.length > 0) {
      const assignee = task.assignee || 'Unassigned';
      if (!filters.assignees.includes(assignee)) return false;
    }

    // 6. Start date range
    if (filters.startFrom && (!task.start || task.start < filters.startFrom)) {
      return false;
    }
    if (filters.startTo && (!task.start || task.start > filters.startTo)) {
      return false;
    }

    // 7. End date range
    if (filters.endFrom && (!task.end || task.end < filters.endFrom)) {
      return false;
    }
    if (filters.endTo && (!task.end || task.end > filters.endTo)) {
      return false;
    }

    // 8. Duration
    if (filters.minDuration !== undefined || filters.maxDuration !== undefined) {
      const dur = task.isMilestone ? 0 : calculateDuration(task.start, task.end, durationMode, weekendDays);
      if (filters.minDuration !== undefined && dur < filters.minDuration) {
        return false;
      }
      if (filters.maxDuration !== undefined && dur > filters.maxDuration) {
        return false;
      }
    }

    // 9. Progress (%)
    if (filters.minPct !== undefined && (task.pct ?? 0) < filters.minPct) {
      return false;
    }
    if (filters.maxPct !== undefined && (task.pct ?? 0) > filters.maxPct) {
      return false;
    }

    // 10. Status
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(task.status)) return false;
    }

    // 11. Predecessors
    if (filters.predMode && filters.predMode !== 'all') {
      const count = task.dependsOn?.length || 0;
      if (filters.predMode === 'has_pred' && count === 0) return false;
      if (filters.predMode === 'no_pred' && count > 0) return false;
    }

    // 12. Milestone / task type
    if (filters.isMilestone && filters.isMilestone !== 'all') {
      if (filters.isMilestone === 'milestone_only' && !task.isMilestone) return false;
      if (filters.isMilestone === 'task_only' && task.isMilestone) return false;
    }

    return true;
  });
}

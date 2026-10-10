import { Task, DurationMode } from '../types';
import { calculateDuration } from './dateUtils';

export type SortColumn =
  | 'order'
  | 'name'
  | 'category'
  | 'priority'
  | 'assignee'
  | 'start'
  | 'end'
  | 'duration'
  | 'pct'
  | 'status'
  | 'dependsOn';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: SortColumn | null;
  direction: SortDirection;
}

export const PRIORITY_WEIGHT: Record<string, number> = {
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export const STATUS_WEIGHT: Record<string, number> = {
  'Not Started': 1,
  'In Progress': 2,
  'Blocked': 3,
  'Completed': 4,
};

/**
 * Returns the most natural initial sort direction for each column type.
 * e.g., Priority starts with Urgent-first (desc), Progress starts with highest (desc),
 * Dates start with earliest-first (asc).
 */
export function getDefaultSortDirection(column: SortColumn): SortDirection {
  switch (column) {
    case 'priority':
    case 'pct':
    case 'duration':
    case 'dependsOn':
      return 'desc';
    case 'start':
    case 'end':
    case 'status':
    case 'name':
    case 'category':
    case 'assignee':
    case 'order':
    default:
      return 'asc';
  }
}

/**
 * Human-friendly column display title.
 */
export function getColumnTitle(column: SortColumn): string {
  switch (column) {
    case 'order':
      return 'WBS #';
    case 'name':
      return 'Task Name';
    case 'category':
      return 'Category';
    case 'priority':
      return 'Priority';
    case 'assignee':
      return 'Assignee';
    case 'start':
      return 'Start Date';
    case 'end':
      return 'End Date';
    case 'duration':
      return 'Duration';
    case 'pct':
      return 'Progress (%)';
    case 'status':
      return 'Status';
    case 'dependsOn':
      return 'Predecessors';
    default:
      return column;
  }
}

/**
 * Human-friendly description of the direction for a given column.
 */
export function getColumnSortLabel(column: SortColumn, direction: SortDirection): string {
  switch (column) {
    case 'priority':
      return direction === 'desc' ? 'Urgent → Low' : 'Low → Urgent';
    case 'start':
    case 'end':
      return direction === 'asc' ? 'Earliest → Latest' : 'Latest → Earliest';
    case 'pct':
      return direction === 'desc' ? '100% → 0%' : '0% → 100%';
    case 'status':
      return direction === 'asc' ? 'Not Started → Completed' : 'Completed → Not Started';
    case 'duration':
      return direction === 'desc' ? 'Longest → Shortest' : 'Shortest → Longest';
    case 'name':
    case 'category':
    case 'assignee':
      return direction === 'asc' ? 'A → Z' : 'Z → A';
    case 'order':
      return direction === 'asc' ? '1 → N (Natural)' : 'N → 1 (Reverse)';
    case 'dependsOn':
      return direction === 'desc' ? 'Most → Fewest' : 'Fewest → Most';
    default:
      return direction === 'asc' ? 'Ascending' : 'Descending';
  }
}

/**
 * Cycles through 3 sort states:
 * 1) Column's default direction
 * 2) Opposite direction
 * 3) Cleared (null, natural order)
 */
export function getNextSortConfig(current: SortConfig, column: SortColumn): SortConfig {
  if (current.column !== column) {
    return {
      column,
      direction: getDefaultSortDirection(column),
    };
  }

  const defaultDir = getDefaultSortDirection(column);
  if (current.direction === defaultDir) {
    return {
      column,
      direction: defaultDir === 'asc' ? 'desc' : 'asc',
    };
  }

  // 3rd click: clear sort
  return {
    column: null,
    direction: 'asc',
  };
}

/**
 * Sorts an array of tasks according to the given sort configuration.
 */
export function sortTasks(
  tasks: Task[],
  config: SortConfig,
  durationMode: DurationMode = 'working_days',
  weekendDays: number[] = [5, 6]
): Task[] {
  if (!tasks || tasks.length === 0) return [];

  const copy = [...tasks];

  if (!config.column) {
    return copy.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  const { column, direction } = config;

  return copy.sort((a, b) => {
    let diff = 0;

    switch (column) {
      case 'priority': {
        const aWeight = PRIORITY_WEIGHT[a.priority || 'Medium'] ?? 2;
        const bWeight = PRIORITY_WEIGHT[b.priority || 'Medium'] ?? 2;
        diff = direction === 'asc' ? aWeight - bWeight : bWeight - aWeight;
        break;
      }

      case 'start': {
        const aVal = a.start || '';
        const bVal = b.start || '';
        if (!aVal && !bVal) diff = 0;
        else if (!aVal) diff = 1;
        else if (!bVal) diff = -1;
        else diff = direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        break;
      }

      case 'end': {
        const aVal = a.end || '';
        const bVal = b.end || '';
        if (!aVal && !bVal) diff = 0;
        else if (!aVal) diff = 1;
        else if (!bVal) diff = -1;
        else diff = direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        break;
      }

      case 'pct': {
        const aVal = a.pct ?? 0;
        const bVal = b.pct ?? 0;
        diff = direction === 'asc' ? aVal - bVal : bVal - aVal;
        break;
      }

      case 'status': {
        const aVal = STATUS_WEIGHT[a.status] ?? 0;
        const bVal = STATUS_WEIGHT[b.status] ?? 0;
        diff = direction === 'asc' ? aVal - bVal : bVal - aVal;
        break;
      }

      case 'duration': {
        const aDur = a.isMilestone ? 0 : calculateDuration(a.start, a.end, durationMode, weekendDays);
        const bDur = b.isMilestone ? 0 : calculateDuration(b.start, b.end, durationMode, weekendDays);
        diff = direction === 'asc' ? aDur - bDur : bDur - aDur;
        break;
      }

      case 'name': {
        const aVal = a.name || '';
        const bVal = b.name || '';
        diff = direction === 'asc'
          ? aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
          : bVal.localeCompare(aVal, undefined, { sensitivity: 'base' });
        break;
      }

      case 'category': {
        const aVal = a.category || '';
        const bVal = b.category || '';
        diff = direction === 'asc'
          ? aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
          : bVal.localeCompare(aVal, undefined, { sensitivity: 'base' });
        break;
      }

      case 'assignee': {
        const aVal = a.assignee || '';
        const bVal = b.assignee || '';
        diff = direction === 'asc'
          ? aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
          : bVal.localeCompare(aVal, undefined, { sensitivity: 'base' });
        break;
      }

      case 'dependsOn': {
        const aCount = a.dependsOn?.length || 0;
        const bCount = b.dependsOn?.length || 0;
        diff = direction === 'asc' ? aCount - bCount : bCount - aCount;
        break;
      }

      case 'order': {
        const aOrder = a.order || 0;
        const bOrder = b.order || 0;
        diff = direction === 'asc' ? aOrder - bOrder : bOrder - aOrder;
        break;
      }

      default:
        diff = 0;
    }

    if (diff !== 0) return diff;
    // Stable tie-breaker by original order
    return (a.order || 0) - (b.order || 0);
  });
}

import { DurationMode, Task } from '../types';

export const MS_PER_DAY = 86400000;

/**
 * Parses YYYY-MM-DD string into a Date object at UTC midnight to prevent timezone shifting.
 */
export function parseDateUTC(str: string): Date {
  if (!str) return new Date();
  const parts = str.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(Date.UTC(year, month, day));
}

/**
 * Formats a Date object into YYYY-MM-DD string using UTC values.
 */
export function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD UTC.
 */
export function getTodayUTC(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Checks if a given Date is a weekend day based on the project's configured weekend days.
 * Note: getUTCDay returns 0 for Sunday, 1 for Monday, ..., 5 for Friday, 6 for Saturday.
 */
export function isWeekendDay(date: Date, weekendDays: number[]): boolean {
  return weekendDays.includes(date.getUTCDay());
}

/**
 * Calculates duration between start and end date inclusive.
 */
export function calculateDuration(
  startDateStr: string,
  endDateStr: string,
  mode: DurationMode,
  weekendDays: number[] = [5, 6]
): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = parseDateUTC(startDateStr);
  const end = parseDateUTC(endDateStr);

  if (end.getTime() < start.getTime()) return 0;

  if (mode === 'calendar') {
    const diffTime = end.getTime() - start.getTime();
    return Math.round(diffTime / MS_PER_DAY) + 1;
  }

  // working_days mode
  let count = 0;
  const cur = new Date(start.getTime());
  while (cur.getTime() <= end.getTime()) {
    if (!isWeekendDay(cur, weekendDays)) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return Math.max(1, count);
}

/**
 * Adds calendar days to a date string.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const d = parseDateUTC(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateUTC(d);
}

/**
 * Adds working days to a start date, skipping configured weekend days.
 */
export function addWorkingDays(
  startDateStr: string,
  workingDays: number,
  weekendDays: number[] = [5, 6]
): string {
  if (workingDays <= 1) return startDateStr;
  const cur = parseDateUTC(startDateStr);
  let added = 1;

  while (added < workingDays) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (!isWeekendDay(cur, weekendDays)) {
      added++;
    }
  }

  return formatDateUTC(cur);
}

/**
 * Returns difference in calendar days between two date strings (end - start).
 */
export function diffCalendarDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const start = parseDateUTC(startStr);
  const end = parseDateUTC(endStr);
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Checks if a task is overdue (end date earlier than today and not 100% completed).
 */
export function isTaskOverdue(task: Task, todayStr = getTodayUTC()): boolean {
  if (task.pct >= 100 || task.status === 'Completed') return false;
  if (!task.end) return false;
  return task.end < todayStr;
}

/**
 * Computes baseline variance across all tasks in a project.
 */
export function getBaselineVariance(tasks: Task[]): {
  totalSlippageDays: number;
  driftedTasksCount: number;
  aheadTasksCount: number;
} {
  let totalSlippageDays = 0;
  let driftedTasksCount = 0;
  let aheadTasksCount = 0;

  for (const t of tasks) {
    if (t.baselineEnd && t.end) {
      const diff = diffCalendarDays(t.baselineEnd, t.end);
      if (diff > 0) {
        totalSlippageDays += diff;
        driftedTasksCount++;
      } else if (diff < 0) {
        aheadTasksCount++;
      }
    }
  }

  return { totalSlippageDays, driftedTasksCount, aheadTasksCount };
}

/**
 * Month names for two-tier timeline header.
 */
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Day of week short names.
 */
export const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

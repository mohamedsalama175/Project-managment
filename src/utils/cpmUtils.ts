import { Task, TaskCPMInfo } from '../types';
import { diffCalendarDays, addCalendarDays, parseDateUTC } from './dateUtils';

/**
 * Calculates Critical Path Method (CPM) metrics for tasks.
 * Evaluates Early Start, Early Finish, Late Start, Late Finish, and Total Float.
 * Returns a map of TaskId -> TaskCPMInfo.
 */
export function calculateCPM(tasks: Task[]): Map<string, TaskCPMInfo> {
  const result = new Map<string, TaskCPMInfo>();
  if (!tasks.length) return result;

  // Build lookup
  const taskMap = new Map<string, Task>();
  const successorMap = new Map<string, string[]>();

  tasks.forEach(t => {
    taskMap.set(t.id, t);
    successorMap.set(t.id, []);
  });

  tasks.forEach(t => {
    if (t.dependsOn && t.dependsOn.length > 0) {
      t.dependsOn.forEach(predId => {
        if (successorMap.has(predId)) {
          successorMap.get(predId)!.push(t.id);
        }
      });
    }
  });

  // Find baseline anchor date (earliest start date across all tasks)
  let minStartMs = Infinity;
  tasks.forEach(t => {
    if (t.start) {
      const ms = parseDateUTC(t.start).getTime();
      if (ms < minStartMs) minStartMs = ms;
    }
  });
  if (minStartMs === Infinity) minStartMs = Date.now();

  const minStartDateStr = new Date(minStartMs).toISOString().slice(0, 10);

  // Helper to compute duration in days
  const getDuration = (t: Task): number => {
    if (t.isMilestone) return 0;
    const diff = diffCalendarDays(t.start, t.end);
    return Math.max(1, diff + 1);
  };

  // Forward Pass
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  const computeForward = (taskId: string, visited: Set<string>): void => {
    if (earlyFinish.has(taskId)) return;
    if (visited.has(taskId)) return; // prevent cyclic hang
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    let maxPredEF = 0;
    if (task.dependsOn && task.dependsOn.length > 0) {
      for (const predId of task.dependsOn) {
        if (taskMap.has(predId)) {
          computeForward(predId, visited);
          const pEF = earlyFinish.get(predId) ?? 0;
          if (pEF > maxPredEF) maxPredEF = pEF;
        }
      }
    } else {
      // Relative offset from minStartDate
      maxPredEF = Math.max(0, diffCalendarDays(minStartDateStr, task.start));
    }

    const duration = getDuration(task);
    const es = maxPredEF;
    const ef = es + (duration > 0 ? duration - 1 : 0);

    earlyStart.set(taskId, es);
    earlyFinish.set(taskId, ef);
  };

  tasks.forEach(t => {
    computeForward(t.id, new Set());
  });

  // Project max finish
  let projectFinish = 0;
  tasks.forEach(t => {
    const ef = earlyFinish.get(t.id) ?? 0;
    if (ef > projectFinish) projectFinish = ef;
  });

  // Backward Pass
  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();

  const computeBackward = (taskId: string, visited: Set<string>): void => {
    if (lateStart.has(taskId)) return;
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    const successors = successorMap.get(taskId) ?? [];
    let minSuccLS = projectFinish;

    if (successors.length > 0) {
      for (const succId of successors) {
        if (taskMap.has(succId)) {
          computeBackward(succId, visited);
          const sLS = lateStart.get(succId) ?? projectFinish;
          if (sLS < minSuccLS) minSuccLS = sLS;
        }
      }
    }

    const duration = getDuration(task);
    const lf = minSuccLS;
    const ls = lf - (duration > 0 ? duration - 1 : 0);

    lateFinish.set(taskId, lf);
    lateStart.set(taskId, ls);
  };

  tasks.forEach(t => {
    computeBackward(t.id, new Set());
  });

  // Calculate float and mark critical path
  tasks.forEach(t => {
    const es = earlyStart.get(t.id) ?? 0;
    const ef = earlyFinish.get(t.id) ?? 0;
    const ls = lateStart.get(t.id) ?? 0;
    const lf = lateFinish.get(t.id) ?? 0;
    const totalFloat = Math.max(0, ls - es);

    result.set(t.id, {
      taskId: t.id,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloat,
      isCritical: totalFloat <= 0,
    });
  });

  return result;
}

/**
 * Auto-schedules successor tasks to push forward if predecessor end date changes.
 * Enforces Finish-to-Start constraints (successor start >= predecessor end + 1 day).
 */
export function autoScheduleSuccessors(
  changedTaskId: string,
  updatedTasks: Task[]
): Task[] {
  const taskMap = new Map<string, Task>();
  updatedTasks.forEach(t => taskMap.set(t.id, { ...t }));

  const queue = [changedTaskId];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (processed.has(currentId)) continue;
    processed.add(currentId);

    const currentTask = taskMap.get(currentId);
    if (!currentTask || !currentTask.end) continue;

    // Find all tasks that depend on currentTask
    taskMap.forEach(task => {
      if (task.dependsOn && task.dependsOn.includes(currentId)) {
        // Predecessor finishes on currentTask.end
        // Successor must start at least the next day
        const minSuccessorStart = addCalendarDays(currentTask.end, 1);
        if (task.start < minSuccessorStart) {
          const duration = diffCalendarDays(task.start, task.end);
          task.start = minSuccessorStart;
          task.end = addCalendarDays(minSuccessorStart, Math.max(0, duration));
          queue.push(task.id);
        }
      }
    });
  }

  return Array.from(taskMap.values());
}

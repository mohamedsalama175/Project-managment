import { Task, TeamMember, ProjectConfig } from '../types';
import { diffCalendarDays } from './dateUtils';

export interface MemberWorkloadSummary {
  memberId: string;
  totalAssignedHours: number;
  weeklyCapacityHours: number;
  utilizationPercentage: number;
  activeTaskCount: number;
  overallocated: boolean;
  onLeave: boolean;
  unestimatedTaskCount: number;
  overtimeTaskCount: number;
}

export interface TaskWorkloadBreakdown {
  taskId: string;
  taskName: string;
  projectName?: string;
  role: 'primary' | 'contributor';
  assignedHours: number;
  start: string;
  end: string;
  isUnestimated: boolean;
  isOvertimeSchedule: boolean;
}

/**
 * Calculates member's assigned hours for a given task.
 */
export function getMemberTaskHours(task: Task, memberId: string): number {
  let hours = 0;

  // Check if primary owner
  if (task.primaryOwnerId === memberId) {
    if (task.primaryOwnerHours !== undefined && task.primaryOwnerHours !== null) {
      hours += task.primaryOwnerHours;
    } else if (task.estimatedHours !== undefined && task.estimatedHours !== null) {
      // If no explicit primaryOwnerHours but task has estimatedHours and no contributor allocations
      const totalContrib = (task.contributorAllocations || []).reduce(
        (sum, c) => sum + (c.allocatedHours || 0),
        0
      );
      hours += Math.max(0, task.estimatedHours - totalContrib);
    }
  }

  // Check if contributor
  const contrib = (task.contributorAllocations || []).find((c) => c.memberId === memberId);
  if (contrib && contrib.allocatedHours > 0) {
    hours += contrib.allocatedHours;
  }

  return hours;
}

/**
 * Checks if a task is scheduled entirely across non-working days.
 */
export function isTaskEntirelyNonWorkingDays(
  task: Task,
  weekendDays: number[] = [5, 6]
): boolean {
  let cur = new Date(task.start);
  const end = new Date(task.end);
  let workingDayCount = 0;

  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    if (!weekendDays.includes(dayOfWeek)) {
      workingDayCount++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return workingDayCount === 0;
}

/**
 * Computes workload statistics for a specific team member across a list of tasks.
 */
export function calculateMemberWorkload(
  member: TeamMember,
  tasks: Task[],
  weekendDays: number[] = [5, 6]
): MemberWorkloadSummary {
  let totalAssignedHours = 0;
  let activeTaskCount = 0;
  let unestimatedTaskCount = 0;
  let overtimeTaskCount = 0;

  for (const t of tasks) {
    // Only count tasks that are not yet completed
    if (t.status === 'Completed') continue;

    const isPrimary = t.primaryOwnerId === member.id;
    const isContributor = (t.contributorAllocations || []).some((c) => c.memberId === member.id);

    if (isPrimary || isContributor) {
      activeTaskCount++;

      if (t.estimatedHours === null || t.estimatedHours === undefined) {
        unestimatedTaskCount++;
      }

      if (isTaskEntirelyNonWorkingDays(t, weekendDays)) {
        overtimeTaskCount++;
      }

      const assigned = getMemberTaskHours(t, member.id);
      totalAssignedHours += assigned;
    }
  }

  const capacity = member.weeklyCapacityHours || 0;
  const onLeave = member.status === 'on_leave' || capacity === 0;
  const utilizationPercentage = capacity > 0
    ? Math.round((totalAssignedHours / capacity) * 100)
    : totalAssignedHours > 0 ? 999 : 0;

  const overallocated = utilizationPercentage > 100;

  return {
    memberId: member.id,
    totalAssignedHours: Math.round(totalAssignedHours * 10) / 10,
    weeklyCapacityHours: capacity,
    utilizationPercentage,
    activeTaskCount,
    overallocated,
    onLeave,
    unestimatedTaskCount,
    overtimeTaskCount,
  };
}

/**
 * Returns breakdown of all tasks a member is currently assigned to.
 */
export function getMemberTaskBreakdown(
  memberId: string,
  tasks: Task[],
  weekendDays: number[] = [5, 6]
): TaskWorkloadBreakdown[] {
  const breakdown: TaskWorkloadBreakdown[] = [];

  for (const t of tasks) {
    if (t.status === 'Completed') continue;

    const isPrimary = t.primaryOwnerId === memberId;
    const isContributor = (t.contributorAllocations || []).some((c) => c.memberId === memberId);

    if (isPrimary || isContributor) {
      breakdown.push({
        taskId: t.id,
        taskName: t.name,
        role: isPrimary ? 'primary' : 'contributor',
        assignedHours: getMemberTaskHours(t, memberId),
        start: t.start,
        end: t.end,
        isUnestimated: t.estimatedHours === null || t.estimatedHours === undefined,
        isOvertimeSchedule: isTaskEntirelyNonWorkingDays(t, weekendDays),
      });
    }
  }

  return breakdown;
}

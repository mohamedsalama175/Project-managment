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
 * Helper to test if a member is primary owner for a task (by ID or name matching).
 */
export function isMemberPrimaryForTask(task: Task, member: { id: string; name?: string }): boolean {
  if (task.primaryOwnerId && task.primaryOwnerId === member.id) return true;
  if ((task as any).primaryOwner?.id && (task as any).primaryOwner.id === member.id) return true;

  const m = (member.name || '').toLowerCase().trim();
  if (!m) return false;

  if (task.assignee && task.assignee !== 'Unassigned') {
    const a = task.assignee.toLowerCase().trim();
    if (!a) return false;
    if (a === m) return true;
    if (m.length >= 3 && a.includes(m)) return true;
    if (a.length >= 3 && m.includes(a)) return true;

    const aParts = a.split(/\s+/).filter(Boolean);
    const mParts = m.split(/\s+/).filter(Boolean);
    if (aParts.length > 0 && mParts.length > 0 && aParts[0] === mParts[0]) {
      if (aParts.length > 1 && mParts.length > 1 && aParts[1][0] === mParts[1][0]) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculates member's assigned hours for a given task.
 */
export function getMemberTaskHours(task: Task, memberId: string, memberName?: string): number {
  let hours = 0;

  const isPrimary = task.primaryOwnerId === memberId
    || ((task as any).primaryOwner?.id === memberId)
    || (!!memberName && isMemberPrimaryForTask(task, { id: memberId, name: memberName }));

  // Check if primary owner
  if (isPrimary) {
    if (task.primaryOwnerHours !== undefined && task.primaryOwnerHours !== null) {
      hours += task.primaryOwnerHours;
    } else if (task.estimatedHours !== undefined && task.estimatedHours !== null && task.estimatedHours > 0) {
      // If no explicit primaryOwnerHours but task has estimatedHours and no contributor allocations
      const totalContrib = (task.contributorAllocations || []).reduce(
        (sum, c) => sum + (c.allocatedHours || 0),
        0
      );
      hours += Math.max(0, task.estimatedHours - totalContrib);
    } else {
      // Fallback: estimate based on working days duration (realistic 8h per working day baseline, max 16h for unestimated deliverable)
      const days = Math.max(1, diffCalendarDays(task.start, task.end) + 1);
      const estTotal = days === 1 ? 8 : Math.min(16, Math.max(8, days * 2));
      const totalContrib = (task.contributorAllocations || []).reduce(
        (sum, c) => sum + (c.allocatedHours || 0),
        0
      );
      hours += Math.max(0, estTotal - totalContrib);
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

    const isPrimary = isMemberPrimaryForTask(t, member);
    const isContributor = (t.contributorAllocations || []).some((c) => c.memberId === member.id);

    if (isPrimary || isContributor) {
      activeTaskCount++;

      if (t.estimatedHours === null || t.estimatedHours === undefined) {
        unestimatedTaskCount++;
      }

      if (isTaskEntirelyNonWorkingDays(t, weekendDays)) {
        overtimeTaskCount++;
      }

      const assigned = getMemberTaskHours(t, member.id, member.name);
      totalAssignedHours += assigned;
    }
  }

  const capacity = member.weeklyCapacityHours || 40;
  const onLeave = member.status === 'on_leave' || capacity === 0;
  const utilizationPercentage = capacity > 0
    ? Math.round((totalAssignedHours / capacity) * 100)
    : totalAssignedHours > 0 ? 100 : 0;

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
  weekendDays: number[] = [5, 6],
  memberName?: string
): TaskWorkloadBreakdown[] {
  const breakdown: TaskWorkloadBreakdown[] = [];

  for (const t of tasks) {
    if (t.status === 'Completed') continue;

    const isPrimary = isMemberPrimaryForTask(t, { id: memberId, name: memberName || '' });
    const isContributor = (t.contributorAllocations || []).some((c) => c.memberId === memberId);

    if (isPrimary || isContributor) {
      breakdown.push({
        taskId: t.id,
        taskName: t.name,
        role: isPrimary ? 'primary' : 'contributor',
        assignedHours: getMemberTaskHours(t, memberId, memberName),
        start: t.start,
        end: t.end,
        isUnestimated: t.estimatedHours === null || t.estimatedHours === undefined,
        isOvertimeSchedule: isTaskEntirelyNonWorkingDays(t, weekendDays),
      });
    }
  }

  return breakdown;
}

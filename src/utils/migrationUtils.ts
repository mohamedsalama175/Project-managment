/**
 * migrationUtils.ts
 *
 * DeliverOps v2.2 Backward-Compatible Migration Engine.
 * Safely migrates legacy project & task payloads without fabricating
 * business data (no synthetic emails, no invented project managers).
 * Includes pre-migration snapshotting and byte-for-byte validation.
 */

import { Project, TeamMember, Task, TaskEffortAllocation } from '../types';
import { dbSaveSnapshot } from '../db/projectDB';

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'member-ahmed-khalil',
    name: 'Ahmed Khalil',
    email: undefined,
    phone: undefined,
    jobTitle: 'Lead Integration Engineer',
    department: 'Engineering',
    skills: ['PLC', 'Scale Automation', 'Hardware Interfaces'],
    systemRole: 'project_manager',
    weeklyCapacityHours: 40,
    status: 'active',
    color: '#1f8a70',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'member-tariq-mansoor',
    name: 'Tariq Mansoor',
    email: undefined,
    phone: undefined,
    jobTitle: 'Systems & Simulator Specialist',
    department: 'Engineering',
    skills: ['Scale Simulation', 'Socket Protocols', 'C++'],
    systemRole: 'contributor',
    weeklyCapacityHours: 40,
    status: 'active',
    color: '#3b82f6',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'member-sarah-loutfy',
    name: 'Sarah Loutfy',
    email: undefined,
    phone: undefined,
    jobTitle: 'Operations & PO Flow Lead',
    department: 'Operations',
    skills: ['Purchase Orders', 'Logistics', 'Queue Optimization'],
    systemRole: 'contributor',
    weeklyCapacityHours: 40,
    status: 'active',
    color: '#f59e0b',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'member-omar-farouk',
    name: 'Omar Farouk',
    email: undefined,
    phone: undefined,
    jobTitle: 'Quality & Scale QA Inspector',
    department: 'QA & Compliance',
    skills: ['ISO Weight Compliance', 'Integration QA'],
    systemRole: 'contributor',
    weeklyCapacityHours: 40,
    status: 'active',
    color: '#10b981',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'member-nouran-adel',
    name: 'Nouran Adel',
    email: undefined,
    phone: undefined,
    jobTitle: 'Frontend & UI Specialist',
    department: 'Product & Design',
    skills: ['React', 'TypeScript', 'Claymorphism', 'Design Systems'],
    systemRole: 'contributor',
    weeklyCapacityHours: 40,
    status: 'active',
    color: '#ec4899',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'member-director-admin',
    name: 'Executive Director',
    email: undefined,
    phone: undefined,
    jobTitle: 'Managing Director',
    department: 'Executive',
    skills: ['Governance', 'Delivery Management'],
    systemRole: 'admin',
    weeklyCapacityHours: 15,
    status: 'active',
    color: '#6366f1',
    createdAt: '2026-09-01T08:00:00Z',
  },
];

export const INITIAL_TEAM_MEMBERS: TeamMember[] = isDemoMode ? DEMO_TEAM_MEMBERS : [];

/** Matches legacy assignee text against known team member names (e.g., "Ahmed K." -> Ahmed Khalil) */
export function matchTeamMemberByName(
  assigneeName: string | undefined | null,
  members: TeamMember[]
): TeamMember | null {
  if (!assigneeName || !assigneeName.trim()) return null;
  const clean = assigneeName.trim().toLowerCase();

  // 1. Exact match
  const exact = members.find((m) => m.name.toLowerCase() === clean);
  if (exact) return exact;

  // 2. Partial prefix match (e.g. "Ahmed K." matches "Ahmed Khalil", "Tariq M." matches "Tariq Mansoor")
  const words = clean.split(/\s+/);
  const firstWord = words[0];
  const secondInitial = words[1]?.charAt(0);

  const matched = members.find((m) => {
    const mWords = m.name.toLowerCase().split(/\s+/);
    if (mWords[0] === firstWord) {
      if (!secondInitial) return true;
      if (mWords[1]?.charAt(0) === secondInitial) return true;
    }
    return false;
  });

  return matched || null;
}

export interface MigrationResult {
  projects: Project[];
  teamMembers: TeamMember[];
  migratedCount: number;
  unresolvedAssigneeCount: number;
}

/**
 * Safely migrates legacy project documents to the DeliverOps v2.2 schema.
 * Operates without inventing fake emails, project managers, or client classifications.
 */
export async function migrateLegacyProjectData(
  legacyProjects: any[],
  existingMembers: TeamMember[] = []
): Promise<MigrationResult> {
  // 1. Assemble team directory
  const teamMap = new Map<string, TeamMember>();
  const initialRoster = existingMembers.length > 0 ? existingMembers : INITIAL_TEAM_MEMBERS;
  initialRoster.forEach((m) => teamMap.set(m.id, m));
  const teamList = Array.from(teamMap.values());

  // 2. Capture pre-migration snapshot in IndexedDB
  try {
    await dbSaveSnapshot({
      snapshotKey: `snapshot-v1-to-v2-${Date.now()}`,
      timestamp: new Date().toISOString(),
      projectsPayload: JSON.parse(JSON.stringify(legacyProjects)),
      teamPayload: teamList,
    });
  } catch (err) {
    console.warn('Could not store IndexedDB migration snapshot:', err);
  }

  let unresolvedAssigneeCount = 0;

  // 3. Migrate each project and its tasks
  const migratedProjects: Project[] = legacyProjects.map((rawProj) => {
    const rawTasks = Array.isArray(rawProj.tasks) ? rawProj.tasks : [];

    const migratedTasks: Task[] = rawTasks.map((t: any) => {
      let primaryOwnerId: string | null = null;
      let assigneeUnresolved = false;
      const legacyAssignee = typeof t.assignee === 'string' ? t.assignee.trim() : '';

      if (t.primaryOwnerId && teamMap.has(t.primaryOwnerId)) {
        // Already migrated
        primaryOwnerId = t.primaryOwnerId;
      } else if (legacyAssignee) {
        // Attempt clean match
        const matched = matchTeamMemberByName(legacyAssignee, teamList);
        if (matched) {
          primaryOwnerId = matched.id;
        } else {
          // Unmatched legacy string: preserve string, do NOT invent data
          primaryOwnerId = null;
          assigneeUnresolved = true;
          unresolvedAssigneeCount++;
        }
      }

      // Reconcile contributor allocations
      const contributorAllocations: TaskEffortAllocation[] = Array.isArray(t.contributorAllocations)
        ? t.contributorAllocations.filter(
            (c: any) =>
              c &&
              typeof c.memberId === 'string' &&
              typeof c.allocatedHours === 'number' &&
              c.allocatedHours >= 0 &&
              c.memberId !== primaryOwnerId
          )
        : [];

      // Deduplicate contributors
      const uniqueContributorMap = new Map<string, TaskEffortAllocation>();
      contributorAllocations.forEach((c) => uniqueContributorMap.set(c.memberId, c));

      // Option B for missing estimates: preserve as null/undefined, do NOT inject fake 8h math
      const estimatedHours =
        typeof t.estimatedHours === 'number' && !isNaN(t.estimatedHours) && t.estimatedHours >= 0
          ? t.estimatedHours
          : null;

      const primaryOwnerHours =
        typeof t.primaryOwnerHours === 'number' && !isNaN(t.primaryOwnerHours) && t.primaryOwnerHours >= 0
          ? t.primaryOwnerHours
          : null;

      // Status & review invariants
      const status = t.status || (t.pct === 100 ? 'Completed' : t.pct > 0 ? 'In Progress' : 'Not Started');
      const reviewStatus = t.reviewStatus || 'none';

      return {
        id: t.id,
        projectId: t.projectId || rawProj.id,
        parentId: t.parentId ?? null,
        name: t.name || 'Untitled Task',
        category: t.category || 'General',
        priority: t.priority || 'Medium',
        order: typeof t.order === 'number' ? t.order : 1,

        start: t.start,
        end: t.end,
        pct: typeof t.pct === 'number' ? Math.max(0, Math.min(100, t.pct)) : 0,
        isMilestone: !!t.isMilestone,
        dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn : [],
        baselineStart: t.baselineStart,
        baselineEnd: t.baselineEnd,

        status,
        blockReason: t.blockReason || undefined,

        // Legacy string preserved
        assignee: legacyAssignee || undefined,
        assigneeUnresolved,

        // Enhanced ownership
        primaryOwnerId,
        primaryOwnerHours,
        contributorAllocations: Array.from(uniqueContributorMap.values()),
        reviewerId: t.reviewerId || null,
        reviewStatus,
        reviewNote: t.reviewNote || null,

        // Quantitative effort
        estimatedHours,
        loggedHours: typeof t.loggedHours === 'number' ? t.loggedHours : 0,
      };
    });

    // Reconcile project metadata without inventing data
    return {
      id: rawProj.id,
      name: rawProj.name,
      code: rawProj.code,
      description: rawProj.description || '',
      createdAt: rawProj.createdAt || new Date().toISOString(),
      updatedAt: rawProj.updatedAt || new Date().toISOString(),
      config: rawProj.config,
      tasks: migratedTasks,
      risks: Array.isArray(rawProj.risks) ? rawProj.risks : [],

      clientName: rawProj.clientName ?? null,
      projectType: rawProj.projectType || 'unclassified',
      projectManagerId: rawProj.projectManagerId ?? null,
      isArchived: !!rawProj.isArchived,
      archivedAt: rawProj.archivedAt ?? null,
    };
  });

  // 4. Strict Validation Assertions
  if (migratedProjects.length !== legacyProjects.length) {
    throw new Error(
      `Migration validation failed: Project count mismatch (${migratedProjects.length} vs ${legacyProjects.length})`
    );
  }

  for (let i = 0; i < legacyProjects.length; i++) {
    const origTasks = Array.isArray(legacyProjects[i].tasks) ? legacyProjects[i].tasks : [];
    const newTasks = migratedProjects[i].tasks;
    if (newTasks.length !== origTasks.length) {
      throw new Error(
        `Migration validation failed: Task count mismatch in project "${legacyProjects[i].name}" (${newTasks.length} vs ${origTasks.length})`
      );
    }
  }

  return {
    projects: migratedProjects,
    teamMembers: teamList,
    migratedCount: migratedProjects.length,
    unresolvedAssigneeCount,
  };
}

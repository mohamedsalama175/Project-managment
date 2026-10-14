import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Project,
  ProjectStore,
  Task,
  TaskPriority,
  ThemeMode,
  ActiveView,
  UserRole,
  TeamMember,
  AuditLogEntry,
  AuditAction,
  TaskComment,
  ProjectRisk,
} from '../types';
import { autoScheduleSuccessors } from '../utils/cpmUtils';
import { getTodayUTC } from '../utils/dateUtils';
import {
  dbSaveProject,
  dbDeleteProject,
  dbSaveAllProjects,
  dbLoadAllProjects,
  dbLogAudit,
  dbLoadAuditLogs,
  dbSaveTeamMember,
  dbLoadAllTeamMembers,
  dbDeleteTeamMember,
  dbSaveAllTeamMembers,
  dbSaveComment,
  dbDeleteComment,
  dbLoadTaskComments,
} from '../db/projectDB';
import {
  isDemoMode,
  INITIAL_TEAM_MEMBERS,
  migrateLegacyProjectData,
} from '../utils/migrationUtils';
import { useAuthStore } from './useAuthStore';

/** Silently syncs a project to IndexedDB — errors are non-fatal. */
function syncToDB(project: Project): void {
  dbSaveProject(project).catch(() => {});
}

/** Silently removes a project from IndexedDB — errors are non-fatal. */
function deleteFromDB(id: string): void {
  dbDeleteProject(id).catch(() => {});
}

/** Initialise IndexedDB with the current store state on first load and run safe migration. */
export async function hydrateIndexedDB(projects: Project[]): Promise<void> {
  try {
    const existing = await dbLoadAllProjects();
    const existingMembers = await dbLoadAllTeamMembers();

    if (existing.length === 0 && projects.length > 0) {
      // Run migration engine on initial payload
      const migrated = await migrateLegacyProjectData(projects, existingMembers);
      await dbSaveAllProjects(migrated.projects);
      await dbSaveAllTeamMembers(migrated.teamMembers);
      useProjectStore.setState({
        projects: migrated.projects,
        teamMembers: migrated.teamMembers,
      });
    } else if (existing.length > 0) {
      // Migrate existing stored records if they need schema v2 upgrade
      const migrated = await migrateLegacyProjectData(existing, existingMembers);
      await dbSaveAllProjects(migrated.projects);
      if (existingMembers.length === 0) {
        await dbSaveAllTeamMembers(migrated.teamMembers);
      }
      useProjectStore.setState({
        projects: migrated.projects,
        teamMembers: existingMembers.length > 0 ? existingMembers : migrated.teamMembers,
      });
    }
  } catch (err) {
    console.error('Non-fatal error hydrating/migrating DeliverOps database:', err);
  }
}

const DEFAULT_CATEGORIES_MAFI = [
  { id: 'cat-scale', name: 'Scale Integration', color: '#1f8a70' },
  { id: 'cat-po', name: 'PO Management', color: '#3b82f6' },
  { id: 'cat-inv', name: 'Inventory & Organization', color: '#f59e0b' },
  { id: 'cat-queue', name: 'Queue & Flow', color: '#8b5cf6' },
];

const DEFAULT_CATEGORIES_ERP = [
  { id: 'cat-arch', name: 'Architecture & DB', color: '#6366f1' },
  { id: 'cat-api', name: 'API & Services', color: '#06b6d4' },
  { id: 'cat-ui', name: 'Frontend & UX', color: '#ec4899' },
  { id: 'cat-qa', name: 'QA & Security', color: '#10b981' },
];

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'proj-mafi-01',
    name: 'MAFI Scale Logistics & Automation',
    code: 'MAFI-01',
    description: 'Enterprise truck scale integration, driver queue management, and automated purchase order flows with MENA Friday/Saturday rest schedule.',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-28T08:00:00Z',
    clientName: 'MAFI Agricultural Produce Logistics',
    projectType: 'client',
    projectManagerId: 'member-ahmed-khalil',
    isArchived: false,
    archivedAt: null,
    risks: [
      {
        id: 'risk-1',
        projectId: 'proj-mafi-01',
        linkedTaskIds: ['task-1'],
        linkedMilestoneIds: [],
        title: 'RS-232 Serial Port Driver Incompatibility on MAFI Server',
        description: 'Legacy Windows Server 2016 at scale house lacks certified driver for digital weight indicator indicator.',
        type: 'blocker',
        severity: 'high',
        status: 'mitigating',
        likelihood: null,
        impact: 'high',
        rootCause: 'OS driver signing restriction on production scale hardware node.',
        ownerId: 'member-ahmed-khalil',
        identifiedDate: '2026-10-04',
        dueDate: '2026-10-12',
        mitigationPlan: 'Deploy FTDI virtual COM port bridge and build fallback socket emulator for hardware validation.',
        createdAt: '2026-10-04T10:00:00Z',
        updatedAt: '2026-10-04T10:00:00Z',
      },
    ],
    config: {
      weekendDays: [5, 6], // Friday & Saturday
      durationMode: 'working_days',
      targetLaunchDate: '2026-12-05',
      highlightCriticalPath: true,
      hasLockedBaseline: true,
      baselineLockedDate: '2026-09-15',
      categories: DEFAULT_CATEGORIES_MAFI,
    },
    tasks: [
      {
        id: 'task-1',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Scale application done on MAFI server',
        category: 'Scale Integration',
        priority: 'Urgent',
        assignee: 'Ahmed Khalil',
        primaryOwnerId: 'member-ahmed-khalil',
        primaryOwnerHours: 16,
        contributorAllocations: [],
        reviewerId: 'member-director-admin',
        reviewStatus: 'none',
        estimatedHours: 16,
        loggedHours: 12,
        start: '2026-10-04',
        end: '2026-10-15',
        pct: 45,
        isMilestone: false,
        dependsOn: [],
        baselineStart: '2026-10-04',
        baselineEnd: '2026-10-14',
        status: 'In Progress',
        order: 1,
      },
      {
        id: 'task-2',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Make a simulator for the scale',
        category: 'Scale Integration',
        priority: 'High',
        assignee: 'Tariq Mansoor',
        primaryOwnerId: 'member-tariq-mansoor',
        primaryOwnerHours: 16,
        contributorAllocations: [
          { memberId: 'member-ahmed-khalil', allocatedHours: 4 },
        ],
        reviewerId: 'member-ahmed-khalil',
        reviewStatus: 'none',
        estimatedHours: 20,
        loggedHours: 16,
        start: '2026-10-04',
        end: '2026-10-11',
        pct: 80,
        isMilestone: false,
        dependsOn: [],
        baselineStart: '2026-10-04',
        baselineEnd: '2026-10-11',
        status: 'In Progress',
        order: 2,
      },
      {
        id: 'task-3',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Add supplier site field',
        category: 'PO Management',
        priority: 'Medium',
        assignee: 'Sarah Loutfy',
        primaryOwnerId: 'member-sarah-loutfy',
        primaryOwnerHours: 12,
        contributorAllocations: [],
        reviewerId: null,
        reviewStatus: 'none',
        estimatedHours: 12,
        loggedHours: 4,
        start: '2026-10-12',
        end: '2026-10-15',
        pct: 30,
        isMilestone: false,
        dependsOn: ['task-2'],
        baselineStart: '2026-10-12',
        baselineEnd: '2026-10-15',
        status: 'In Progress',
        order: 3,
      },
      {
        id: 'task-4',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Add PO type & workflow validation',
        category: 'PO Management',
        priority: 'High',
        assignee: 'Sarah Loutfy',
        primaryOwnerId: 'member-sarah-loutfy',
        primaryOwnerHours: 16,
        contributorAllocations: [],
        reviewerId: null,
        reviewStatus: 'none',
        estimatedHours: 16,
        loggedHours: 2,
        start: '2026-10-12',
        end: '2026-10-18',
        pct: 15,
        isMilestone: false,
        dependsOn: ['task-2'],
        baselineStart: '2026-10-12',
        baselineEnd: '2026-10-17',
        status: 'In Progress',
        order: 4,
      },
      {
        id: 'task-5',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Add PO reference & tracking ID',
        category: 'PO Management',
        priority: 'Medium',
        assignee: 'Omar Farouk',
        primaryOwnerId: 'member-omar-farouk',
        primaryOwnerHours: 18,
        contributorAllocations: [],
        reviewerId: null,
        reviewStatus: 'none',
        estimatedHours: 18,
        loggedHours: 0,
        start: '2026-10-16',
        end: '2026-10-20',
        pct: 0,
        isMilestone: false,
        dependsOn: ['task-4'],
        baselineStart: '2026-10-16',
        baselineEnd: '2026-10-20',
        status: 'Not Started',
        order: 5,
      },
      {
        id: 'task-6',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Add order number generation',
        category: 'PO Management',
        priority: 'Medium',
        assignee: 'Omar Farouk',
        primaryOwnerId: 'member-omar-farouk',
        primaryOwnerHours: 20,
        contributorAllocations: [],
        reviewerId: null,
        reviewStatus: 'none',
        estimatedHours: 20,
        loggedHours: 0,
        start: '2026-10-16',
        end: '2026-10-20',
        pct: 0,
        isMilestone: false,
        dependsOn: ['task-3'],
        baselineStart: '2026-10-16',
        baselineEnd: '2026-10-20',
        status: 'Not Started',
        order: 6,
      },
      {
        id: 'task-7',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Remaining quantity calculation engine',
        category: 'Inventory & Organization',
        priority: 'High',
        assignee: 'Tariq Mansoor',
        primaryOwnerId: 'member-tariq-mansoor',
        primaryOwnerHours: 11,
        contributorAllocations: [],
        reviewerId: null,
        reviewStatus: 'none',
        estimatedHours: 11,
        loggedHours: 0,
        start: '2026-10-19',
        end: '2026-10-25',
        pct: 0,
        isMilestone: false,
        dependsOn: ['task-5', 'task-6'],
        baselineStart: '2026-10-18',
        baselineEnd: '2026-10-24',
        status: 'Not Started',
        order: 7,
      },
      {
        id: 'task-8',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Inventory organization & bin mapping',
        category: 'Inventory & Organization',
        priority: 'Low',
        assignee: 'Sarah Loutfy',
        primaryOwnerId: 'member-sarah-loutfy',
        primaryOwnerHours: 16,
        contributorAllocations: [],
        reviewerId: null,
        reviewStatus: 'none',
        estimatedHours: 16,
        loggedHours: 0,
        start: '2026-10-19',
        end: '2026-10-25',
        pct: 0,
        isMilestone: false,
        dependsOn: ['task-1'],
        baselineStart: '2026-10-19',
        baselineEnd: '2026-10-25',
        status: 'Not Started',
        order: 8,
      },
      {
        id: 'task-9',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Add post test flow & calibration sign-off',
        category: 'Scale Integration',
        priority: 'Urgent',
        assignee: 'Ahmed Khalil',
        primaryOwnerId: 'member-ahmed-khalil',
        primaryOwnerHours: 8,
        contributorAllocations: [],
        reviewerId: 'member-director-admin',
        reviewStatus: 'none',
        estimatedHours: 8,
        loggedHours: 0,
        start: '2026-10-26',
        end: '2026-11-01',
        pct: 0,
        isMilestone: false,
        dependsOn: ['task-7', 'task-8'],
        baselineStart: '2026-10-26',
        baselineEnd: '2026-11-01',
        status: 'Not Started',
        order: 9,
      },
      {
        id: 'task-10',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Block reasons CRUD (truck, driver compliance)',
        category: 'Queue & Flow',
        priority: 'Medium',
        assignee: 'Nouran Adel',
        primaryOwnerId: 'member-nouran-adel',
        primaryOwnerHours: 14,
        contributorAllocations: [],
        reviewerId: null,
        reviewStatus: 'none',
        estimatedHours: 14,
        loggedHours: 0,
        start: '2026-10-26',
        end: '2026-11-01',
        pct: 0,
        isMilestone: false,
        dependsOn: ['task-6'],
        baselineStart: '2026-10-26',
        baselineEnd: '2026-10-31',
        status: 'Not Started',
        order: 10,
      },
      {
        id: 'task-11',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Hardware Acceptance Sign-off Milestone',
        category: 'Scale Integration',
        priority: 'Urgent',
        assignee: 'Executive Team',
        primaryOwnerId: 'member-director-admin',
        primaryOwnerHours: 20,
        contributorAllocations: [],
        reviewerId: null,
        reviewStatus: 'none',
        estimatedHours: 20,
        loggedHours: 0,
        start: '2026-11-05',
        end: '2026-11-05',
        pct: 0,
        isMilestone: true,
        dependsOn: ['task-9', 'task-10'],
        baselineStart: '2026-11-05',
        baselineEnd: '2026-11-05',
        status: 'Not Started',
        order: 11,
      },
    ],
  },
  {
    id: 'proj-erp-02',
    name: 'DeliverOps Next-Gen Cloud Platform',
    code: 'DOPS-02',
    description: 'Internal multi-tier project delivery, capacity planner, and risk governance platform.',
    createdAt: '2026-09-10T08:00:00Z',
    updatedAt: '2026-09-29T12:00:00Z',
    clientName: null,
    projectType: 'internal',
    projectManagerId: 'member-ahmed-khalil',
    isArchived: false,
    archivedAt: null,
    risks: [],
    config: {
      weekendDays: [0, 6], // Western weekend Sat/Sun
      durationMode: 'working_days',
      targetLaunchDate: '2026-12-15',
      highlightCriticalPath: true,
      hasLockedBaseline: false,
      categories: DEFAULT_CATEGORIES_ERP,
    },
    tasks: [
      {
        id: 'erp-1',
        projectId: 'proj-erp-02',
        parentId: null,
        name: 'Database Schema & Partitioning Model',
        category: 'Architecture & DB',
        priority: 'Urgent',
        assignee: 'Tariq Mansoor',
        primaryOwnerId: 'member-tariq-mansoor',
        primaryOwnerHours: 12,
        contributorAllocations: [],
        reviewerId: 'member-ahmed-khalil',
        reviewStatus: 'none',
        estimatedHours: 12,
        loggedHours: 12,
        start: '2026-10-01',
        end: '2026-10-12',
        pct: 90,
        isMilestone: false,
        dependsOn: [],
        status: 'In Progress',
        order: 1,
      },
      {
        id: 'erp-2',
        projectId: 'proj-erp-02',
        parentId: null,
        name: 'Capacity Engine & Workload Mathematics',
        category: 'Architecture & DB',
        priority: 'High',
        assignee: 'Ahmed Khalil',
        primaryOwnerId: 'member-ahmed-khalil',
        primaryOwnerHours: 8,
        contributorAllocations: [],
        reviewerId: null,
        reviewStatus: 'none',
        estimatedHours: 8,
        loggedHours: 8,
        start: '2026-10-13',
        end: '2026-10-26',
        pct: 35,
        isMilestone: false,
        dependsOn: ['erp-1'],
        status: 'In Progress',
        order: 2,
      },
      {
        id: 'erp-3',
        projectId: 'proj-erp-02',
        parentId: null,
        name: 'Claymorphic UI System & Responsive Dock',
        category: 'Frontend & UX',
        priority: 'High',
        assignee: 'Nouran Adel',
        primaryOwnerId: 'member-nouran-adel',
        primaryOwnerHours: 20,
        contributorAllocations: [],
        reviewerId: null,
        reviewStatus: 'none',
        estimatedHours: 20,
        loggedHours: 18,
        start: '2026-10-05',
        end: '2026-10-22',
        pct: 75,
        isMilestone: false,
        dependsOn: [],
        status: 'In Progress',
        order: 3,
      },
    ],
  },
];

const INITIAL_PROJECTS: Project[] = isDemoMode ? DEMO_PROJECTS : [];

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: INITIAL_PROJECTS,
      activeProjectId: isDemoMode ? (INITIAL_PROJECTS[0]?.id || '') : '',
      theme: 'light',
      zoomLevel: 24,
      activeView: 'planner',

      // Persona Context (Only active during local demo/simulation mode)
      activePersonaId: '',
      activePersonaRole: 'project_manager',
      setPersona: (memberId, role) => {
        const member = get().teamMembers.find((m) => m.id === memberId);
        const resolvedRole = role || member?.systemRole || 'contributor';
        set({
          activePersonaId: memberId,
          activePersonaRole: resolvedRole,
        });
      },

      // Global Team Directory
      teamMembers: INITIAL_TEAM_MEMBERS,
      addTeamMember: (memberData) => {
        const id = memberData.id || `member-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const newMember: TeamMember = {
          ...memberData,
          id,
          createdAt: memberData.createdAt || new Date().toISOString(),
        };
        set((state) => ({ teamMembers: [...state.teamMembers, newMember] }));
        dbSaveTeamMember(newMember).catch(() => {});
        return id;
      },
      updateTeamMember: (id, updates) => {
        set((state) => ({
          teamMembers: state.teamMembers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }));
        const updated = get().teamMembers.find((m) => m.id === id);
        if (updated) dbSaveTeamMember(updated).catch(() => {});
      },
      deleteTeamMember: (id) => {
        const state = get();
        // Referential integrity check across all projects & tasks
        let assignedCount = 0;
        state.projects.forEach((p) => {
          (p.tasks || []).forEach((t) => {
            if (
              t.primaryOwnerId === id ||
              (t.contributorAllocations || []).some((c) => c.memberId === id) ||
              t.reviewerId === id
            ) {
              assignedCount++;
            }
          });
        });

        if (assignedCount > 0) {
          const member = state.teamMembers.find((m) => m.id === id);
          return {
            success: false,
            reason: `Cannot delete "${member?.name || 'Member'}": Currently assigned to ${assignedCount} active task(s). Reassign these tasks or set member status to "Inactive".`,
          };
        }

        set((prev) => ({ teamMembers: prev.teamMembers.filter((m) => m.id !== id) }));
        dbDeleteTeamMember(id).catch(() => {});
        return { success: true };
      },
      syncTeamMembersFromBackend: (apiUsers) => {
        if (!Array.isArray(apiUsers) || apiUsers.length === 0) return;
        set((state) => {
          const current = [...state.teamMembers];
          apiUsers.forEach((u: any) => {
            const mappedRole = (u.roles?.[0] as UserRole) || (u.primaryRole as UserRole) || 'contributor';
            const existingIndex = current.findIndex(
              (m) =>
                String(m.id) === String(u.id) ||
                (u.email && m.email && m.email.toLowerCase().trim() === u.email.toLowerCase().trim())
            );
            const avatar = u.avatarUrl || u.avatar_path || undefined;
            const jobTitle = u.jobTitle || u.job_title || 'Team Member';
            const capacity = u.weeklyCapacityHours ?? u.weekly_capacity_hours ?? 40;
            const department = u.department || 'General';
            const status = u.status || (u.is_active === false ? 'inactive' : 'active');

            if (existingIndex >= 0) {
              current[existingIndex] = {
                ...current[existingIndex],
                id: String(u.id),
                name: u.name,
                email: u.email,
                phone: u.phone || current[existingIndex].phone,
                jobTitle,
                department,
                skills: u.skills && u.skills.length > 0 ? u.skills : current[existingIndex].skills,
                systemRole: mappedRole,
                weeklyCapacityHours: capacity,
                status,
                color: u.color || current[existingIndex].color || '#10b981',
                photoUrl: avatar || current[existingIndex].photoUrl,
                avatar: avatar || current[existingIndex].avatar,
              };
            } else {
              current.push({
                id: String(u.id),
                name: u.name,
                email: u.email,
                phone: u.phone || undefined,
                jobTitle,
                department,
                skills: u.skills || [],
                systemRole: mappedRole,
                weeklyCapacityHours: capacity,
                status,
                color: u.color || '#10b981',
                photoUrl: avatar,
                avatar,
                createdAt: new Date().toISOString(),
              });
            }
          });
          dbSaveAllTeamMembers(current).catch(() => {});
          return { teamMembers: current };
        });
      },

      // Audit Logging
      auditLogs: [],
      logAudit: async (action, fieldName, oldValue, newValue, reason = null, taskId = null, projectIdOverride) => {
        const state = get();
        const activeMember = state.teamMembers.find((m) => m.id === state.activePersonaId);
        const fallbackName = activeMember?.name || useAuthStore.getState().user?.name || 'Mohamed Salama';
        const projectId = projectIdOverride || state.activeProjectId;
        const entry: AuditLogEntry = {
          id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          projectId,
          taskId: taskId || null,
          timestamp: new Date().toISOString(),
          actorId: state.activePersonaId || useAuthStore.getState().user?.id || 'user',
          actorName: fallbackName,
          actorRole: state.activePersonaRole,
          action,
          fieldName: fieldName || null,
          oldValue: oldValue !== undefined && oldValue !== null ? JSON.stringify(oldValue) : null,
          newValue: newValue !== undefined && newValue !== null ? JSON.stringify(newValue) : null,
          reason: reason || null,
        };

        set((prev) => ({ auditLogs: [entry, ...prev.auditLogs.slice(0, 200)] }));
        dbLogAudit(entry).catch(() => {});
      },

      // Task Comments
      taskComments: {},
      addTaskComment: async (taskId, content) => {
        const state = get();
        const activeMember = state.teamMembers.find((m) => m.id === state.activePersonaId);
        const fallbackName = activeMember?.name || useAuthStore.getState().user?.name || 'Mohamed Salama';
        const comment: TaskComment = {
          id: `comment-${Date.now().toString(36)}`,
          taskId,
          authorId: state.activePersonaId || useAuthStore.getState().user?.id || 'user',
          authorName: fallbackName,
          authorAvatar: activeMember?.avatar,
          content: content.trim(),
          createdAt: new Date().toISOString(),
        };

        set((prev) => {
          const current = prev.taskComments[taskId] || [];
          return {
            taskComments: { ...prev.taskComments, [taskId]: [...current, comment] },
          };
        });
        dbSaveComment(comment).catch(() => {});
      },
      deleteTaskComment: async (commentId, taskId) => {
        set((prev) => {
          const current = prev.taskComments[taskId] || [];
          return {
            taskComments: {
              ...prev.taskComments,
              [taskId]: current.filter((c) => c.id !== commentId),
            },
          };
        });
        dbDeleteComment(commentId).catch(() => {});
      },

      // Risks, Issues & Blockers
      addRisk: (riskData) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

        const newRisk: ProjectRisk = {
          ...riskData,
          id: `risk-${Date.now().toString(36)}`,
          projectId: state.activeProjectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedProject = {
          ...project,
          risks: [...(project.risks || []), newRisk],
          updatedAt: new Date().toISOString(),
        };

        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId ? updatedProject : p
          ),
        });
        syncToDB(updatedProject);
        get().logAudit('risk_created', 'risks', null, newRisk.title);
      },

      updateRisk: (riskId, updates) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

        const updatedRisks = (project.risks || []).map((r) =>
          r.id === riskId ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
        );

        const updatedProject = {
          ...project,
          risks: updatedRisks,
          updatedAt: new Date().toISOString(),
        };

        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId ? updatedProject : p
          ),
        });
        syncToDB(updatedProject);
        if (updates.status === 'resolved') {
          get().logAudit('risk_resolved', 'status', 'open', 'resolved', updates.resolutionSummary);
        } else {
          get().logAudit('risk_updated', 'risks', null, updates.title || riskId);
        }
      },

      deleteRisk: (riskId) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

        const updatedProject = {
          ...project,
          risks: (project.risks || []).filter((r) => r.id !== riskId),
          updatedAt: new Date().toISOString(),
        };

        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId ? updatedProject : p
          ),
        });
        syncToDB(updatedProject);
      },

      setActiveView: (view: ActiveView) => set({ activeView: view }),

      createProject: (projectData) => {
        const id = `proj-${Date.now().toString(36)}`;
        const now = new Date().toISOString();
        const newProject: Project = {
          ...projectData,
          id,
          clientName: projectData.clientName ?? null,
          projectType: projectData.projectType || 'unclassified',
          projectManagerId: projectData.projectManagerId ?? null,
          isArchived: false,
          archivedAt: null,
          risks: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          projects: [...state.projects, newProject],
          activeProjectId: id,
          activeView: 'planner',
        }));
        syncToDB(newProject);
        get().logAudit('task_created', 'project', null, newProject.name, null, null, id);
        return id;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
        const updated = get().projects.find((p) => p.id === id);
        if (updated) syncToDB(updated);
      },

      archiveProject: (id, isArchived) => {
        const now = new Date().toISOString();
        get().updateProject(id, {
          isArchived,
          archivedAt: isArchived ? now : null,
        });
        get().logAudit(
          isArchived ? 'project_archived' : 'project_unarchived',
          'isArchived',
          !isArchived,
          isArchived,
          null,
          null,
          id
        );
      },

      deleteProject: (id) => {
        const state = get();
        if (state.projects.length <= 1) return; // Prevent deleting the last project
        const remaining = state.projects.filter((p) => p.id !== id);
        const newActiveId =
          state.activeProjectId === id ? remaining[0].id : state.activeProjectId;
        set({
          projects: remaining,
          activeProjectId: newActiveId,
        });
        deleteFromDB(id);
      },

      duplicateProject: (id) => {
        const state = get();
        const source = state.projects.find((p) => p.id === id);
        if (!source) return;

        const newId = `proj-${Date.now().toString(36)}`;
        const now = new Date().toISOString();
        const clonedProject: Project = {
          ...JSON.parse(JSON.stringify(source)),
          id: newId,
          name: `${source.name} (Copy)`,
          code: `${source.code}-CPY`,
          createdAt: now,
          updatedAt: now,
          tasks: source.tasks.map((t, idx) => ({
            ...t,
            id: `task-${Date.now().toString(36)}-${idx}`,
            projectId: newId,
          })),
        };

        set({
          projects: [...state.projects, clonedProject],
          activeProjectId: newId,
        });
        syncToDB(clonedProject);
      },

      setActiveProject: (id) => {
        const exists = get().projects.some((p) => p.id === id);
        if (exists) {
          set({ activeProjectId: id });
        }
      },

      addTask: (taskData) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

        const taskId = `task-${Date.now().toString(36)}`;
        const maxOrder = project.tasks.reduce((m, t) => Math.max(m, t.order || 0), 0);
        const newTask: Task = {
          priority: taskData.priority || 'Medium',
          primaryOwnerId: taskData.primaryOwnerId ?? null,
          primaryOwnerHours: taskData.primaryOwnerHours ?? null,
          contributorAllocations: taskData.contributorAllocations || [],
          reviewerId: taskData.reviewerId ?? null,
          reviewStatus: 'none',
          estimatedHours: taskData.estimatedHours ?? null,
          loggedHours: 0,
          ...taskData,
          id: taskId,
          projectId: state.activeProjectId,
          order: maxOrder + 1,
        };

        const updatedTasks = [...project.tasks, newTask];
        const updatedProject = { ...project, tasks: updatedTasks, updatedAt: new Date().toISOString() };

        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId ? updatedProject : p
          ),
        });
        syncToDB(updatedProject);
        get().logAudit('task_created', 'task', null, newTask.name, null, taskId);
      },

      updateTask: (taskId, updates, reason) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

        const currentTask = project.tasks.find((t) => t.id === taskId);
        if (!currentTask) return;

        // Apply strict state machine & progress invariants
        const cleanUpdates = { ...updates };

        // 1. Invariant: Not Started requires pct === 0
        if (cleanUpdates.status === 'Not Started' && cleanUpdates.pct === undefined) {
          cleanUpdates.pct = 0;
        }

        // 2. Invariant: In Progress requires 0 <= pct < 100
        if (cleanUpdates.status === 'In Progress') {
          if (cleanUpdates.pct !== undefined && cleanUpdates.pct >= 100) {
            cleanUpdates.pct = 95;
          }
        }

        // 3. Invariant: Completed requires pct === 100 and review approval if reviewer assigned
        if (cleanUpdates.status === 'Completed') {
          cleanUpdates.pct = 100;
          if (currentTask.reviewerId && currentTask.reviewStatus !== 'approved') {
            // Cannot bypass reviewer gate
            cleanUpdates.status = 'In Review';
            cleanUpdates.reviewStatus = 'pending_review';
          }
        }

        // 4. Invariant: Blocked requires reason or linked risk
        if (cleanUpdates.status === 'Blocked') {
          const hasReason = !!cleanUpdates.blockReason || !!currentTask.blockReason;
          const hasLinkedRisk = (project.risks || []).some((r) => r.linkedTaskIds.includes(taskId));
          if (!hasReason && !hasLinkedRisk) {
            cleanUpdates.blockReason = 'Waiting for resolution';
          }
        }

        // 5. Effort allocation validations: finite >= 0, unique contributors, no owner duplication
        if (cleanUpdates.contributorAllocations) {
          const ownerId = cleanUpdates.primaryOwnerId !== undefined ? cleanUpdates.primaryOwnerId : currentTask.primaryOwnerId;
          const map = new Map<string, number>();
          cleanUpdates.contributorAllocations.forEach((c) => {
            if (c.memberId && c.memberId !== ownerId && typeof c.allocatedHours === 'number' && c.allocatedHours >= 0) {
              map.set(c.memberId, c.allocatedHours);
            }
          });
          cleanUpdates.contributorAllocations = Array.from(map.entries()).map(([memberId, allocatedHours]) => ({
            memberId,
            allocatedHours,
          }));
        }

        let updatedTasks = project.tasks.map((t) =>
          t.id === taskId ? { ...t, ...cleanUpdates } : t
        );

        // Auto-schedule dependent successor tasks if dates shifted
        if (cleanUpdates.start || cleanUpdates.end) {
          updatedTasks = autoScheduleSuccessors(taskId, updatedTasks);
          get().logAudit(
            'dates_shifted',
            'dates',
            `${currentTask.start} - ${currentTask.end}`,
            `${cleanUpdates.start || currentTask.start} - ${cleanUpdates.end || currentTask.end}`,
            reason,
            taskId
          );
        }

        if (cleanUpdates.status && cleanUpdates.status !== currentTask.status) {
          get().logAudit(
            'status_changed',
            'status',
            currentTask.status,
            cleanUpdates.status,
            reason,
            taskId
          );
        }

        const updatedProject = { ...project, tasks: updatedTasks, updatedAt: new Date().toISOString() };

        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId ? updatedProject : p
          ),
        });
        syncToDB(updatedProject);
      },

      reassignTask: (taskId, newOwnerId, reason) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;
        const currentTask = project.tasks.find((t) => t.id === taskId);
        if (!currentTask) return;

        const oldOwner = state.teamMembers.find((m) => m.id === currentTask.primaryOwnerId);
        const newOwner = state.teamMembers.find((m) => m.id === newOwnerId);

        get().updateTask(
          taskId,
          {
            primaryOwnerId: newOwnerId,
            assignee: newOwner?.name || undefined,
            assigneeUnresolved: false,
          },
          reason
        );

        get().logAudit(
          'primary_owner_reassigned',
          'primaryOwnerId',
          oldOwner?.name || 'Unassigned',
          newOwner?.name || 'Unassigned',
          reason,
          taskId
        );
      },

      reviewTask: (taskId, decision, note, remainingPct) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;
        const currentTask = project.tasks.find((t) => t.id === taskId);
        if (!currentTask) return;

        if (decision === 'approved') {
          get().updateTask(taskId, {
            reviewStatus: 'approved',
            status: 'Completed',
            pct: 100,
            reviewNote: note || null,
          });
          get().logAudit('review_approved', 'reviewStatus', currentTask.reviewStatus, 'approved', note, taskId);
        } else {
          // Changes requested: move to In Progress, cap pct <= 95% (NO arbitrary 80% reset)
          const targetPct = Math.min(remainingPct !== undefined ? remainingPct : (currentTask.pct === 100 ? 95 : currentTask.pct), 95);
          get().updateTask(taskId, {
            reviewStatus: 'changes_requested',
            status: 'In Progress',
            pct: targetPct,
            reviewNote: note || null,
          });
          get().logAudit('review_rejected', 'reviewStatus', currentTask.reviewStatus, 'changes_requested', note, taskId);
        }
      },

      deleteTask: (taskId) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

        const taskToDelete = project.tasks.find((t) => t.id === taskId);
        const filtered = project.tasks
          .filter((t) => t.id !== taskId && t.parentId !== taskId)
          .map((t) => ({
            ...t,
            dependsOn: t.dependsOn.filter((id) => id !== taskId),
          }));

        const updatedProject = { ...project, tasks: filtered, updatedAt: new Date().toISOString() };

        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId ? updatedProject : p
          ),
        });
        syncToDB(updatedProject);
        if (taskToDelete) {
          get().logAudit('task_deleted', 'task', taskToDelete.name, null, null, taskId);
        }
      },

      reorderTasks: (startIndex, endIndex) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

        const result = Array.from(project.tasks);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        // Update orders
        const reordered = result.map((t, idx) => ({ ...t, order: idx + 1 }));

        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId
              ? { ...p, tasks: reordered, updatedAt: new Date().toISOString() }
              : p
          ),
        });
      },

      updateProjectConfig: (updates) => {
        const state = get();
        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId
              ? {
                  ...p,
                  config: { ...p.config, ...updates },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        });
      },

      lockBaseline: () => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

        const today = getTodayUTC();
        const lockedTasks = project.tasks.map((t) => ({
          ...t,
          baselineStart: t.start,
          baselineEnd: t.end,
        }));

        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId
              ? {
                  ...p,
                  tasks: lockedTasks,
                  config: {
                    ...p.config,
                    hasLockedBaseline: true,
                    baselineLockedDate: today,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        });
        get().logAudit('baseline_locked', 'baseline', null, today);
      },

      clearBaseline: () => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

        const clearedTasks = project.tasks.map((t) => ({
          ...t,
          baselineStart: undefined,
          baselineEnd: undefined,
        }));

        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId
              ? {
                  ...p,
                  tasks: clearedTasks,
                  config: {
                    ...p.config,
                    hasLockedBaseline: false,
                    baselineLockedDate: undefined,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        });
        get().logAudit('baseline_cleared', 'baseline', 'locked', 'cleared');
      },

      setTheme: (theme) => {
        set({ theme });
        const root = document.documentElement;
        if (
          theme === 'dark' ||
          (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },

      setZoomLevel: (zoom) => {
        const clamped = Math.max(14, Math.min(48, zoom));
        set({ zoomLevel: clamped });
      },

      exportProjectJSON: (projectId) => {
        const state = get();
        const project = state.projects.find((p) => p.id === projectId);
        if (!project) return;

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `${project.code || 'project'}_export.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      },

      importProjectJSON: (jsonData) => {
        try {
          const parsed = JSON.parse(jsonData) as Project;
          if (!parsed.name || !Array.isArray(parsed.tasks)) {
            return false;
          }
          const newId = `proj-${Date.now().toString(36)}`;
          const now = new Date().toISOString();
          const newProject: Project = {
            ...parsed,
            id: newId,
            code: parsed.code || 'IMP-01',
            clientName: parsed.clientName ?? null,
            projectType: parsed.projectType || 'unclassified',
            projectManagerId: parsed.projectManagerId ?? null,
            isArchived: !!parsed.isArchived,
            archivedAt: parsed.archivedAt ?? null,
            risks: Array.isArray(parsed.risks) ? parsed.risks : [],
            createdAt: parsed.createdAt || now,
            updatedAt: now,
            config: {
              weekendDays: parsed.config?.weekendDays ?? [5, 6],
              durationMode: parsed.config?.durationMode ?? 'working_days',
              targetLaunchDate: parsed.config?.targetLaunchDate,
              highlightCriticalPath: parsed.config?.highlightCriticalPath ?? true,
              hasLockedBaseline: parsed.config?.hasLockedBaseline ?? false,
              baselineLockedDate: parsed.config?.baselineLockedDate,
              categories: parsed.config?.categories ?? [],
            },
            tasks: parsed.tasks.map((t, idx) => ({
              ...t,
              id: t.id || `task-${Date.now().toString(36)}-${idx}`,
              projectId: newId,
              dependsOn: t.dependsOn || [],
              status: t.status || 'Not Started',
              pct: t.pct ?? 0,
              isMilestone: t.isMilestone ?? false,
              order: t.order ?? idx + 1,
              primaryOwnerId: t.primaryOwnerId ?? null,
              primaryOwnerHours: t.primaryOwnerHours ?? null,
              contributorAllocations: t.contributorAllocations || [],
              reviewerId: t.reviewerId ?? null,
              reviewStatus: t.reviewStatus || 'none',
              estimatedHours: t.estimatedHours ?? null,
              loggedHours: t.loggedHours ?? 0,
            })),
          };

          set((state) => ({
            projects: [...state.projects, newProject],
            activeProjectId: newId,
            activeView: 'planner',
          }));
          syncToDB(newProject);
          return true;
        } catch {
          return false;
        }
      },

      importProjectCSV: (csvData, projectName) => {
        try {
          const lines = csvData.split('\n').map((l) => l.trim()).filter(Boolean);
          if (lines.length < 2) return false;

          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

          const getCol = (cols: string[], name: string) => {
            const idx = headers.indexOf(name);
            if (idx < 0) return '';
            return (cols[idx] || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();
          };

          const tasks: Task[] = [];

          for (let i = 1; i < lines.length; i++) {
            const cols: string[] = [];
            let cur = '';
            let inQuote = false;
            for (const ch of lines[i]) {
              if (ch === '"') { inQuote = !inQuote; }
              else if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; }
              else { cur += ch; }
            }
            cols.push(cur);

            const name = getCol(cols, 'name') || getCol(cols, 'task name') || `Task ${i}`;
            const start = getCol(cols, 'start date') || getCol(cols, 'start');
            if (!name || !start) continue;

            const end = getCol(cols, 'end date') || getCol(cols, 'end') || start;
            const pct = Math.min(100, Math.max(0, parseInt(getCol(cols, 'progress (%)') || getCol(cols, 'progress') || '0', 10) || 0));
            const isMilestone = getCol(cols, 'is milestone').toUpperCase() === 'YES';
            const rawStatus = getCol(cols, 'status');
            const status: Task['status'] = (['Not Started','In Progress','Blocked','In Review','Completed'].includes(rawStatus) ? rawStatus : (pct === 100 ? 'Completed' : pct > 0 ? 'In Progress' : 'Not Started')) as Task['status'];
            const rawPriority = getCol(cols, 'priority');
            const priority: TaskPriority = (['Low', 'Medium', 'High', 'Urgent'].includes(rawPriority) ? rawPriority : 'Medium') as TaskPriority;
            const order = parseInt(getCol(cols, 'order') || String(i), 10);
            const legacyAssignee = getCol(cols, 'assignee');

            tasks.push({
              id: `task-csv-${Date.now().toString(36)}-${i}`,
              projectId: '',
              parentId: null,
              name,
              category: getCol(cols, 'category') || 'General',
              priority,
              assignee: legacyAssignee || undefined,
              assigneeUnresolved: !!legacyAssignee,
              primaryOwnerId: null,
              primaryOwnerHours: null,
              contributorAllocations: [],
              reviewerId: null,
              reviewStatus: 'none',
              estimatedHours: null,
              loggedHours: 0,
              start,
              end,
              pct,
              isMilestone,
              dependsOn: [],
              status,
              baselineStart: getCol(cols, 'baseline start') || undefined,
              baselineEnd: getCol(cols, 'baseline end') || undefined,
              order,
            });
          }

          if (tasks.length === 0) return false;

          const newId = `proj-${Date.now().toString(36)}`;
          const now = new Date().toISOString();
          const finalTasks = tasks.map((t) => ({ ...t, projectId: newId }));
          const COLORS = ['#1f8a70','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#10b981'];
          const categories = [...new Set(finalTasks.map((t) => t.category))].map((catName, ci) => ({
            id: `cat-csv-${ci}`,
            name: catName,
            color: COLORS[ci % COLORS.length],
          }));

          const newProject: Project = {
            id: newId,
            name: projectName || 'Imported CSV Project',
            code: 'CSV-IMP',
            description: `Imported from CSV on ${new Date().toLocaleDateString()}`,
            clientName: null,
            projectType: 'unclassified',
            projectManagerId: null,
            isArchived: false,
            archivedAt: null,
            risks: [],
            createdAt: now,
            updatedAt: now,
            config: {
              weekendDays: [5, 6],
              durationMode: 'working_days',
              highlightCriticalPath: true,
              hasLockedBaseline: false,
              categories,
            },
            tasks: finalTasks,
          };

          set((state) => ({
            projects: [...state.projects, newProject],
            activeProjectId: newId,
            activeView: 'planner',
          }));
          syncToDB(newProject);
          return true;
        } catch {
          return false;
        }
      },

      exportProjectCSV: (projectId) => {
        const state = get();
        const project = state.projects.find((p) => p.id === projectId);
        if (!project) return;

        const headers = [
          'Order',
          'Name',
          'Category',
          'Priority',
          'Primary Owner',
          'Assignee',
          'Estimated Hours',
          'Start Date',
          'End Date',
          'Progress (%)',
          'Status',
          'Is Milestone',
          'Predecessors',
          'Baseline Start',
          'Baseline End',
        ];

        const rows = project.tasks.map((t, idx) => {
          const owner = state.teamMembers.find((m) => m.id === t.primaryOwnerId);
          return [
            idx + 1,
            `"${(t.name || '').replace(/"/g, '""')}"`,
            `"${(t.category || '').replace(/"/g, '""')}"`,
            t.priority || 'Medium',
            `"${(owner?.name || '').replace(/"/g, '""')}"`,
            `"${(t.assignee || '').replace(/"/g, '""')}"`,
            t.estimatedHours ?? '',
            t.start || '',
            t.end || '',
            t.pct || 0,
            t.status || 'Not Started',
            t.isMilestone ? 'YES' : 'NO',
            `"${(t.dependsOn || []).join(';')}"`,
            t.baselineStart || '',
            t.baselineEnd || '',
          ];
        });

        const csvContent =
          'data:text/csv;charset=utf-8,' +
          [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${project.code || 'project'}_tasks.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      },
    }),
    {
      name: 'claymorphic_gantt_store_v2',
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        theme: state.theme,
        zoomLevel: state.zoomLevel,
        activeView: state.activeView,
        teamMembers: state.teamMembers,
        activePersonaId: state.activePersonaId,
        activePersonaRole: state.activePersonaRole,
      }),
    }
  )
);

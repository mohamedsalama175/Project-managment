import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, ProjectStore, Task, TaskPriority, ThemeMode, ActiveView } from '../types';
import { autoScheduleSuccessors } from '../utils/cpmUtils';
import { getTodayUTC } from '../utils/dateUtils';
import {
  dbSaveProject,
  dbDeleteProject,
  dbSaveAllProjects,
  dbLoadAllProjects,
} from '../db/projectDB';

/** Silently syncs a project to IndexedDB — errors are non-fatal. */
function syncToDB(project: Project): void {
  dbSaveProject(project).catch(() => {});
}

/** Silently removes a project from IndexedDB — errors are non-fatal. */
function deleteFromDB(id: string): void {
  dbDeleteProject(id).catch(() => {});
}

/** Initialise IndexedDB with the current store state on first load. */
export async function hydrateIndexedDB(projects: Project[]): Promise<void> {
  try {
    const existing = await dbLoadAllProjects<Project>();
    if (existing.length === 0 && projects.length > 0) {
      await dbSaveAllProjects(projects);
    }
  } catch {
    // non-fatal
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

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-mafi-01',
    name: 'MAFI Scale Logistics & Automation',
    code: 'MAFI-01',
    description: 'Enterprise truck scale integration, driver queue management, and automated purchase order flows with MENA Friday/Saturday rest schedule.',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-28T08:00:00Z',
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
        assignee: 'Ahmed K.',
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
        assignee: 'Tariq M.',
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
        assignee: 'Sara N.',
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
        assignee: 'Sara N.',
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
        assignee: 'Omar H.',
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
        assignee: 'Omar H.',
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
        assignee: 'Zaid B.',
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
        assignee: 'Zaid B.',
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
        assignee: 'Ahmed K.',
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
        assignee: 'Sara N.',
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
        name: 'Direct PO flow automation',
        category: 'PO Management',
        priority: 'High',
        assignee: 'Omar H.',
        start: '2026-11-02',
        end: '2026-11-12',
        pct: 0,
        isMilestone: false,
        dependsOn: ['task-9'],
        baselineStart: '2026-11-02',
        baselineEnd: '2026-11-12',
        status: 'Not Started',
        order: 11,
      },
      {
        id: 'task-12',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Blanket PO multi-release schedule',
        category: 'PO Management',
        priority: 'Medium',
        assignee: 'Sara N.',
        start: '2026-11-08',
        end: '2026-11-19',
        pct: 0,
        isMilestone: false,
        dependsOn: ['task-11'],
        baselineStart: '2026-11-08',
        baselineEnd: '2026-11-18',
        status: 'Not Started',
        order: 12,
      },
      {
        id: 'task-13',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Contract PO flow & tier pricing',
        category: 'PO Management',
        priority: 'Low',
        assignee: 'Omar H.',
        start: '2026-11-15',
        end: '2026-11-26',
        pct: 0,
        isMilestone: false,
        dependsOn: ['task-12'],
        baselineStart: '2026-11-15',
        baselineEnd: '2026-11-26',
        status: 'Not Started',
        order: 13,
      },
      {
        id: 'task-14',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'Queue management module & Yard Gate display',
        category: 'Queue & Flow',
        priority: 'High',
        assignee: 'Tariq M.',
        start: '2026-11-02',
        end: '2026-11-30',
        pct: 0,
        isMilestone: false,
        dependsOn: ['task-10'],
        baselineStart: '2026-11-01',
        baselineEnd: '2026-11-28',
        status: 'Not Started',
        order: 14,
      },
      {
        id: 'task-15',
        projectId: 'proj-mafi-01',
        parentId: null,
        name: 'MAFI Site Go-Live Milestone',
        category: 'Scale Integration',
        priority: 'Urgent',
        assignee: 'All Leads',
        start: '2026-11-30',
        end: '2026-11-30',
        pct: 0,
        isMilestone: true,
        dependsOn: ['task-13', 'task-14'],
        baselineStart: '2026-11-30',
        baselineEnd: '2026-11-30',
        status: 'Not Started',
        order: 15,
      },
    ],
  },
  {
    id: 'proj-erp-02',
    name: 'SPARK Cloud ERP Core Platform',
    code: 'SPARK-ERP',
    description: 'Next-generation cloud ERP infrastructure, multi-tenant databases, transactional financial ledger, and high-concurrency microservices.',
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-28T08:00:00Z',
    config: {
      weekendDays: [0, 6], // Saturday & Sunday
      durationMode: 'calendar',
      targetLaunchDate: '2026-11-20',
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
        assignee: 'Marcus V.',
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
        name: 'Distributed Ledger Transaction Engine',
        category: 'Architecture & DB',
        priority: 'High',
        assignee: 'Elena R.',
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
        name: 'GraphQL & REST Gateway Layer',
        category: 'API & Services',
        priority: 'High',
        assignee: 'Kevin T.',
        start: '2026-10-15',
        end: '2026-10-28',
        pct: 20,
        isMilestone: false,
        dependsOn: ['erp-1'],
        status: 'In Progress',
        order: 3,
      },
      {
        id: 'erp-4',
        projectId: 'proj-erp-02',
        parentId: null,
        name: 'Claymorphic Design System & Component Library',
        category: 'Frontend & UX',
        priority: 'Medium',
        assignee: 'Sophia L.',
        start: '2026-10-05',
        end: '2026-10-22',
        pct: 75,
        isMilestone: false,
        dependsOn: [],
        status: 'In Progress',
        order: 4,
      },
      {
        id: 'erp-5',
        projectId: 'proj-erp-02',
        parentId: null,
        name: 'General Ledger Financial Dashboard UI',
        category: 'Frontend & UX',
        priority: 'Medium',
        assignee: 'Sophia L.',
        start: '2026-10-23',
        end: '2026-11-06',
        pct: 0,
        isMilestone: false,
        dependsOn: ['erp-4', 'erp-2'],
        status: 'Not Started',
        order: 5,
      },
      {
        id: 'erp-6',
        projectId: 'proj-erp-02',
        parentId: null,
        name: 'Penetration Testing & Security Audit',
        category: 'QA & Security',
        priority: 'Urgent',
        assignee: 'Dmitri P.',
        start: '2026-11-07',
        end: '2026-11-18',
        pct: 0,
        isMilestone: false,
        dependsOn: ['erp-5', 'erp-3'],
        status: 'Not Started',
        order: 6,
      },
      {
        id: 'erp-7',
        projectId: 'proj-erp-02',
        parentId: null,
        name: 'Production Release v1.0',
        category: 'QA & Security',
        priority: 'Urgent',
        assignee: 'Executive Team',
        start: '2026-11-20',
        end: '2026-11-20',
        pct: 0,
        isMilestone: true,
        dependsOn: ['erp-6'],
        status: 'Not Started',
        order: 7,
      },
    ],
  },
];

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: INITIAL_PROJECTS,
      activeProjectId: 'proj-mafi-01',
      theme: 'light',
      zoomLevel: 24,
      activeView: 'planner',

      setActiveView: (view: ActiveView) => set({ activeView: view }),

      createProject: (projectData) => {
        const id = `proj-${Date.now().toString(36)}`;
        const now = new Date().toISOString();
        const newProject: Project = {
          ...projectData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          projects: [...state.projects, newProject],
          activeProjectId: id,
          activeView: 'planner',
        }));
        syncToDB(newProject);
        return id;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        const updated = get().projects.find((p) => p.id === id);
        if (updated) syncToDB(updated);
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
      },

      updateTask: (taskId, updates) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

        let updatedTasks = project.tasks.map((t) =>
          t.id === taskId ? { ...t, ...updates } : t
        );

        // If dates were changed, auto-schedule dependent successor tasks
        if (updates.start || updates.end) {
          updatedTasks = autoScheduleSuccessors(taskId, updatedTasks);
        }

        const updatedProject = { ...project, tasks: updatedTasks, updatedAt: new Date().toISOString() };

        set({
          projects: state.projects.map((p) =>
            p.id === state.activeProjectId ? updatedProject : p
          ),
        });
        syncToDB(updatedProject);
      },

      deleteTask: (taskId) => {
        const state = get();
        const project = state.projects.find((p) => p.id === state.activeProjectId);
        if (!project) return;

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
            // Simple CSV splitter that handles quoted fields
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
            const status: Task['status'] = (['Not Started','In Progress','Blocked','Completed'].includes(rawStatus) ? rawStatus : (pct === 100 ? 'Completed' : pct > 0 ? 'In Progress' : 'Not Started')) as Task['status'];
            const rawPriority = getCol(cols, 'priority');
            const priority: TaskPriority = (['Low', 'Medium', 'High', 'Urgent'].includes(rawPriority) ? rawPriority : 'Medium') as TaskPriority;
            const order = parseInt(getCol(cols, 'order') || String(i), 10);

            tasks.push({
              id: `task-csv-${Date.now().toString(36)}-${i}`,
              projectId: '',
              parentId: null,
              name,
              category: getCol(cols, 'category') || 'General',
              priority,
              assignee: getCol(cols, 'assignee') || 'Unassigned',
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
          'Assignee',
          'Start Date',
          'End Date',
          'Progress (%)',
          'Status',
          'Is Milestone',
          'Predecessors',
          'Baseline Start',
          'Baseline End',
        ];

        const rows = project.tasks.map((t, idx) => [
          idx + 1,
          `"${(t.name || '').replace(/"/g, '""')}"`,
          `"${(t.category || '').replace(/"/g, '""')}"`,
          t.priority || 'Medium',
          `"${(t.assignee || '').replace(/"/g, '""')}"`,
          t.start || '',
          t.end || '',
          t.pct || 0,
          t.status || 'Not Started',
          t.isMilestone ? 'YES' : 'NO',
          `"${(t.dependsOn || []).join(';')}"`,
          t.baselineStart || '',
          t.baselineEnd || '',
        ]);

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
      }),
    }
  )
);

export type TaskStatus = 'Not Started' | 'In Progress' | 'Blocked' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type DurationMode = 'calendar' | 'working_days';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ActiveView = 'planner' | 'config' | 'dashboard';

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null; // For hierarchical WBS summary rows
  name: string;
  category: string;        // e.g., "Hardware", "Backend", "Operations"
  priority?: TaskPriority; // 'Low' | 'Medium' | 'High' | 'Urgent'
  assignee: string;
  start: string;           // YYYY-MM-DD
  end: string;             // YYYY-MM-DD
  pct: number;             // 0 - 100
  isMilestone: boolean;    // Duration = 0, rendered as diamond
  dependsOn: string[];     // Predecessor Task IDs (Finish-to-Start)
  baselineStart?: string;
  baselineEnd?: string;
  status: TaskStatus;
  blockReason?: string;
  order: number;
}

export interface CategoryDef {
  id: string;
  name: string;
  color: string;           // Hex or Tailwind color class
}

export interface ProjectConfig {
  weekendDays: number[];   // e.g., [5, 6] for Fri/Sat (MENA) or [0, 6] for Sun/Sat
  durationMode: DurationMode;
  targetLaunchDate?: string;
  highlightCriticalPath: boolean;
  categories: CategoryDef[];
  hasLockedBaseline: boolean;
  baselineLockedDate?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;            // e.g., "MAFI-01", "SPARK-ERP"
  description: string;
  createdAt: string;
  updatedAt: string;
  config: ProjectConfig;
  tasks: Task[];
}

export interface ProjectStore {
  projects: Project[];
  activeProjectId: string;
  theme: ThemeMode;
  zoomLevel: number;       // Pixel width per day (e.g., 14 to 48)
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  
  // Actions - Project Management
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  
  // Actions - Task Operations (Scoped to Active Project)
  addTask: (task: Omit<Task, 'id' | 'order' | 'projectId'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  reorderTasks: (startIndex: number, endIndex: number) => void;
  
  // Actions - Project Config & Baselines
  updateProjectConfig: (updates: Partial<ProjectConfig>) => void;
  lockBaseline: () => void;
  clearBaseline: () => void;
  
  // Actions - Global & Portability
  setTheme: (theme: ThemeMode) => void;
  setZoomLevel: (zoom: number) => void;
  exportProjectJSON: (projectId: string) => void;
  importProjectJSON: (jsonData: string) => boolean;
  exportProjectCSV: (projectId: string) => void;
  importProjectCSV: (csvData: string, projectName?: string) => boolean;
}

// CPM calculation data structure
export interface TaskCPMInfo {
  taskId: string;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  isCritical: boolean;
}

// Tree view helper item
export interface WBSNode extends Task {
  children?: WBSNode[];
  level: number;
  wbsIndex: string;
  isExpanded?: boolean;
}

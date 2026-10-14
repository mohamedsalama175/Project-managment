export type TaskStatus = 'Not Started' | 'In Progress' | 'Blocked' | 'In Review' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type ReviewStatus = 'none' | 'pending_review' | 'approved' | 'changes_requested';
export type DurationMode = 'calendar' | 'working_days';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ActiveView = 'planner' | 'config' | 'dashboard' | 'team' | 'financials' | 'users' | 'roles' | 'create-role';
export type UserRole = 'admin' | 'project_manager' | 'contributor' | 'viewer' | 'field_engineer';
export type MemberAvailabilityStatus = 'active' | 'on_leave' | 'inactive';

// Effort Allocation for Multiple Contributors (Option C)
export interface TaskEffortAllocation {
  memberId: string;                // TeamMember.id
  allocatedHours: number;          // Finite number >= 0
}

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;         // For hierarchical WBS summary rows
  name: string;
  category: string;                // e.g., "Hardware", "Backend", "Operations"
  priority?: TaskPriority;         // 'Low' | 'Medium' | 'High' | 'Urgent'
  start: string;                   // YYYY-MM-DD
  end: string;                     // YYYY-MM-DD
  pct: number;                     // 0 - 100
  isMilestone: boolean;            // Duration = 0, rendered as diamond
  dependsOn: string[];             // Predecessor Task IDs (Finish-to-Start)
  baselineStart?: string;
  baselineEnd?: string;
  status: TaskStatus;
  blockReason?: string;            // Explanation when status === 'Blocked'
  order: number;

  // Preserved Legacy Assignee & Resolution
  assignee?: string;               // Legacy string preserved exactly as imported
  assigneeUnresolved?: boolean;    // True if legacy string could not be verified
  assignedTo?: string | number;
  assigned_to?: string | number;

  // Enhanced Ownership & Accountability
  primaryOwnerId: string | null;   // Single accountable owner; null if unassigned
  primaryOwnerHours?: number | null; // Hours personal to the primary owner (>= 0)
  contributorAllocations: TaskEffortAllocation[]; // Explicit contributor hours
  reviewerId: string | null;       // Optional sign-off reviewer
  reviewStatus: ReviewStatus;      // Review workflow state
  reviewNote?: string | null;      // Feedback recorded upon review approval/rejection

  // Quantitative Effort & Capacity Tracking
  estimatedHours?: number | null;  // Total task effort; null if unestimated (Option B)
  loggedHours?: number;            // Actual hours logged to date
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;                  // Optional — NEVER invented or auto-generated
  phone?: string;                  // Optional
  avatar?: string;                 // Base64 Data URL or undefined
  photoUrl?: string;               // Avatar photo URL
  jobTitle: string;                // Company title e.g. "Senior Automation Engineer"
  department: string;              // e.g. "Engineering", "Operations", "QA"
  skills?: string[];               // Skill tags e.g. ["PLC", "React"]
  systemRole: UserRole;            // Simulated capability role
  weeklyCapacityHours: number;     // Standard working hours/week (e.g., 40, or 0 if on leave)
  status: MemberAvailabilityStatus;// 'active' | 'on_leave' | 'inactive'
  color: string;                   // Clay accent color
  createdAt: string;
}

export type RIBType = 'risk' | 'issue' | 'blocker';
export type RIBSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RIBLikelihood = 'low' | 'medium' | 'high';
export type RIBStatus = 'open' | 'investigating' | 'mitigating' | 'resolved';

export interface ProjectRisk {
  id: string;
  projectId: string;
  linkedTaskIds: string[];
  linkedMilestoneIds: string[];
  code?: string;
  title: string;
  description: string;
  type: RIBType;
  severity: RIBSeverity;
  status: RIBStatus;
  likelihood?: RIBLikelihood | null; // Mandatory for 'risk'; null for 'issue'/'blocker'
  impact: RIBSeverity;
  rootCause: string;                // Mandatory for 'issue' and 'blocker'; optional for 'risk'
  ownerId: string | null;           // Accountable resolver
  identifiedDate: string;          // YYYY-MM-DD
  dueDate: string;                 // YYYY-MM-DD
  mitigationPlan: string;          // Mandatory resolution/mitigation steps
  resolutionSummary?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'status_changed'
  | 'primary_owner_reassigned'
  | 'contributors_updated'
  | 'effort_updated'
  | 'dates_shifted'
  | 'reviewer_assigned'
  | 'review_requested'
  | 'review_approved'
  | 'review_rejected'
  | 'baseline_locked'
  | 'baseline_cleared'
  | 'risk_created'
  | 'risk_updated'
  | 'risk_resolved'
  | 'project_archived'
  | 'project_unarchived';

export interface AuditLogEntry {
  id: string;
  projectId: string;
  taskId: string | null;
  timestamp: string;               // ISO 8601 UTC
  actorId: string;                 // Active persona ID
  actorName: string;               // Name of active persona
  actorRole: UserRole;             // Role of active persona
  action: AuditAction;
  fieldName: string | null;        // Mutated field name
  oldValue: string | null;         // JSON-serialized previous value
  newValue: string | null;         // JSON-serialized new value
  reason: string | null;           // Explanation
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;               // ISO 8601 UTC
}

export interface CategoryDef {
  id: string;
  name: string;
  color: string;                   // Hex or Tailwind color class
}

export interface ProjectConfig {
  weekendDays: number[];           // e.g., [5, 6] for Fri/Sat (MENA) or [0, 6] for Sun/Sat
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
  code: string;                    // e.g., "MAFI-01", "SPARK-ERP"
  description: string;
  createdAt: string;
  updatedAt: string;
  config: ProjectConfig;
  tasks: Task[];
  risks: ProjectRisk[];
  clientName: string | null;       // Client or business sponsor
  projectType: 'client' | 'internal' | 'unclassified';
  projectManagerId: string | null; // Nullable; NEVER defaulted to an arbitrary team member
  isArchived: boolean;             // Soft-archiving flag
  archivedAt: string | null;
}

export interface ProjectStore {
  projects: Project[];
  activeProjectId: string;
  theme: ThemeMode;
  zoomLevel: number;               // Pixel width per day (e.g., 14 to 48)
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Simulated Persona Context (UX testing boundary)
  activePersonaId: string;
  activePersonaRole: UserRole;
  setPersona: (memberId: string, role?: UserRole) => void;

  // Global Team Directory
  teamMembers: TeamMember[];
  addTeamMember: (member: Omit<TeamMember, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => string;
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => { success: boolean; reason?: string };
  syncTeamMembersFromBackend: (users: Array<Record<string, any>>) => void;

  // Audit Logs
  auditLogs: AuditLogEntry[];
  logAudit: (
    action: AuditAction,
    fieldName: string | null,
    oldValue: any,
    newValue: any,
    reason?: string | null,
    taskId?: string | null,
    projectIdOverride?: string
  ) => Promise<void>;

  // Task Comments
  taskComments: Record<string, TaskComment[]>;
  addTaskComment: (taskId: string, content: string) => Promise<void>;
  deleteTaskComment: (commentId: string, taskId: string) => Promise<void>;

  // Risks, Issues & Blockers
  addRisk: (risk: Omit<ProjectRisk, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => void;
  updateRisk: (riskId: string, updates: Partial<ProjectRisk>) => void;
  deleteRisk: (riskId: string) => void;
  
  // Actions - Project Management
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'risks'>) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  archiveProject: (id: string, isArchived: boolean) => void;
  duplicateProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  
  // Actions - Task Operations (Scoped to Active Project)
  addTask: (task: Omit<Task, 'id' | 'order' | 'projectId' | 'contributorAllocations' | 'reviewStatus' | 'primaryOwnerId' | 'reviewerId'> & Partial<Pick<Task, 'primaryOwnerId' | 'contributorAllocations' | 'reviewerId' | 'estimatedHours'>>) => void;
  updateTask: (taskId: string, updates: Partial<Task>, reason?: string) => void;
  deleteTask: (taskId: string) => void;
  reorderTasks: (startIndex: number, endIndex: number) => void;
  reassignTask: (taskId: string, newOwnerId: string | null, reason?: string) => void;
  reviewTask: (taskId: string, decision: 'approved' | 'changes_requested', note?: string, remainingPct?: number) => void;
  
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

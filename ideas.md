# 🚀 DeliverOps: Enterprise Project Delivery & Resource Management Platform
## Specification v2.2: Amendments, Formal Contracts & Acceptance Criteria

> **Document Version**: 2.2 (Targeted Architectural Amendment)  
> **Status**: Approved Specification with Final Engineering Amendments — Ready for Phase 1 Execution  
> **Scope**: Resolving all remaining state-machine invariants, data contracts, persistence consistency, effort rules, and testing criteria.

---

## 1. State Machine & Progress Invariants Amendments

### 1.1 Invariant Table & Status Lifecycle

| Status | Progress Invariant | Review Status Invariant | Blocker Invariant | Transition Requirements |
| :--- | :---: | :---: | :---: | :--- |
| **`Not Started`** | $\text{pct} = 0\%$ | `none` | Allowed | Initial state. Cannot have $\text{pct} > 0$. |
| **`In Progress`** | $0\% \le \text{pct} < 100\%$ | `none` or `changes_requested` | Allowed | Active execution. Progress can begin at $0\%$ or $> 0\%$. **No arbitrary 10% auto-increase.** |
| **`In Review`** | $0\% < \text{pct} \le 100\%$ | `pending_review` | N/A | Requires `reviewerId != null`. Set when work is submitted for sign-off. |
| **`Blocked`** | $0\% \le \text{pct} \le 100\%$ (Preserved) | Preserved | **Mandatory** | Requires non-empty `blockReason` **OR** linked `ProjectRisk`. |
| **`Completed`** | $\text{pct} = 100\%$ | `none` or `approved` | N/A | If `reviewerId != null`, requires `reviewStatus === 'approved'`. |

### 1.2 Resolution of Rejected Reviews & Progress Invariant Contradiction
* **Contradiction Resolved**: `In Progress` strictly enforces $\text{pct} < 100\%$. If a task submitted at $100\%$ is rejected by the reviewer:
  1. Status transitions to `In Progress`.
  2. `reviewStatus` is set to `'changes_requested'`.
  3. A mandatory `reviewNote` is recorded.
  4. Progress percentage is capped at $\le 95\%$ (the reviewer specifies the exact remaining progress, e.g., $90\%$, in the rejection modal; if unspecified, it defaults to $95\%$). It does **not** reset arbitrarily to $80\%$, nor does it violate the invariant by remaining at $100\%$ while in progress.

### 1.3 Blocker Validation Alignment
* Attempting to transition a task to `Blocked` validates that:
  $$\text{task.blockReason?.trim().length} > 0 \quad \lor \quad (\text{linkedRiskId} \ne \text{null} \land \text{risk.title?.trim().length} > 0)$$
* If neither condition is met, the transition is rejected with a validation error.

---

## 2. Updated Data Contracts & Complete Interfaces

### 2.1 Complete `Project` Interface
```typescript
export interface ProjectConfig {
  weekendDays: number[];           // e.g. [5, 6] (MENA) or [0, 6] (Western)
  durationMode: DurationMode;      // 'calendar' | 'working_days'
  targetLaunchDate?: string;       // YYYY-MM-DD
  highlightCriticalPath: boolean;
  categories: CategoryDef[];
  hasLockedBaseline: boolean;
  baselineLockedDate?: string;     // YYYY-MM-DD
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  createdAt: string;               // ISO 8601 UTC
  updatedAt: string;               // ISO 8601 UTC
  config: ProjectConfig;
  tasks: Task[];
  risks: ProjectRisk[];
  
  // Reconciled Metadata Fields
  clientName: string | null;       // Client name or null if internal/unspecified
  projectType: 'client' | 'internal' | 'unclassified';
  projectManagerId: string | null; // Nullable; NEVER defaulted to an arbitrary team member
  isArchived: boolean;             // Soft-archiving flag
  archivedAt: string | null;       // ISO 8601 UTC or null
}
```

### 2.2 Complete `AuditLogEntry` Interface
```typescript
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
  fieldName: string | null;        // Property that mutated (e.g. 'status', 'primaryOwnerId')
  oldValue: string | null;         // JSON-serialized previous value
  newValue: string | null;         // JSON-serialized new value
  reason: string | null;           // Mandatory for baseline edits and critical status changes
}
```

### 2.3 Complete `Task` Interface
```typescript
export type TaskStatus = 'Not Started' | 'In Progress' | 'Blocked' | 'In Review' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type ReviewStatus = 'none' | 'pending_review' | 'approved' | 'changes_requested';

export interface TaskEffortAllocation {
  memberId: string;                // TeamMember.id
  allocatedHours: number;          // Finite number >= 0
}

export interface Task {
  // Existing Preserved Identity & Ordering
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  category: string;
  priority?: TaskPriority;
  order: number;

  // Preserved Dates, Duration & Critical Path
  start: string;                   // YYYY-MM-DD
  end: string;                     // YYYY-MM-DD
  pct: number;                     // 0 - 100
  isMilestone: boolean;
  dependsOn: string[];             // Predecessor Task IDs
  baselineStart?: string;
  baselineEnd?: string;

  // Preserved Status & Blocker Explanation
  status: TaskStatus;
  blockReason?: string;

  // Preserved Legacy Assignee & Resolution Flag
  assignee?: string;               // Legacy string preserved exactly as imported
  assigneeUnresolved?: boolean;    // True if legacy string could not be verified

  // Enhanced Ownership & Accountability
  primaryOwnerId: string | null;   // Single accountable owner; null if unassigned
  primaryOwnerHours?: number | null; // Hours personal to the primary owner (>= 0)
  contributorAllocations: TaskEffortAllocation[]; // Contributor hours
  reviewerId: string | null;       // Optional sign-off reviewer
  reviewStatus: ReviewStatus;
  reviewNote?: string | null;      // Feedback recorded upon approval/rejection

  // Effort & Quantitative Capacity
  estimatedHours?: number | null;  // Total estimated hours; null if unestimated (Option B)
  loggedHours?: number;            // Actual hours logged to date
}
```

### 2.4 Complete `TeamMember` Interface
```typescript
export interface TeamMember {
  id: string;
  name: string;
  email?: string;                  // Optional — NEVER invented or auto-generated
  phone?: string;
  avatar?: string;                 // Data URL or undefined
  jobTitle: string;
  department: string;
  skills?: string[];               // Reconciled skills tags (e.g. ['PLC', 'React'])
  systemRole: UserRole;            // Simulated capability role
  weeklyCapacityHours: number;     // Standard working hours/week (e.g., 40, or 0 if on leave)
  status: MemberAvailabilityStatus;// 'active' | 'on_leave' | 'inactive'
  color: string;                   // Clay accent color
  createdAt: string;
}
```

### 2.5 Complete `ProjectRisk` Interface (Reconciled RIB Model)
```typescript
export type RIBType = 'risk' | 'issue' | 'blocker';
export type RIBSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RIBLikelihood = 'low' | 'medium' | 'high';
export type RIBStatus = 'open' | 'investigating' | 'mitigating' | 'resolved';

export interface ProjectRisk {
  id: string;
  projectId: string;
  linkedTaskIds: string[];
  linkedMilestoneIds: string[];
  title: string;
  description: string;
  type: RIBType;
  severity: RIBSeverity;
  status: RIBStatus;
  
  // Likelihood & Impact Differentiation
  likelihood?: RIBLikelihood | null; // Mandatory for 'risk'; null for 'issue'/'blocker' (already occurred)
  impact: RIBSeverity;              // Impact severity
  
  // Root Cause & Resolution Plans
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
```

---

## 3. Migration Safety & IndexedDB Schema

### 3.1 Multi-Tier Backup (Replacing `localStorage` Quota Limit)
`localStorage` has a 5MB quota that fails on production data. DeliverOps uses a 3-tier safety net:
1. **Primary Backup (IndexedDB `migration_snapshots`)**: A dedicated object store in `ClayGanttDB` captures a raw snapshot of all projects before schema upgrade.
2. **Secondary Backup (Zustand In-Memory)**: Raw snapshot retained in `store.migrationRollbackSnapshot`.
3. **Tertiary Fallback (JSON Export)**: In the event of a fatal migration failure, a browser prompt triggers an immediate download of the pre-migration JSON blob.

### 3.2 IndexedDB Schema Upgrade (`DB_VERSION = 2`)
* Verified existing state: [`src/db/projectDB.ts`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/src/db/projectDB.ts) currently uses `DB_NAME = 'ClayGanttDB'`, `DB_VERSION = 1` with stores `projects` and `meta`.
* Upgrade to `DB_VERSION = 2`:
  ```typescript
  // In onupgradeneeded:
  if (!db.objectStoreNames.contains('projects')) {
    const pStore = db.createObjectStore('projects', { keyPath: 'id' });
    pStore.createIndex('updatedAt', 'updatedAt', { unique: false });
    pStore.createIndex('code', 'code', { unique: false });
  }
  if (!db.objectStoreNames.contains('team_members')) {
    const tStore = db.createObjectStore('team_members', { keyPath: 'id' });
    tStore.createIndex('department', 'department', { unique: false });
    tStore.createIndex('status', 'status', { unique: false });
  }
  if (!db.objectStoreNames.contains('task_comments')) {
    const cStore = db.createObjectStore('task_comments', { keyPath: 'id' });
    cStore.createIndex('taskId', 'taskId', { unique: false });
  }
  if (!db.objectStoreNames.contains('audit_logs')) {
    const aStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
    aStore.createIndex('projectId', 'projectId', { unique: false });
    aStore.createIndex('timestamp', 'timestamp', { unique: false });
  }
  if (!db.objectStoreNames.contains('migration_snapshots')) {
    db.createObjectStore('migration_snapshots', { keyPath: 'snapshotKey' });
  }
  if (!db.objectStoreNames.contains('meta')) {
    db.createObjectStore('meta', { keyPath: 'key' });
  }
  ```

---

## 4. Effort Allocation & Validation Rules

### 4.1 Effort Validation Rules
1. **Finite Non-Negative Numbers**: `estimatedHours`, `primaryOwnerHours`, and contributor `allocatedHours` must be finite numbers $\ge 0$.
2. **Unique Contributor Allocations**: A `memberId` may appear at most once in `contributorAllocations`.
3. **No Owner Duplication**: `primaryOwnerId` cannot be included in `contributorAllocations`.
4. **Unallocated Balance Tracking**:
   $$H_{\text{allocated}} = (t.\text{primaryOwnerHours} \mathbin{\Vert} 0) + \sum_{c \in t.\text{contributorAllocations}} c.\text{allocatedHours}$$
   * If total estimate $H$ is defined ($H > 0$):
     * If $H_{\text{allocated}} \le H$, the system tracks an explicit **Unallocated Balance**:
       $$H_{\text{unallocated}} = H - H_{\text{allocated}}$$
       The UI displays: *"20h estimated: 12h assigned, 8h unallocated"*.
     * If $H_{\text{allocated}} > H$, validation prevents saving unless the total estimate $H$ is increased to cover the assigned hours.

---

## 5. Calendar Rules & Non-Working Days

1. **Authoritative Project Calendar**: Project `config.weekendDays` dictates the working schedule.
2. **Tasks Scheduled Entirely on Non-Working Days**:
   * If working days $W(t) = 0$ (e.g. task scheduled entirely across Fri/Sat under MENA rules):
     * UI renders an explicit operational badge: ⚠️ *"Scheduled on non-working days (Overtime)"*.
     * Daily burn rate fallback: Uses calendar elapsed days $D_{\text{cal}} = \max(1, \text{diffCalendarDays}(start, end) + 1)$ to distribute effort across the weekend days, tagging the hours as overtime load.
3. **Zero-Capacity Periods**:
   * If a member has `weeklyCapacityHours === 0` or `status === 'on_leave'`, available capacity is $0\text{h}$.
   * Any assigned hours trigger an immediate 🔴 **"Assigned to member on leave / zero capacity"** warning.

---

## 6. Persistence Consistency & Referential Integrity

### 6.1 Atomic Multi-Store Transactions
In `projectDB.ts`, saving a project and logging its audit entry occurs inside a single atomic IndexedDB transaction:
```typescript
export async function dbSaveProjectWithAudit(project: Project, auditEntry: AuditLogEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['projects', 'audit_logs'], 'readwrite');
    tx.objectStore('projects').put(project);
    tx.objectStore('audit_logs').put(auditEntry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));
  });
}
```
If either write fails, the transaction automatically aborts and rolls back both writes.

### 6.2 Preventing Orphaned Assignments on Member Deletion
Before deleting a team member from `team_members`:
1. The repository scans all projects to verify if `memberId` is referenced in any task's `primaryOwnerId`, `contributorAllocations`, or `reviewerId`.
2. If active references exist:
   * **Deletion is blocked**.
   * Prompt: *"Cannot delete [Name]: Assigned to N tasks. Reassign their tasks or set member status to 'Inactive'"*.
3. Only unreferenced members can be permanently deleted.

---

## 7. New & Changed Acceptance Criteria

| Test ID | Phase | Test Case Description | Exact Pass Criteria |
| :--- | :--- | :--- | :--- |
| **TC-1.1** | Phase 1 | Atomic Multi-Store Mutation | `dbSaveProjectWithAudit` writes to both `projects` and `audit_logs`. Simulating an abort in audit log leaves `projects` unmutated. |
| **TC-1.2** | Phase 1 | Non-Empty Blocker Invariant | Setting status to `Blocked` fails if both `blockReason` and linked risk are empty; succeeds when either is provided. |
| **TC-1.3** | Phase 1 | Rejection Progress Invariant | Rejecting a review moves status to `In Progress` with `reviewStatus === 'changes_requested'`, required `reviewNote`, and progress capped at $\le 95\%$. |
| **TC-1.4** | Phase 1 | Effort Allocation Integrity | Contributor allocations with duplicate members, negative numbers, or primary owner inclusion are rejected by validation. |
| **TC-1.5** | Phase 1 | Member Deletion Protection | Attempting to delete a team member assigned as primary owner or contributor on an active task is blocked with an error prompt. |
| **TC-1.6** | Phase 1 | IndexedDB Backup & Recovery | Migration creates a snapshot in `migration_snapshots`. Corrupting a record during migration restores the snapshot with 0 data loss. |
| **TC-1.7** | Phase 1 | Regression of Existing Core | `calculateCPM`, `getBaselineVariance`, `calculateDuration`, column filters, and sorting produce identical results on legacy project datasets. |
| **TC-2.1** | Phase 2 | RIB Likelihood & Root Cause | Creating a `risk` requires `likelihood` and `impact`; creating a `blocker` requires `rootCause` and `severity`. |

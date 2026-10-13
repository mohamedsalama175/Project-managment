# 03. CRUD Specifications & State Machines

> **Document ID:** `DOC-03-CRUD-SPECIFICATIONS`  
> **Status:** Production-Ready / Implementation-Grade  
> **Version:** 2.0.0  
> **Harmonized With:** 01-BUSINESS, 05-BACKEND, 06-API, 09-SECURITY, 13-ADR, 14-ERROR-CODES, 15-DATA-DICT

---

## 1. Domain Entities & Database Mapping

Every entity in DeliverOps is identified by a unique, time-sortable **ULID** (`CHAR(26)`) and stored in MySQL 8.0 InnoDB with strict referential integrity.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE ENTITY RELATIONSHIPS                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌───────────────┐           ┌────────────────────┐                   │
│   │     User      │◄──────────┤      Project       │                   │
│   └───────▲───────┘ (PM ID)   └─────────┬──────────┘                   │
│           │                             │                              │
│           │ 1:N                         │ 1:N                          │
│   ┌───────┴───────┐                     ├──────────────────────┐       │
│   │ ProjectUser   │                     ▼                      ▼       │
│   │ (Member Roles)│           ┌────────────────────┐ ┌───────────────┐ │
│   └───────────────┘           │    ProjectRisk     │ │BaselineVersion│ │
│                               └─────────▲──────────┘ └───────┬───────┘ │
│                                         │                    │         │
│                                         │ M:N (Pivot)        │ 1:N     │
│                               ┌─────────┴──────────┐         ▼         │
│                               │        Task        │ ┌───────────────┐ │
│                               └──────▲──────┬──────┘ │ TaskBaseline  │ │
│                                      │      └────────┴───────────────┘ │
│                                  1:N │                                 │
│                     ┌────────────────┴────────────────┐                │
│                     │                                 │                │
│            ┌────────┴────────┐               ┌────────┴────────┐       │
│            │   TaskComment   │               │ EffortAllocation│       │
│            └─────────────────┘               └─────────────────┘       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Projects CRUD (`App\Modules\Projects`)

### 2.1 Schema Definition
- **Table**: `projects`
- **Fields**:
  - `id`: `CHAR(26)` (ULID, Primary Key)
  - `name`: `VARCHAR(255)` (Required)
  - `code`: `VARCHAR(50)` (Required, Unique index)
  - `description`: `TEXT` (Nullable)
  - `project_manager_id`: `CHAR(26)` (Foreign Key $\to$ `users.id`)
  - `config`: `JSON` (Weekend days, holidays, duration mode, target launch date)
  - `has_locked_baseline`: `BOOLEAN` (Default: `false`)
  - `baseline_locked_at`: `DATETIME` (Nullable)
  - `tree_version`: `INT` (Default: `1`, Optimistic concurrency locking)
  - `is_archived`: `BOOLEAN` (Default: `false`)
  - `deleted_at`: `TIMESTAMP` (Soft delete)

### 2.2 Operations Matrix
| Operation | Method & URI | Authorization | Pre-Conditions & Invariants |
| :--- | :--- | :--- | :--- |
| **List Projects** | `GET /api/v1/projects` | `projects.view` | Scoped to projects where user is PM, member, or admin. Supports `search`, `status`, `page`. |
| **Create Project** | `POST /api/v1/projects` | `projects.create` | Generates unique project code prefix. Validates PM assignment. Creates audit log. |
| **Show Project** | `GET /api/v1/projects/{id}` | `projects.view` | Eager loads PM, member count, task metrics. |
| **Update Project** | `PUT /api/v1/projects/{id}` | `projects.edit` | Validates optimistic locking (`tree_version`). Logs modified fields. |
| **Soft Delete** | `DELETE /api/v1/projects/{id}` | `projects.archive` | Soft deletes project. Does not cascade-delete audit entries. |
| **Restore Project** | `POST /api/v1/projects/{id}/restore` | `projects.archive` | Reinstates soft-deleted project. |
| **Add Member** | `POST /api/v1/projects/{id}/members` | `projects.edit` | Links user to `project_user` with project-scoped role (`pm`, `contributor`, `viewer`). |
| **Remove Member**| `DELETE /api/v1/projects/{id}/members/{u}` | `projects.edit` | Prevents removing the active Project Manager without reassigning first. |

---

## 3. Tasks & WBS CRUD (`App\Modules\Tasks`)

### 3.1 Task Lifecycle State Machine

```
              ┌───────────────┐
              │  Not Started  │ (pct = 0%)
              └───────┬───────┘
                      │ (Progress starts > 0% or execution begins)
                      ▼
              ┌───────────────┐
      ┌───────┤  In Progress  │◄───────────────────────┐
      │       └───────┬───────┘                        │
      │               │                                │
(Risk │               │ (Work done; review requested)  │ (Changes requested;
Blocks)               ▼                                │  pct rolled back)
      │       ┌───────────────┐                        │
      │       │   In Review   │────────────────────────┘
      │       └───────┬───────┘
      │               │ (Independent peer approves deliverable)
      │               ▼
      │       ┌───────────────┐
      │       │   Completed   │ (pct = 100%)
      │       └───────────────┘
      │
      ▼
┌───────────────┐
│    Blocked    │ (Requires non-empty block_reason OR linked ProjectRisk)
└───────┬───────┘
        │ (All linked active risks resolved: open/mitigating -> resolved/closed)
        └───────► (Returns to previous preserved state: Not Started or In Progress)
```

### 3.2 Operations Matrix
| Operation | Method & URI | Authorization | Invariants & Calculations |
| :--- | :--- | :--- | :--- |
| **List Tasks** | `GET /api/v1/projects/{p}/tasks` | `projects.view` | Returns complete WBS tree ordered by `order_index`. Loads predecessors and effort. |
| **Create Task** | `POST /api/v1/projects/{p}/tasks` | `tasks.create` | Validates `parent_id` belongs to same project. Appends to end of sibling `order_index`. |
| **Update Task** | `PUT /api/v1/projects/{p}/tasks/{t}` | `tasks.edit_details` or `tasks.update_progress` | Enforces state machine table. Recalculates parent rollups and CPM auto-schedule. |
| **Delete Task** | `DELETE /api/v1/projects/{p}/tasks/{t}` | `tasks.delete` | Re-links or deletes child sub-tasks. Removes dependency associations. |
| **Reorder Tasks**| `POST /api/v1/projects/{p}/tasks/reorder` | `tasks.edit_details` | Accepts list of `{taskId, newOrderIndex}`. Linearly updates sibling sequence. |
| **Critical Path**| `GET /api/v1/projects/{p}/critical-path` | `projects.view` | Runs CPM DAG engine and filters tasks where $TF \le 0$. |

---

## 4. CPM Scheduling Engine (`App\Modules\Scheduling`)

### 4.1 Dependency Schema (`task_dependencies`)
- `id`: `CHAR(26)` (ULID)
- `task_id`: `CHAR(26)` (Successor task)
- `predecessor_id`: `CHAR(26)` (Predecessor task)
- `dependency_type`: `ENUM('finish_to_start', 'start_to_start', 'finish_to_finish')` (Default: `finish_to_start`)
- `lag_days`: `INT` (Default: `0`)

### 4.2 Mathematical Algorithms

#### 1. Cycle Detection (Kahn's Algorithm)
Before scheduling, DeliverOps computes in-degrees for all tasks in the project dependency graph:
$$L \leftarrow \text{Empty list containing sorted elements}$$
$$S \leftarrow \text{Set of all tasks with in-degree } 0$$
$$\text{while } S \text{ is not empty:}$$
$$\quad \text{remove a node } n \text{ from } S \text{ and append to } L$$
$$\quad \text{for each node } m \text{ with an edge } e \text{ from } n \text{ to } m:$$
$$\qquad \text{remove edge } e \text{ from graph}$$
$$\qquad \text{if } m \text{ has no other incoming edges, insert } m \text{ into } S$$
$$\text{if graph has edges: throw CycleDetectedException}$$

#### 2. Forward Pass (Early Dates)
- For root tasks: $ES = \text{Project Start Date}$, $EF = \text{addWorkingDays}(ES, \text{duration} - 1)$
- For successor tasks:
  $$ES = \max_{p \in \text{predecessors}}(\text{nextWorkingDay}(EF_p) + \text{lag\_days})$$
  $$EF = \text{addWorkingDays}(ES, \text{duration} - 1)$$

#### 3. Backward Pass (Late Dates)
- Project Finish Date $PF = \max_{t \in \text{tasks}}(EF_t)$
- For terminal tasks: $LF = PF$, $LS = \text{subtractWorkingDays}(LF, \text{duration} - 1)$
- For predecessor tasks:
  $$LF = \min_{s \in \text{successors}}(\text{prevWorkingDay}(LS_s - \text{lag\_days}, \text{strictlyBefore: true}))$$
  $$LS = \text{subtractWorkingDays}(LF, \text{duration} - 1)$$

#### 4. Total Float & Critical Sequence
- Total Float:
  $$TF = LS - ES = LF - EF$$
- Critical Path: All tasks where $TF \le 0$, sorted chronologically by $ES$.

---

## 5. Risks & Multi-Blockers CRUD (`App\Modules\Risks`)

### 5.1 Schema Definition
- **Table**: `project_risks`
- **Fields**: `id`, `project_id`, `title`, `description`, `type`, `severity`, `likelihood`, `impact`, `status` (`open`, `mitigating`, `mitigated`, `resolved`, `closed`), `mitigation_plan`, `owner_id`, `identified_date`, `due_date`.
- **Pivot Table**: `risk_task_blockers` (`id`, `risk_id`, `task_id`, `created_at`)

### 5.2 Blocker Linking & Multi-Blocker Release Logic
```php
// Linking Risk to Tasks:
foreach ($linkedTaskIds as $taskId) {
    RiskTaskBlocker::firstOrCreate(['risk_id' => $risk->id, 'task_id' => $taskId]);
    
    $task = Task::find($taskId);
    if ($task->status !== 'Blocked') {
        // Preserve prior state in block_reason for clean unblocking
        $task->block_reason = "{$task->status}||{$risk->title}";
        $task->status = 'Blocked';
        $task->save();
    }
}

// Resolving Risk Automatically Releases Tasks when ALL linked active risks resolve:
if (in_array($risk->status, ['mitigated', 'resolved', 'closed'])) {
    $blockedTasks = $risk->blockedTasks;
    foreach ($blockedTasks as $task) {
        $activeBlockersCount = $task->linkedRisks()
            ->whereIn('status', ['open', 'mitigating'])
            ->count();

        if ($activeBlockersCount === 0) {
            // Restore previous state (e.g. 'In Progress' or 'Not Started')
            $prevStatus = explode('||', $task->block_reason)[0] ?? 'In Progress';
            $task->status = in_array($prevStatus, ['Not Started', 'In Progress']) ? $prevStatus : 'In Progress';
            $task->block_reason = null;
            $task->save();
        }
    }
}
```

---

## 6. Baselines CRUD (`App\Modules\Baselines`)

### 6.1 Multi-Baseline Version Operations
1. **Create Baseline Version (`POST /api/v1/projects/{p}/baselines`)**:
   - Takes a frozen snapshot of all current task dates into `task_baselines`:
     $$\text{task\_baselines.start\_date} \leftarrow \text{tasks.start\_date}$$
     $$\text{task\_baselines.end\_date} \leftarrow \text{tasks.end\_date}$$
   - Creates a named version record in `baseline_versions` (e.g. `version_number: 1`, `name: "V1.0 Contractual Target"`).
   - Marks `has_locked_baseline = true`.
2. **List Baseline Versions (`GET /api/v1/projects/{p}/baselines`)**:
   - Returns all historical snapshots captured for this project.
3. **Variance Inspection (`GET /api/v1/projects/{p}/baselines/{v}/variance`)**:
   - Computes $SV$ and $FV$ against the chosen baseline version:
     $$SV = \text{tasks.start\_date} - \text{task\_baselines.start\_date}$$
     $$FV = \text{tasks.end\_date} - \text{task\_baselines.end\_date}$$

---

## 7. Collaboration & Review CRUD (`App\Modules\Collaboration`)

### 7.1 Anti-Self-Approval Review Enforcement
```php
public function processReviewDecision(Task $task, User $actor, string $decision, ?string $note): Task
{
    if ($decision === 'approved') {
        // Enforce Anti-Self-Approval Guard:
        // Neither the author, primary owner, nor effort contributors may approve.
        $isSubmitter = ($task->submitted_by_id === $actor->id);
        $isPrimaryOwner = ($task->primary_owner_id === $actor->id);
        $isContributor = $task->effortAllocations()->where('member_id', $actor->id)->exists();

        if ($isSubmitter || $isPrimaryOwner || $isContributor) {
            throw new HttpResponseException(response()->json([
                'success' => false,
                'error_code' => 'REVIEW_SELF_APPROVAL_PROHIBITED',
                'message' => 'Anti-self-approval rule violation: Authors, primary owners, and contributors cannot approve their own tasks.',
            ], 403));
        }
    }

    // Process valid transition
    $task->review_status = ($decision === 'approved') ? 'approved' : 'changes_requested';
    $task->status = ($decision === 'approved') ? 'Completed' : 'In Progress';
    $task->review_note = $note;
    $task->save();

    return $task;
}
```

### 7.2 Review Rejection & Changes Requested
- Reviewer submits a mandatory rejection reason (`review_note`).
- Status transitions back to `In Progress`.
- `review_status` transitions to `changes_requested`.
- Progress percentage is rolled back ($\le 95\%$) to maintain invariant integrity.

---

## 8. Identity & RBAC CRUD (`App\Modules\Identity`)

### 8.1 Schema Definition
- **Table**: `users`
- **Fields**: `id`, `name`, `email`, `password`, `phone`, `avatar_path`, `job_title`, `department`, `skills` (JSON), `weekly_capacity_hours`, `status` (`active`, `on_leave`, `inactive`), `color`, `must_change_password`, `active_email` (Virtual generated column).

### 8.2 Safe Soft-Deletion & Email Reuse
To prevent soft-deleted users from blocking future sign-ups with the same email, DeliverOps employs a MySQL virtual generated column:
```sql
ALTER TABLE users ADD COLUMN active_email VARCHAR(255) 
GENERATED ALWAYS AS (IF(deleted_at IS NULL, email, NULL)) VIRTUAL;

CREATE UNIQUE INDEX users_active_email_unique ON users(active_email);
```
- Active users have `active_email = email` (enforcing strict uniqueness).
- Soft-deleted users have `active_email = NULL` (MySQL allows multiple NULLs in unique indexes).

### 8.3 Invariants
1. **Self-Deletion Guard**: A user cannot delete their own account.
2. **Last Admin Guard**: The system checks active administrators before deletion or deactivation:
   $$\text{activeAdminsCount} = \text{User::role('admin')->whereNull('deleted_at')->where('id', '!=', \$id)->lockForUpdate()->count()}$$
   If $\text{activeAdminsCount} = 0$, deletion is aborted with `LAST_ADMIN_PROTECTED`.
3. **Privilege Escalation Guard**: Non-admin users cannot grant roles higher than their own highest role.

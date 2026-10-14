# 03. CRUD Specifications, Invariants & State Machines

> **Document ID:** `DOC-03-CRUD-SPECIFICATIONS`  
> **Status:** Production-Ready / Implementation-Grade  
> **Version:** 2.2.0  
> **Harmonized With:** [01-BUSINESS](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/01-BUSINESS-AND-DOMAIN.md), [02-FEATURES](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/02-FEATURES-AND-PAGES.md), [05-BACKEND](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/05-BACKEND-ARCHITECTURE.md), [06-API](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/06-API-REFERENCE.md), [07-FRONTEND](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/07-FRONTEND-ARCHITECTURE.md), [09-SECURITY](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/09-SECURITY-AND-COMPLIANCE.md), [13-ADR](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/13-ADR-LOG.md), [14-ERROR-CODES](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/14-ERROR-CODES.md), [15-DATA-DICT](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/15-DATA-DICTIONARY.md)

---

## 1. Multi-Tenant Entity Relational Architecture

Every transactional entity in DeliverOps is strictly bound to an **Organization** via an indexed `organization_id` foreign key (`CHAR(26)` ULID). All entities use ULID primary keys for time-sortable, globally unique distribution in MySQL 8.0 InnoDB.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               MULTI-TENANT ENTITY GRAPH                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│                               ┌──────────────────────┐                                 │
│                               │     Organization     │                                 │
│                               └──────────┬───────────┘                                 │
│                                          │ 1:N                                         │
│                    ┌─────────────────────┼─────────────────────┐                       │
│                    ▼                     ▼                     ▼                       │
│           ┌────────────────┐    ┌─────────────────┐   ┌─────────────────┐              │
│           │      User      │    │     Project     │   │    LegalHold    │              │
│           └────────┬───────┘    └────────┬────────┘   └─────────────────┘              │
│                    │                     │ 1:N                                         │
│                    │ 1:N        ┌────────┴───────────────────┐                         │
│                    │            ▼                            ▼                         │
│                    │  ┌──────────────────┐         ┌──────────────────┐                │
│                    │  │   ProjectRisk    │         │ BaselineVersion  │                │
│                    │  └─────────┬────────┘         └─────────┬────────┘                │
│                    │            │ M:N (Pivot)                │ 1:N                     │
│                    │            ▼                            ▼                         │
│                    │  ┌──────────────────┐         ┌──────────────────┐                │
│                    │  │       Task       │◄────────┤   TaskBaseline   │                │
│                    │  └───────┬──┬───────┘         └──────────────────┘                │
│                    │          │  │                                                     │
│                    │      1:N │  │ 1:N                                                 │
│                    │   ┌──────┘  └──────┐                                              │
│                    ▼   ▼                ▼                                              │
│           ┌────────────────┐   ┌──────────────────┐                                    │
│           │EffortAllocation│   │   TaskComment    │                                    │
│           └────────────────┘   └──────────────────┘                                    │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenancy CRUD (`App\Modules\Tenancy`)

### 2.1 Schema Definition (`organizations`)
- **Table**: `organizations`
- **Fields**:
  - `id`: `CHAR(26)` (ULID, Primary Key)
  - `name`: `VARCHAR(255)` (Required)
  - `slug`: `VARCHAR(100)` (Required, Unique)
  - `domain`: `VARCHAR(255)` (Nullable, Unique SSO domain binding)
  - `status`: `ENUM('trial', 'active', 'suspended', 'cancelled')` (Default: `trial`)
  - `plan`: `ENUM('free', 'pro', 'enterprise')` (Default: `free`)
  - `settings`: `JSON` (MFA enforcement, session TTL, default work week, currency)
  - `trial_ends_at`: `DATETIME` (Nullable)
  - `created_at`, `updated_at`: `TIMESTAMP`

### 2.2 Organization Lifecycle State Machine

```
              ┌───────────────┐
              │     Trial     │ (New tenant created, 14-day evaluation)
              └───────┬───────┘
                      │ (Payment verified / Enterprise contract signed)
                      ▼
              ┌───────────────┐
      ┌───────┤    Active     │◄───────────────────────┐
      │       └───────┬───────┘                        │
      │               │                                │
(Admin│               │ (Billing failure / TOS breach) │ (Payment cured /
Audit │               ▼                                │  Admin reactivated)
Locks)│       ┌───────────────┐                        │
      │       │   Suspended   │────────────────────────┘
      │       └───────┬───────┘
      │               │ (Explicit cancellation / Retention window expired)
      ▼               ▼
┌─────────────────────────────┐
│          Cancelled          │ (Data exportable for 30 days before purge)
└─────────────────────────────┘
```

### 2.3 Tenancy Invariants & Isolation Rules
1. **Tenant Isolation Invariant**: All queries on tenant-scoped tables must include `WHERE organization_id = ?`. In Laravel, this is enforced automatically via the `BelongsToTenant` trait and global scope.
2. **Cross-Tenant Foreign Key Integrity**: Foreign keys across tables (e.g., `tasks.project_id -> projects.id`) must belong to the exact same `organization_id`.
3. **Primary Organization Binding**: A user must have at least one active organization membership. Organization switching updates the active tenant context in session and issues a scoped JWT.

---

## 3. Projects CRUD (`App\Modules\Projects`)

### 3.1 Schema Definition (`projects`)
- **Table**: `projects`
- **Fields**:
  - `id`: `CHAR(26)` (ULID, Primary Key)
  - `organization_id`: `CHAR(26)` (Foreign Key $\to$ `organizations.id`, Required, Indexed)
  - `name`: `VARCHAR(255)` (Required)
  - `code`: `VARCHAR(50)` (Required, Unique per organization)
  - `description`: `TEXT` (Nullable)
  - `status`: `ENUM('draft', 'active', 'on_hold', 'completed', 'archived')` (Default: `draft`)
  - `project_manager_id`: `CHAR(26)` (Foreign Key $\to$ `users.id`)
  - `budget_currency`: `VARCHAR(3)` (Default: `'USD'`)
  - `budget_amount`: `DECIMAL(12,2)` (Default: `0.00`)
  - `config`: `JSON` (Working days `[1,2,3,4,5]`, holidays list, target delivery date)
  - `has_locked_baseline`: `BOOLEAN` (Default: `false`)
  - `baseline_locked_at`: `DATETIME` (Nullable)
  - `tree_version`: `INT` (Default: `1`, Optimistic concurrency locking)
  - `is_archived`: `BOOLEAN` (Default: `false`)
  - `deleted_at`: `TIMESTAMP` (Nullable, Soft delete)

### 3.2 Operations Matrix
| Operation | Method & URI | Authorization | Pre-Conditions & Invariants |
| :--- | :--- | :--- | :--- |
| **List Projects** | `GET /api/v1/projects` | `projects.view` | Strictly tenant-scoped (`organization_id`). Supports query params `status`, `search`, `page`. |
| **Create Project** | `POST /api/v1/projects` | `projects.create` | Generates upper-case unique code. Sets `tree_version = 1`. Audits creation. |
| **Show Project** | `GET /api/v1/projects/{id}` | `projects.view` | Eager-loads PM, member count, critical path summary, EVM metrics. |
| **Update Project** | `PUT /api/v1/projects/{id}` | `projects.edit` | Verifies `tree_version`. Increments `tree_version = tree_version + 1` atomically. |
| **Soft Delete** | `DELETE /api/v1/projects/{id}` | `projects.archive` | Soft deletes project. Blocks deletion if an active `legal_hold` exists on the project. |
| **Restore** | `POST /api/v1/projects/{id}/restore` | `projects.archive` | Reinstates soft-deleted project and recalculates schedule invariants. |
| **Add Member** | `POST /api/v1/projects/{id}/members` | `projects.edit` | Links user in `project_user` with project-level Spatie role (`pm`, `contributor`, `viewer`). |
| **Remove Member**| `DELETE /api/v1/projects/{id}/members/{u}` | `projects.edit` | Prevents removing the active Project Manager without reassigning first. |

---

## 4. Tasks & WBS CRUD (`App\Modules\Tasks`)

### 4.1 Schema Definition (`tasks`)
- **Table**: `tasks`
- **Fields**:
  - `id`: `CHAR(26)` (ULID, Primary Key)
  - `organization_id`: `CHAR(26)` (Foreign Key $\to$ `organizations.id`, Indexed)
  - `project_id`: `CHAR(26)` (Foreign Key $\to$ `projects.id`, Indexed)
  - `wbs_number`: `VARCHAR(50)` (e.g. `'1.2.1'`)
  - `title`: `VARCHAR(255)` (Required)
  - `description`: `TEXT` (Nullable)
  - `status`: `ENUM('Not Started', 'In Progress', 'In Review', 'Completed', 'Blocked')` (Default: `'Not Started'`)
  - `progress_percent`: `INT` (0 to 100)
  - `start_date`: `DATE` (Required)
  - `end_date`: `DATE` (Required)
  - `duration_days`: `INT` (Working days between start and end date inclusive)
  - `parent_id`: `CHAR(26)` (Nullable, Self-referential hierarchy $\to$ `tasks.id`)
  - `order_index`: `INT` (Display ordering within sibling list)
  - `primary_owner_id`: `CHAR(26)` (Foreign Key $\to$ `users.id`, Single point of accountability)
  - `review_status`: `ENUM('none', 'pending_review', 'approved', 'changes_requested')` (Default: `'none'`)
  - `review_note`: `TEXT` (Nullable, Mandatory on `changes_requested`)
  - `block_reason`: `VARCHAR(500)` (Nullable, stores previous status and risk title)
  - `is_milestone`: `BOOLEAN` (Default: `false`)
  - `total_float`: `INT` (Computed by CPM engine)
  - `free_float`: `INT` (Computed by CPM engine)
  - `is_critical`: `BOOLEAN` (Computed: `total_float <= 0`)
  - `deleted_at`: `TIMESTAMP` (Nullable)

### 4.2 Comprehensive Task State Machine

```
              ┌───────────────┐
              │  Not Started  │ (progress = 0%, review_status = 'none')
              └───────┬───────┘
                      │ (Progress starts > 0% or effort logged)
                      ▼
              ┌───────────────┐
      ┌───────┤  In Progress  │◄──────────────────────────────────┐
      │       └───────┬───────┘                                   │
      │               │                                           │
(Risk │               │ (Work completed; review gate triggered)   │ (Changes requested;
Blocks│               ▼                                           │  progress rolled back <= 95%)
Task) │       ┌───────────────┐                                   │
      │       │   In Review   │───────────────────────────────────┘
      │       └───────┬───────┘
      │               │ (Anti-self-approval passed; independent peer approves)
      │               ▼
      │       ┌───────────────┐
      │       │   Completed   │ (progress = 100%, review_status = 'approved')
      │       └───────────────┘
      │
      ▼
┌───────────────┐
│    Blocked    │ (Requires linked ProjectRisk OR explicit block_reason)
└───────┬───────┘
        │ (ALL linked active risks resolved: open/mitigating -> resolved/closed)
        └───────► (Reverts to preserved prior state: 'Not Started' or 'In Progress')
```

### 4.3 Task Invariants & Validation Rules
1. **Single-Point Accountability Invariant**: Every leaf task must have exactly one `primary_owner_id`. Effort contributors may be assigned via `task_effort_allocations`, but accountability is undivided.
2. **Date Hierarchy Invariant**: Parent summary task dates are strictly computed from children:
   $$\text{Parent Start} = \min_{c \in \text{children}}(\text{Child Start}_c)$$
   $$\text{Parent End} = \max_{c \in \text{children}}(\text{Child End}_c)$$
3. **Progress Rollup Invariant**:
   $$\text{Parent Progress} = \frac{\sum_{c \in \text{children}} (\text{Duration}_c \times \text{Progress}_c)}{\sum_{c \in \text{children}} \text{Duration}_c}$$
4. **Completion Invariant**: A task cannot be marked `Completed` without passing peer review if the project enforces review gates (`review_status = 'approved'`).

---

## 5. CPM Scheduling Engine (`App\Modules\Scheduling`)

### 5.1 Schema Definition (`task_dependencies`)
- **Table**: `task_dependencies`
- **Fields**:
  - `id`: `CHAR(26)` (ULID, Primary Key)
  - `organization_id`: `CHAR(26)` (Foreign Key $\to$ `organizations.id`)
  - `project_id`: `CHAR(26)` (Foreign Key $\to$ `projects.id`)
  - `task_id`: `CHAR(26)` (Successor task $\to$ `tasks.id`)
  - `predecessor_id`: `CHAR(26)` (Predecessor task $\to$ `tasks.id`)
  - `dependency_type`: `ENUM('finish_to_start', 'start_to_start', 'finish_to_finish')` (Default: `'finish_to_start'`)
  - `lag_days`: `INT` (Default: `0`)

### 5.2 Algorithmic Execution Steps
1. **Cycle Detection (Kahn's Topological Sort)**:
   - DeliverOps builds an adjacency matrix of all task dependencies in the project.
   - Computes in-degrees for all nodes.
   - Traverses nodes with in-degree 0. If unprocessed nodes remain after traversal, throws `CycleDetectedException` (HTTP 422).
2. **Forward Pass (Early Dates)**:
   - For root tasks: $ES = \text{Project Start Date}$, $EF = \text{addWorkingDays}(ES, \text{duration} - 1)$
   - For successors:
     $$ES = \max_{p \in \text{predecessors}}(\text{nextWorkingDay}(EF_p) + \text{lag\_days})$$
     $$EF = \addWorkingDays(ES, \text{duration} - 1)$$
3. **Backward Pass (Late Dates)**:
   - Project Finish $PF = \max_{t \in \text{tasks}}(EF_t)$
   - Terminal tasks: $LF = PF$, $LS = \text{subtractWorkingDays}(LF, \text{duration} - 1)$
   - Predecessors:
     $$LF = \min_{s \in \text{successors}}(\text{prevWorkingDay}(LS_s - \text{lag\_days}))$$
     $$LS = \text{subtractWorkingDays}(LF, \text{duration} - 1)$$
4. **Total Float & Critical Sequence**:
   - Total Float $TF = LS - ES = LF - EF$.
   - Free Float $FF = \min_{s \in \text{successors}}(ES_s) - EF - 1$.
   - Critical Path: All tasks where $TF \le 0$, sorted chronologically by $ES$.

---

## 6. Risks & Blocker Management CRUD (`App\Modules\Risks`)

### 6.1 Schema Definition
- **Table**: `project_risks`
- **Fields**:
  - `id`: `CHAR(26)` (ULID, Primary Key)
  - `organization_id`: `CHAR(26)` (Foreign Key $\to$ `organizations.id`)
  - `project_id`: `CHAR(26)` (Foreign Key $\to$ `projects.id`)
  - `title`: `VARCHAR(255)` (Required)
  - `description`: `TEXT` (Nullable)
  - `type`: `ENUM('schedule', 'budget', 'technical', 'resource', 'external')`
  - `severity`: `ENUM('low', 'medium', 'high', 'critical')`
  - `likelihood`: `ENUM('low', 'medium', 'high')`
  - `impact`: `ENUM('low', 'medium', 'high')`
  - `status`: `ENUM('open', 'mitigating', 'mitigated', 'resolved', 'closed')` (Default: `'open'`)
  - `mitigation_plan`: `TEXT` (Nullable)
  - `owner_id`: `CHAR(26)` (Foreign Key $\to$ `users.id`)
  - `identified_date`: `DATE` (Required)
  - `due_date`: `DATE` (Nullable)
- **Pivot Table**: `risk_task_blockers` (`id`, `risk_id`, `task_id`, `created_at`)

### 6.2 Risk Lifecycle State Machine

```
              ┌───────────────┐
              │     Open      │ (Risk identified; initial impact assessed)
              └───────┬───────┘
                      │ (Mitigation plan activated)
                      ▼
              ┌───────────────┐
              │  Mitigating   │◄───────────────────────┐
              └───────┬───────┘                        │
                      │                                │
                      │ (Mitigation successful)        │ (Risk re-emerges /
                      ▼                                │  residual risk elevated)
              ┌───────────────┐                        │
              │   Mitigated   │────────────────────────┘
              └───────┬───────┘
                      │ (Threat eliminated / Root cause resolved)
                      ▼
              ┌───────────────┐
              │   Resolved    │
              └───────┬───────┘
                      │ (Formal review & sign-off)
                      ▼
              ┌───────────────┐
              │    Closed     │ (Archived into project risk ledger)
              └───────────────┘
```

### 6.3 Multi-Blocker Release Invariant
When a task is blocked by multiple risks ($R_1, R_2, \dots, R_k$), resolving $R_1$ **must not** unblock the task if $R_2$ remains active (`open` or `mitigating`). The task only reverts from `Blocked` to its preserved previous status (`In Progress` or `Not Started`) when:
$$\text{Active Blockers Count} = \sum_{r \in \text{linkedRisks}} [r.\text{status} \in \{\text{'open'}, \text{'mitigating'}\}] = 0$$

---

## 7. Multi-Baseline Snapshots CRUD (`App\Modules\Baselines`)

### 7.1 Schema Definition
- **Table**: `baseline_versions`
  - `id`: `CHAR(26)` (ULID, Primary Key)
  - `organization_id`: `CHAR(26)`
  - `project_id`: `CHAR(26)`
  - `version_number`: `INT` (Sequential version index: 1, 2, 3...)
  - `name`: `VARCHAR(255)` (e.g. `'Contractual Baseline V1'`)
  - `description`: `TEXT` (Nullable)
  - `created_by_id`: `CHAR(26)` ($\to$ `users.id`)
  - `created_at`: `TIMESTAMP`
- **Table**: `task_baselines`
  - `id`: `CHAR(26)` (ULID, Primary Key)
  - `baseline_version_id`: `CHAR(26)` ($\to$ `baseline_versions.id`)
  - `task_id`: `CHAR(26)` ($\to$ `tasks.id`)
  - `baseline_start_date`: `DATE`
  - `baseline_end_date`: `DATE`
  - `baseline_duration_days`: `INT`
  - `baseline_cost`: `DECIMAL(12,2)`

### 7.2 Immutability Invariant
Once written, `baseline_versions` and `task_baselines` are **strictly append-only and immutable**. DeliverOps prohibits `UPDATE` and `DELETE` operations on baseline snapshot tables to preserve legal and contractual auditability.

---

## 8. Financials & EVM CRUD (`App\Modules\Financials`)

### 8.1 Schema Definition
- **Table**: `invoices`
  - `id`: `CHAR(26)` (ULID)
  - `organization_id`: `CHAR(26)`
  - `project_id`: `CHAR(26)`
  - `invoice_number`: `VARCHAR(50)` (Unique per organization)
  - `status`: `ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled')`
  - `amount`: `DECIMAL(12,2)`
  - `tax_amount`: `DECIMAL(12,2)`
  - `due_date`: `DATE`
  - `paid_at`: `DATETIME` (Nullable)
- **Table**: `expenses`
  - `id`: `CHAR(26)` (ULID)
  - `organization_id`: `CHAR(26)`
  - `project_id`: `CHAR(26)`
  - `task_id`: `CHAR(26)` (Nullable)
  - `category`: `VARCHAR(100)`
  - `amount`: `DECIMAL(12,2)`
  - `incurred_date`: `DATE`
  - `approved_by_id`: `CHAR(26)` (Nullable)

### 8.2 Earned Value Management (EVM) Mathematical Rules
- Planned Value ($PV$): Planned budget up to current evaluation date.
- Earned Value ($EV$): Total budgeted cost of work completed to date:
  $$EV = \sum_{t \in \text{tasks}} (\text{Budget}_t \times \text{Progress}_t)$$
- Actual Cost ($AC$): Total incurred expenses + logged billable hours.
- Schedule Performance Index: $SPI = \frac{EV}{PV}$ ($SPI < 1.0$ indicates delay).
- Cost Performance Index: $CPI = \frac{EV}{AC}$ ($CPI < 1.0$ indicates budget overrun).
- Estimate at Completion: $EAC = \frac{\text{Total Budget}}{CPI}$.

---

## 9. Resources & Capacity CRUD (`App\Modules\Resources`)

### 9.1 Schema Definition (`user_capacities` / `task_effort_allocations`)
- **Table**: `task_effort_allocations`
  - `id`: `CHAR(26)` (ULID, Primary Key)
  - `task_id`: `CHAR(26)` ($\to$ `tasks.id`)
  - `member_id`: `CHAR(26)` ($\to$ `users.id`)
  - `allocated_hours`: `DECIMAL(6,2)` (e.g. `16.00`)
  - `allocation_percent`: `INT` (Default: `100%`)

### 9.2 Over-Allocation Detection Invariant
For any given user $u$ across all projects within week $W$:
$$\text{Total Allocated Hours}_u = \sum_{t \in \text{activeTasks}(W)} \text{allocatedHours}(u, t)$$
If $\text{Total Allocated Hours}_u > \text{weekly\_capacity\_hours}_u$, the Capacity Drawer flags the resource in amber/red with an over-allocation badge and suggests load re-balancing.

---

## 10. Audit & Immutable Security Ledger (`App\Modules\Audit`)

### 10.1 Schema Definition (`audit_logs`)
- **Table**: `audit_logs`
- **Fields**:
  - `id`: `CHAR(26)` (ULID, Primary Key)
  - `organization_id`: `CHAR(26)` (Indexed)
  - `user_id`: `CHAR(26)` (Nullable for system events)
  - `event`: `VARCHAR(100)` (e.g. `'task.updated'`, `'baseline.locked'`)
  - `auditable_type`: `VARCHAR(255)`
  - `auditable_id`: `CHAR(26)`
  - `old_values`: `JSON` (Nullable)
  - `new_values`: `JSON` (Nullable)
  - `ip_address`: `VARCHAR(45)`
  - `user_agent`: `TEXT`
  - `prev_hash`: `VARCHAR(64)` (SHA-256 of the immediate predecessor record)
  - `hash`: `VARCHAR(64)` (SHA-256 cryptographic seal)
  - `created_at`: `TIMESTAMP` (Immutable)

### 10.2 Cryptographic Hash Chaining Invariant
Every audit record $n$ calculates its hash using its content and the hash of record $n-1$:
$$\text{Payload} = \text{ULID} + \text{organization\_id} + \text{user\_id} + \text{event} + \text{auditable\_type} + \text{auditable\_id} + \text{JSON}(new\_values) + \text{timestamp}$$
$$\text{hash}_n = \text{SHA-256}(\text{prev\_hash}_{n-1} + \text{Payload})$$
Any retroactive modification of `old_values`, `new_values`, or metadata invalidates the entire subsequent hash chain, immediately alerting compliance auditors to unauthorized tampering.

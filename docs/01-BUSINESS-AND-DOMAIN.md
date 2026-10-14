# 01. Business & Domain Architecture

> **Document ID:** `DOC-01-BUSINESS-AND-DOMAIN`  
> **Status:** Production-Verified / Field-Tested  
> **Version:** 2.2.0 (Enterprise Multi-Tenant Release)  
> **Harmonized With:** 02-FEATURES, 05-BACKEND, 06-API, 07-FRONTEND, 09-SECURITY, 12-OPENAPI

---

## 1. Executive Vision & Platform Mission

**DeliverOps** is a multi-tenant project delivery, Critical Path Method (CPM) scheduling, resource capacity balancing, and risk governance platform tailored for industrial automation, engineering, and software delivery enterprises.

In conventional project management tools (e.g., Jira, Asana, Monday, ClickUp), Gantt charts are merely cosmetic visualizations without mathematical rigor. Tasks are manually dragged, dependencies do not calculate true float margins, critical paths remain obscure, multi-tenant isolation is ad-hoc, and contributors frequently mark their own work as "Done" without independent quality gate verification.

**DeliverOps solves this through six fundamental pillars:**
1. **Mathematically Strict Scheduling**: Deterministic Critical Path Method (CPM) engine based on Directed Acyclic Graph (DAG) topological sorting and calendar-aware forward/backward passes.
2. **Multi-Tenant Logical Isolation**: Strict organization-scoped workspaces (`organization_id` foreign keys) with multi-tenant Spatie Teams RBAC and zero cross-tenant leakage.
3. **Formal Quality Gates & Anti-Self-Approval**: Immutable separation of duties blocking task authors, primary owners, and effort contributors from signing off on their own work.
4. **First-Class Risk & Blocker Governance**: Direct $M:N$ linkage between registered project risks (`project_risks`) and frozen WBS tasks via `risk_task_blockers` with automated unblocking upon resolution.
5. **Resource Capacity Transparency & Leveling**: Single-point accountability with multi-contributor effort allocations, real-time workload heatmaps, and heuristic leveling proposals.
6. **Financial Governance & Audit Forensics**: Earned Value Management ($PV, EV, AC, SPI, CPI$), SOW milestone invoicing, and SHA-256 hash-chained forensic audit logs.

---

## 2. Core Business Problems Solved

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRADITIONAL PM PITFALLS                         │
├───────────────────────┬────────────────────────┬───────────────────────┤
│ Cosmetic Gantt Charts │ Unchecked Self-Signoff │ Hidden Schedule Drift │
│ Tasks dragged manually│ Engineers approve own  │ Deadlines move quietly│
│ without float math.   │ buggy work to hit KPIs.│ without baseline lock.│
├───────────────────────┼────────────────────────┼───────────────────────┤
│ Cross-Tenant Leakage  │ Uncontrolled Overtime  │ Disconnected Finances │
│ Loose workspaces lack │ Over-allocation hidden │ SOW budgets detached  │
│ database foreign keys.│ until team burns out.  │ from actual task burn.│
└───────────┬───────────┴───────────┬────────────┴───────────┬───────────┘
            │                       │                        │
            ▼                       ▼                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DELIVEROPS GOVERNANCE                           │
├───────────────────────┬────────────────────────┬───────────────────────┤
│ Deterministic CPM DAG │ Anti-Self-Approval Gate│ Immutable Baselines   │
│ Kahn's algo computes  │ Owner/Author blocked;  │ Freezes planned dates │
│ Early/Late dates & TF.│ requires peer sign-off.│ & calculates SV / FV. │
├───────────────────────┼────────────────────────┼───────────────────────┤
│ Multi-Tenant Scoping  │ Capacity Heatmaps      │ Earned Value Finance  │
│ Foreign keys enforce  │ Weekly hours balanced  │ SOW milestones linked │
│ isolation on queries. │ with leveling wizard.  │ to delivery sign-offs.│
└───────────────────────┴────────────────────────┴───────────────────────┘
```

---

## 3. Domain Concepts & Terminology Glossary

### 3.1 Multi-Tenancy & Workspaces
- **Organization (`organizations`)**: The top-level tenant entity (e.g., `Bitwise Solutions`). All users, projects, tasks, baselines, and financial records belong strictly to an organization.
- **Tenant Membership (`organization_users`)**: Users belong to one or more organizations with tenant-specific roles (`admin`, `project_manager`, `field_engineer`).
- **Workspace Switching**: Users seamlessly switch active organizations; all API queries enforce `X-Organization-Id` scoping.

### 3.2 Work Breakdown Structure (WBS)
- **Hierarchical Work Packages**: Tasks form a tree via `parent_id` with WBS coding (`1.0`, `1.1`, `1.1.1`).
- **Effort-Weighted Progress Rollups**: Summary parent tasks derive completion percentage automatically from child leaves weighted by allocated effort hours.
- **Task Lifecycle Statuses**:
  $$\text{Not Started} \longrightarrow \text{In Progress} \longleftrightarrow \text{Blocked} \longrightarrow \text{In Review} \longrightarrow \text{Completed}$$
- **Single-Point Accountability**: Each deliverable defines exactly one **Primary Owner** (`primary_owner_id`) and hours, supplemented by a multi-contributor effort breakdown (`task_effort_allocations`).

### 3.3 Critical Path Method (CPM)
- **Dependencies**: Finish-to-Start ($FS$), Start-to-Start ($SS$), or Finish-to-Finish ($FF$) links with optional lead/lag days.
- **Early Start ($ES$) & Early Finish ($EF$)**: Earliest possible dates based on predecessor network.
- **Late Start ($LS$) & Late Finish ($LF$)**: Latest dates deliverable can execute without postponing project target date.
- **Total Float ($TF$)**: Margin of permissible delay:
  $$TF = LS - ES = LF - EF$$
- **Critical Path**: Sequence of deliverables where $TF \le 0$. Any delay to these deliverables directly pushes back project delivery.
- **Cycle Detection**: Kahn's topological sort validates the dependency network before committing schedule dates.

### 3.4 Working Calendar Engine
- **Weekend Rest Days**: Configurable per project (e.g., `[5, 6]` for Friday/Saturday in MENA regions; `[0, 6]` for Sunday/Saturday in Western markets).
- **Holidays Register**: ISO date array (`YYYY-MM-DD`) treated as non-working days during date arithmetic.
- **Duration Modes**: `working_days` (skips weekends and registered holidays) vs. `calendar` (continuous days).

### 3.5 Baselines & Schedule Drift
- **Baseline Locking (`baseline_versions`)**: Named, immutable snapshot freezing WBS dates (`v1.0 Contractual Target`, `v2.0 Approved Change Order`).
- **Schedule Drift / Finish Variance ($FV$)**:
  $$FV = \text{end\_date} - \text{baseline\_end\_date}$$
  - $FV > 0$: Deliverable is **slipping** past promised delivery target.
  - $FV < 0$: Deliverable is **ahead of schedule**.
  - $FV = 0$: Deliverable is **on schedule**.

### 3.6 Risk, Issue & Blocker (RIB) Governance
- **Severity Matrix**: Scored as $\text{Likelihood} \times \text{Impact}$ across low, medium, high, and critical tiers.
- **Risk Status Lifecycle**: $\text{open} \to \text{mitigating} \to \text{mitigated} \to \text{resolved} \to \text{closed}$.
- **Multi-Blocker Linking (`risk_task_blockers`)**: An $M:N$ pivot table linking registered risks to WBS deliverables. Tasks cannot enter `Blocked` without an explicit reason or risk link. When all linked risks resolve, deliverables unblock automatically.

### 3.7 Quality Review Gates (Anti-Self-Approval)
- Once deliverable work is complete, the owner submits a review request (`status = 'In Review'`).
- **Anti-Self-Approval Invariant**:
  $$\text{CanApprove}(u, t) \iff \text{hasRole}(u, 'project\_manager') \land (u.\text{id} \neq t.\text{submitted\_by}) \land (u.\text{id} \neq t.\text{primary\_owner\_id}) \land (u.\text{id} \notin t.\text{contributor\_ids})$$
- Approvals promote the task to `Completed`. Change requests roll status back to `In Progress` with mandatory feedback notes.

### 3.8 Financial Governance & Earned Value
- **Budget at Completion ($BAC$)**: Contractual baseline budget.
- **Planned Value ($PV$)**: Budgeted cost of work scheduled to date.
- **Earned Value ($EV$)**: Budgeted cost of work actually performed ($EV = \text{Progress} \times BAC$).
- **Actual Cost ($AC$)**: Cumulative recorded labor costs and expenses.
- **Schedule Performance Index ($SPI$)**: $SPI = \frac{EV}{PV}$ ($SPI < 1$ indicates project delay).
- **Cost Performance Index ($CPI$)**: $CPI = \frac{EV}{AC}$ ($CPI < 1$ indicates cost overrun).

---

## 4. User Personas & Permissions Matrix

### 4.1 Persona Profiles

#### 1. Tenant Administrator (`admin`)
- **Profile**: Managing Director / IT Delivery Head.
- **Privileges**: Workspace configuration, user provisioning, role authoring, organization billing, global audit logs.
- **Protection**: Cannot self-delete; cannot delete the organization's last administrator.

#### 2. Project Manager (`project_manager`)
- **Profile**: Lead Delivery Manager / Engagement Lead.
- **Privileges**: Project authoring, WBS structuring, dependency linking, CPM scheduling, baseline locking, risk registration, quality sign-offs (on tasks not owned).

#### 3. Field / Integration Engineer (`field_engineer` / `contributor`)
- **Profile**: Automation Engineer, Backend Dev, Frontend Dev, PLC Specialist.
- **Privileges**: Task progress reporting, technical notes, time logging, review submission.
- **Restriction**: Cannot lock baselines; cannot approve own deliverables.

#### 4. Executive Observer / Auditor (`viewer`)
- **Profile**: Client Representative / External Auditor.
- **Privileges**: Read-only access to Gantt charts, baseline variance, weekly reports, and risk exposure.

---

### 4.2 Comprehensive 20-Module Permissions Matrix

| Functional Module | Permission Identifier | Description | Admin | PM | Contributor | Viewer |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Identity & Users** | `users.view` | View user roster and profiles | ✅ | ✅ | ✅ | ✅ |
| | `users.create` | Provision new user accounts | ✅ | ❌ | ❌ | ❌ |
| | `users.edit` | Update user roles, capacity, details | ✅ | ❌ | ❌ | ❌ |
| | `users.delete` | Soft-delete user accounts | ✅ | ❌ | ❌ | ❌ |
| **Roles & RBAC** | `roles.view` | View custom and system roles | ✅ | ✅ | ❌ | ❌ |
| | `roles.manage` | Create, edit, and delete custom roles | ✅ | ❌ | ❌ | ❌ |
| **Tenancy** | `tenancy.manage` | Update organization profile & billing | ✅ | ❌ | ❌ | ❌ |
| | `tenancy.invite` | Send organization invitations | ✅ | ❌ | ❌ | ❌ |
| **Projects** | `projects.view` | View project details and summaries | ✅ | ✅ | ✅ | ✅ |
| | `projects.create` | Create new projects | ✅ | ✅ | ❌ | ❌ |
| | `projects.edit` | Update project metadata and config | ✅ | ✅ | ❌ | ❌ |
| | `projects.archive`| Archive or restore projects | ✅ | ✅ | ❌ | ❌ |
| | `projects.export` | Export project WBS to JSON/CSV | ✅ | ✅ | ✅ | ❌ |
| | `projects.import` | Import project WBS from JSON/CSV | ✅ | ✅ | ❌ | ❌ |
| **Tasks & WBS** | `tasks.view` | View WBS tasks and details | ✅ | ✅ | ✅ | ✅ |
| | `tasks.create` | Create new deliverables in WBS | ✅ | ✅ | ❌ | ❌ |
| | `tasks.edit` | Modify deliverable dates, owner, scope | ✅ | ✅ | ❌ | ❌ |
| | `tasks.update_progress` | Update completion percentage | ✅ | ✅ | ✅ | ❌ |
| | `tasks.delete` | Remove deliverables from WBS | ✅ | ✅ | ❌ | ❌ |
| **Scheduling (CPM)**| `scheduling.view`| Inspect Critical Path and floats | ✅ | ✅ | ✅ | ✅ |
| | `scheduling.recalculate`| Trigger CPM rescheduling engine | ✅ | ✅ | ❌ | ❌ |
| **Baselines** | `baselines.view` | View baseline variance ($SV, FV$) | ✅ | ✅ | ✅ | ✅ |
| | `baselines.lock` | Capture and lock official baseline | ✅ | ✅ | ❌ | ❌ |
| | `baselines.clear`| Remove locked baseline | ✅ | ✅ | ❌ | ❌ |
| **Quality Reviews** | `reviews.request`| Submit deliverable for sign-off | ✅ | ✅ | ✅ | ❌ |
| | `reviews.approve`| Sign-off deliverable (Anti-Self-Approval)| ✅ | ✅ | ❌ | ❌ |
| | `reviews.reject` | Request deliverable changes | ✅ | ✅ | ❌ | ❌ |
| **Risks & Blockers**| `risks.view` | Inspect risk register and blockers | ✅ | ✅ | ✅ | ✅ |
| | `risks.create` | Register new risk / issue | ✅ | ✅ | ❌ | ❌ |
| | `risks.edit` | Update risk mitigation & resolve | ✅ | ✅ | ❌ | ❌ |
| | `risks.delete` | Delete registered risk | ✅ | ✅ | ❌ | ❌ |
| **Resources** | `resources.view` | View capacity matrix & heatmap | ✅ | ✅ | ✅ | ❌ |
| | `resources.level`| Run heuristic resource leveling wizard | ✅ | ✅ | ❌ | ❌ |
| | `timesheets.log` | Log personal hours worked | ✅ | ✅ | ✅ | ❌ |
| | `timesheets.approve`| Approve team members' timesheets | ✅ | ✅ | ❌ | ❌ |
| **Financials** | `financials.view`| Inspect EVM metrics, budgets, runway | ✅ | ✅ | ❌ | ❌ |
| | `financials.manage`| Manage invoices, rate cards, expenses | ✅ | ❌ | ❌ | ❌ |
| **Collaboration** | `comments.create`| Post threaded task comments | ✅ | ✅ | ✅ | ❌ |
| | `attachments.upload`| Upload deliverable attachments | ✅ | ✅ | ✅ | ❌ |
| **Compliance** | `compliance.view`| Inspect DSAR requests & legal holds | ✅ | ❌ | ❌ | ❌ |
| | `compliance.manage`| Process GDPR export/erasure | ✅ | ❌ | ❌ | ❌ |
| **Automation** | `automation.view`| View active automation rules | ✅ | ✅ | ❌ | ❌ |
| | `automation.manage`| Create/edit automation triggers | ✅ | ❌ | ❌ | ❌ |
| **Audit** | `audit.view` | Inspect forensic tamper-evident logs | ✅ | ✅ | ❌ | ❌ |
| | `audit.view_global`| Inspect global organization audit trail| ✅ | ❌ | ❌ | ❌ |

# 01. Business & Domain Architecture

> **Document ID:** `DOC-01-BUSINESS-AND-DOMAIN`  
> **Status:** Production-Ready / Implementation-Grade  
> **Version:** 2.0.0  
> **Harmonized With:** 05-BACKEND, 06-API, 07-FRONTEND, 12-OPENAPI, 13-ADR, 14-ERROR-CODES, 15-DATA-DICT

---

## 1. Executive Vision & Platform Mission

**DeliverOps** is an enterprise project delivery, Critical Path Method (CPM) scheduling, and resource governance platform designed for complex engineering, industrial automation, and software integration projects.

In traditional project management tools (e.g., Trello, Asana, Monday, Jira), Gantt charts are often cosmetic visualizations without mathematical rigor. Tasks are manually dragged, dependencies do not calculate true floats, critical delivery paths are hidden, and contributors mark their own work as "Done" without formal peer sign-off.

**DeliverOps solves this by coupling:**
1. **Mathematically Strict Scheduling**: Critical Path Method (CPM) engine based on Directed Acyclic Graph (DAG) topological sorting and calendar-aware forward/backward passes.
2. **Deterministic Governance**: Immutable project baselines (`baseline_versions`) to track true schedule drift ($SV$ and $FV$).
3. **Formal Quality Gates**: A review state machine with strict anti-self-approval enforcement (`submitted_by_id`, `primary_owner_id`, `task_effort_allocations`).
4. **Risk-Linked Execution**: Direct $M:N$ linkage between registered project risks (`project_risks`) and blocked WBS tasks via `risk_task_blockers`.
5. **Resource Capacity Transparency**: Real-time weekly capacity leveling and multi-contributor effort allocations (`task_effort_allocations`).
6. **Regulatory-Grade Traceability**: An immutable, non-cascading polymorphic audit trail capturing before/after deltas for all project entities (`audit_logs`).

---

## 2. Core Business Problems Solved

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRADITIONAL PM PITFALLS                         │
├───────────────────────┬────────────────────────┬───────────────────────┤
│ Cosmetic Gantt Charts │ Unchecked Self-Signoff │ Hidden Schedule Drift │
│ Tasks dragged manually│ Engineers approve own  │ Deadlines move quietly│
│ without float math.   │ buggy work to hit KPIs.│ without baseline lock.│
└───────────┬───────────┴───────────┬────────────┴───────────┬───────────┘
            │                       │                        │
            ▼                       ▼                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DELIVEROPS GOVERNANCE                           │
├───────────────────────┬────────────────────────┬───────────────────────┤
│ Deterministic CPM DAG │ Anti-Self-Approval Gate│ Immutable Baselines   │
│ Kahn's algo computes  │ Owner/Author blocked;  │ Freezes planned dates │
│ Early/Late dates & TF.│ requires peer sign-off.│ & calculates SV / FV. │
└───────────────────────┴────────────────────────┴───────────────────────┘
```

### 2.1 Fragile Schedules vs. Deterministic CPM Engine
- **Problem**: When a single task slips in conventional tools, project managers must manually adjust dozens of dependent tasks, frequently creating scheduling contradictions or circular dependencies.
- **DeliverOps Solution**: Dependencies form a strict Directed Acyclic Graph (DAG). If a milestone slips, DeliverOps automatically recalculates Early Start, Early Finish, Late Start, Late Finish, and Total Float across every successor. Tasks on the critical path ($\text{Float} \le 0$) are highlighted in real time.

### 2.2 Unchecked Completion vs. Anti-Self-Approval Review Workflows
- **Problem**: Contributors mark complex integration tasks as "Completed" to satisfy deadlines without code reviews, functional test validation, or sign-off by a lead.
- **DeliverOps Solution**: Tasks requiring sign-off transition into an `In Review` state (`review_status = 'pending_review'`). The system enforces an immutable rule: **a task cannot be approved by its submitter (`submitted_by_id`), primary owner (`primary_owner_id`), or allocated effort contributors (`task_effort_allocations`)**. A distinct designated reviewer or project manager must formally inspect the deliverable and either approve it or request changes with an explanatory note.

### 2.3 Ghost Deadlines vs. Immutable Multi-Version Baselines
- **Problem**: Deadlines continually slide to the right, masking chronic delivery delays until the client launch date is missed.
- **DeliverOps Solution**: Project managers lock official named **Baseline Snapshots** in `baseline_versions` (e.g. `v1.0 Contractual Target`, `v2.0 Approved Change Order`). Start and end dates are frozen in `task_baselines`. As actual dates shift, DeliverOps computes exact **Start Variance ($SV$)**, **Finish Variance ($FV$)**, and **Duration Variance ($DV$)** in working or calendar days, instantly identifying schedule slippage.

### 2.4 Blocker Opacity vs. First-Class Risk Governance
- **Problem**: When tasks are delayed, teams write vague comments like "waiting for hardware", obscuring project-level risks from executives.
- **DeliverOps Solution**: A task cannot enter a `Blocked` status without either an explicit block reason or a direct reference to one or more registered **Project Risks** via `risk_task_blockers`. A task unblocks automatically when all linked risks transition out of active states (`open`, `mitigating`) into resolved states (`mitigated`, `resolved`, `closed`).

### 2.5 Capacity Over-Commitment vs. Weekly Workload Heatmaps
- **Problem**: Cross-functional team members are assigned 80 hours of tasks across 4 different projects within the same week, leading to burn-out and missed deliverables.
- **DeliverOps Solution**: Every team member maintains a contracted `weekly_capacity_hours`. Effort allocations distribute hours across assignees and weeks. The platform renders a real-time capacity heatmap highlighting balanced, near-capacity, and over-allocated engineers.

---

## 3. Domain Concepts & Terminology Glossary

### 3.1 Work Breakdown Structure (WBS)
- **Task Hierarchy**: Tasks are organized in a recursive tree structure (`parent_id`).
- **Summary / Milestone / Leaf Tasks**: Leaf tasks represent concrete work deliverables. Parent tasks represent summary work packages whose progress is rolled up from child leaves weighted by allocated effort hours.
- **Task Lifecycle Statuses**: `Not Started` $\to$ `In Progress` $\leftrightarrow$ `Blocked` $\to$ `In Review` $\to$ `Completed`.
- **Review Workflow Statuses**: `none` $\to$ `pending_review` $\to$ `approved` | `changes_requested`.
- **Linear Ordering (`order_index`)**: Sibling tasks are positioned deterministically via an integer `order_index` supporting seamless drag-and-drop resequencing.

### 3.2 Critical Path Method (CPM)
- **Predecessor & Successor**: Dependencies are modelled as Finish-to-Start ($FS$), Start-to-Start ($SS$), or Finish-to-Finish ($FF$) relationships with configurable `lag_days`.
- **Early Start ($ES$) & Early Finish ($EF$)**: The earliest possible dates a task can begin and complete based on its predecessors.
- **Late Start ($LS$) & Late Finish ($LF$)**: The latest dates a task can start and finish without postponing the overall project completion deadline.
- **Total Float ($TF$)**: The amount of time a task can be delayed without delaying the project completion date:
  $$TF = LS - ES = LF - EF$$
- **Critical Path**: The continuous sequence of dependent tasks with $TF \le 0$. Any delay to a critical task directly pushes out the project delivery date.

### 3.3 Working Day Calendar Math
- **Weekend Configurations**: Configurable per project (e.g., `[5, 6]` for Friday/Saturday in MENA regions, or `[0, 6]` for Sunday/Saturday in Western markets).
- **Holidays**: Configurable ISO date register (`YYYY-MM-DD`).
- **Duration Modes**:
  - `working_days`: Tasks consume only scheduled working days.
  - `calendar`: Tasks consume consecutive calendar days regardless of weekends or holidays.

### 3.4 Multi-Version Baseline & Variance Engine
- **Baseline Versions (`baseline_versions`)**: Named, versioned snapshots capturing point-in-time WBS state.
- **Start Variance ($SV$)**:
  $$SV = \text{start\_date} - \text{baseline\_start\_date}$$
- **Finish Variance ($FV$)**:
  $$FV = \text{end\_date} - \text{baseline\_end\_date}$$
  - $FV > 0$: The task is **slipping** past its promised delivery date.
  - $FV < 0$: The task is **ahead of schedule**.
  - $FV = 0$: The task is **on schedule**.

### 3.5 Risk Register & Multi-Blocker Governance
- **Severity Scoring**: Scored as $\text{Likelihood} \times \text{Impact}$ across low, medium, high, and critical tiers.
- **Risk Status Lifecycle**: `open` $\to$ `mitigating` $\to$ `mitigated` $\to$ `resolved` $\to$ `closed`.
- **Multi-Blocker Pivot (`risk_task_blockers`)**: An $M:N$ association linking multiple risks to multiple tasks. A task only unblocks when all linked active risks are resolved.

---

## 4. User Personas & Role Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER PERSONAS & PRIVILEGES                      │
├─────────────────────┬───────────────────┬──────────────────────────────┤
│ Super Administrator │ Project Manager   │ Integration Contributor      │
│ System configuration│ Schedule authoring│ Task execution, progress     │
│ User/Role RBAC      │ Baseline locking  │ reporting, review submission │
│ Global audit logs   │ Risk triage & PM  │ Discussion participation     │
└─────────────────────┴───────────────────┴──────────────────────────────┘
```

### 4.1 Persona Profiles

#### 1. DeliverOps Super Administrator (`admin`)
- **Profile**: System Architect / IT Executive.
- **Responsibilities**: Creates user accounts, assigns capacity, establishes department groupings, configures system roles, inspects global security audit trails.
- **Invariants**: Cannot be deleted if they are the last active administrator; cannot self-delete.

#### 2. Project Manager (`project_manager`)
- **Profile**: Lead Delivery Manager / Integration Lead.
- **Responsibilities**: Creates projects, constructs WBS, establishes dependencies, executes CPM recalculations, locks baselines, registers project risks, reviews and signs off on deliverables.
- **Key Privilege**: Full edit permissions over assigned projects, tasks, and baselines.

#### 3. Integration Engineer / Contributor (`contributor`)
- **Profile**: Hardware, Software, PLC, or Automation Engineer.
- **Responsibilities**: Updates task progress percentages, provides technical notes, requests reviews upon deliverable readiness, participates in task comment threads.
- **Boundary**: Cannot lock baselines; cannot approve deliverables they submitted, owned, or contributed to.

#### 4. Quality Assurance / Viewer (`viewer`)
- **Profile**: Executive Observer / Client Representative / Auditor.
- **Responsibilities**: Read-only inspection of Gantt schedules, baseline variance, weekly reports, and risk exposure.
- **Boundary**: Strict read-only access. Cannot mutate project state.

---

### 4.2 Comprehensive System Permission Matrix

| Capability / Permission | Admin | Project Manager | Contributor | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| `users.view` | ✅ | ✅ | ✅ | ✅ |
| `users.create` | ✅ | ❌ | ❌ | ❌ |
| `users.edit` | ✅ | ❌ | ❌ | ❌ |
| `users.delete` | ✅ | ❌ | ❌ | ❌ |
| `roles.view` | ✅ | ❌ | ❌ | ❌ |
| `roles.manage` | ✅ | ❌ | ❌ | ❌ |
| `projects.view` | ✅ | ✅ | ✅ | ✅ |
| `projects.create` | ✅ | ✅ | ❌ | ❌ |
| `projects.edit` | ✅ | ✅ | ❌ | ❌ |
| `projects.archive` | ✅ | ✅ | ❌ | ❌ |
| `projects.import` | ✅ | ✅ | ❌ | ❌ |
| `tasks.create` | ✅ | ✅ | ❌ | ❌ |
| `tasks.edit_details` | ✅ | ✅ | ❌ | ❌ |
| `tasks.update_progress` | ✅ | ✅ | ✅ | ❌ |
| `tasks.request_review` | ✅ | ✅ | ✅ | ❌ |
| `tasks.approve_review` | ✅ | ✅ | ❌ | ❌ |
| `tasks.delete` | ✅ | ✅ | ❌ | ❌ |
| `baselines.lock` | ✅ | ✅ | ❌ | ❌ |
| `risks.manage` | ✅ | ✅ | ❌ | ❌ |
| `comments.create` | ✅ | ✅ | ✅ | ❌ |
| `audit.view` | ✅ | ✅ | ❌ | ❌ |

---

## 5. Master DeliverOps Documentation Suite Index

| Document Identifier | Document Title | Primary Scope |
| :--- | :--- | :--- |
| **`01-BUSINESS-AND-DOMAIN.md`** | Business & Domain Architecture | Core problem statements, domain concepts, personas, RBAC matrix |
| **`02-FEATURES-AND-PAGES.md`** | Features & Application Views | Screen-by-screen breakdown, UI components, interaction models |
| **`03-CRUD-SPECIFICATIONS.md`** | CRUD Operations & Invariants | Granular entity create/read/update/delete state invariants |
| **`04-USER-FLOWS-AND-SCENARIOS.md`**| User Flows & Delivery Scenarios | Step-by-step user journeys from project init to delivery sign-off |
| **`05-BACKEND-ARCHITECTURE.md`** | Backend Modulith Architecture | Production MySQL 8.0 DDL (19 tables), CPM equations, services |
| **`06-API-REFERENCE.md`** | Complete API Reference | All 47 REST endpoints, request/response schemas, error codes |
| **`07-FRONTEND-ARCHITECTURE.md`** | Frontend Architecture Specification | React 18, Zustand, TanStack Query v5, virtualized SVG Gantt, a11y |
| **`08-DEPLOYMENT-AND-OPERATIONS.md`**| Deployment & Operations | Docker Compose, zero-downtime CI/CD, Redis caching, DR runbooks |
| **`09-SECURITY-AND-COMPLIANCE.md`** | Security & Compliance Specification | Sanctum tokens, Spatie RBAC, anti-self-approval, audit immutability |
| **`10-TESTING-STRATEGY.md`** | Testing Strategy Specification | Pest/PHPUnit suites, Kahn's algorithm tests, Playwright E2E |
| **`11-REPORTING-AND-ANALYTICS.md`** | Reporting & Analytics Specification | EVM formulas, Schedule Drift Gauge, FDI index, PDF/MD exporters |
| **`12-OPENAPI-SPEC.yaml`** | OpenAPI 3.1.0 Contract Specification | Machine-readable API definition for all 47 endpoints |
| **`13-ADR-LOG.md`** | Architecture Decision Records (ADRs) | ADR 001 through ADR 010 capturing critical design rationale |
| **`14-ERROR-CODES.md`** | Standardized Machine Error Codes | Exhaustive machine error catalog with HTTP statuses |
| **`15-DATA-DICTIONARY.md`** | Enterprise Data Dictionary | Detailed schema reference for all 19 database tables & attributes |
| **`16-RUNBOOKS.md`** | Incident Response & SRE Runbooks | Practical operational runbooks for SRE and engineering teams |

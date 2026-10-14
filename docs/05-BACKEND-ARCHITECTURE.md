# 05. Backend Architecture & Scheduling Engine

> **Document ID:** `DOC-05-BACKEND-ARCHITECTURE`  
> **Status:** Production-Verified / Field-Tested  
> **Version:** 2.2.0 (Laravel 12 Modulith Architecture)  
> **Harmonized With:** 01-BUSINESS, 02-FEATURES, 03-CRUD, 06-API, 09-SECURITY, 12-OPENAPI

---

## 1. Modular Monolith (Modulith) Architecture

The **DeliverOps** backend is engineered as an enterprise-grade **Modular Monolith (Modulith)** in Laravel 12 running on PHP 8.2+ and MySQL 8.0 InnoDB.

Every bounded context is encapsulated as an autonomous module under [`backend/app/Modules/`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/backend/app/Modules) with its own **Controllers**, **Services**, **Form Requests**, **API Resources**, and **Policies**:

```
backend/app/Modules/
├── AI/             # AI Project Copilot, task effort auto-estimation, risk prediction
├── Audit/          # Forensic hash-chained audit logging & 5-pass idempotent import/export
├── Automation/     # Event-driven automation rules, triggers, and webhook dispatch
├── Baselines/      # Point-in-time WBS snapshots, baseline locking, variance tracking
├── Collaboration/  # Review workflows (anti-self-approval) & threaded discussions
├── Compliance/     # GDPR DSAR export & erasure requests, legal holds, SLA metrics
├── Financials/     # SOW milestone invoicing, burn rate runway, rate cards, budget tracking
├── Identity/       # Authentication (Sanctum SPA sessions & Bearer tokens), MFA, Spatie RBAC
├── Integrations/   # Webhooks, Slack, Microsoft Teams, third-party sync connectors
├── Monitoring/     # Health checks, metric telemetry, system diagnostics
├── Notifications/  # Multi-channel notification delivery (in-app drawer, email, webhooks)
├── Onboarding/     # First-run setup checklist, interactive walkthrough progress
├── Projects/       # Multi-tenant project lifecycle, rosters, config schema (MENA calendars)
├── Resources/      # Resource capacity, time-off calendar, skills matrix, capacity leveling
├── Risks/          # Risk, Issue & Blocker (RIB) register, 3x3 scoring, multi-blocker linking
├── Scheduling/     # Mathematical CPM Engine (Kahn's algorithm, DAG sort, float calculation)
├── System/         # Platform health, installation state verification (`/system/status`)
├── Tasks/          # Hierarchical WBS tree, effort-weighted rollups, linear reordering
├── Templates/      # Project templates catalog, industry presets, clone-to-project engine
└── Tenancy/        # Multi-tenancy architecture, organization scoping, member invitations
```

### Module Boundary Rules:
1. **Isolated Service Layer**: Inter-module communication occurs strictly via injected service interfaces or domain events, preventing cross-boundary model corruption.
2. **Atomic Transaction Boundaries**: Multi-entity mutations (e.g., risk resolution unblocking multiple tasks, review approvals, baseline locks) execute inside atomic `DB::transaction()` blocks.
3. **Service-Level Invariants**: Core security rules (anti-self-approval, self-deletion locks, last-admin protection, tenant isolation) are enforced in domain services so they cannot be bypassed by `Gate::before()` admin overrides.

---

## 2. Multi-Tenancy Architecture & Data Isolation

DeliverOps enforces **strict logical multi-tenancy** at the database, query, and middleware levels:

### 2.1 Schema-Level Tenant Scoping (`organization_id`)
Every tenant-scoped table contains an `organization_id CHAR(26)` foreign key referencing `organizations.id` with `ON DELETE RESTRICT`:
- Tables scoped: `users`, `projects`, `tasks`, `task_dependencies`, `project_risks`, `baseline_versions`, `timesheets`, `expenses`, `invoices`, `api_keys`, `webhooks`, `automation_rules`, `audit_logs`.
- Enforced via migration `2026_10_13_000006_enforce_not_null_and_foreign_keys_on_organization_id.php`.

### 2.2 Global Multi-Tenant Scope & Middleware
- Incoming requests supply the active organization via the `X-Organization-Id` header (or session `currentOrganizationId`).
- `TenantScopeMiddleware` validates membership and injects the active organization into the tenant context.
- Spatie Permissions operates in **Teams Mode**:
  ```php
  setPermissionsTeamId($organizationId);
  ```
  This ensures roles (`admin`, `project_manager`, `field_engineer`) are evaluated strictly within the context of the user's active tenant organization.

---

## 3. Mathematical CPM Scheduling Engine

The CPM Engine ([`SchedulingEngineService.php`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/backend/app/Modules/Scheduling/Services/SchedulingEngineService.php)) deterministically computes the Critical Path, project duration, and float margins.

### 3.1 Cycle Detection via Kahn's Algorithm
Before computing schedule dates, the engine validates the project network as a Directed Acyclic Graph (DAG) using **Kahn's Algorithm**:
1. Compute in-degree $\text{deg}^-(v)$ for every task node $v \in V$.
2. Initialize queue $Q$ with all nodes having $\text{deg}^-(v) = 0$.
3. While $Q$ is not empty:
   - Dequeue $u$, append to sorted topological list $L$.
   - For each successor $v$ of $u$: decrement $\text{deg}^-(v)$. If $\text{deg}^-(v) = 0$, enqueue $v$.
4. If $|L| < |V|$, a dependency cycle exists. The engine throws `CpmCycleDetectedException` and aborts rescheduling.

### 3.2 Forward Pass (Early Dates Calculation)
For each task $i$ in topological order:
$$ES_i = \max_{p \in \text{Pred}(i)} \left( \text{AddWorkingDays}(EF_p, \text{Lag}_{p,i}) \right)$$
$$EF_i = \text{AddWorkingDays}(ES_i, \text{Duration}_i - 1)$$
*(For root tasks without predecessors, $ES = \text{ProjectStartDate}$)*.

### 3.3 Backward Pass (Late Dates Calculation)
Let $T_{\text{target}} = \max(EF_{\text{terminal}}, \text{ProjectTargetDate})$. For each task $i$ in reverse topological order:
$$LF_i = \min_{s \in \text{Succ}(i)} \left( \text{SubtractWorkingDays}(LS_s, \text{Lag}_{i,s}) \right)$$
$$LS_i = \text{SubtractWorkingDays}(LF_i, \text{Duration}_i - 1)$$
*(For terminal tasks without successors, $LF = T_{\text{target}}$)*.

### 3.4 Float Calculations & Critical Path
- **Total Float ($TF$)**:
  $$TF_i = LS_i - ES_i = LF_i - EF_i$$
- **Free Float ($FF$)**:
  $$FF_i = \min_{s \in \text{Succ}(i)} (ES_s) - EF_i - 1$$
- **Critical Path Condition**:
  $$\text{IsCritical}(i) \iff TF_i \le 0$$
  Tasks on the critical path have zero or negative float. Any delay on these tasks directly slips the project finish date.

### 3.5 Working Days vs Calendar Days Engine
The engine respects project-specific calendar configurations:
- **Weekend Days**: Array of non-working days of the week (e.g., `[5, 6]` for MENA Friday/Saturday rest, `[0, 6]` for Western Saturday/Sunday rest).
- **Holidays Register**: Array of specific dates (`YYYY-MM-DD`) treated as non-working holidays during date arithmetic.
- When `duration_mode = 'working_days'`, non-working days are skipped during forward and backward passes.

---

## 4. Anti-Self-Approval Review Gate

To enforce strict separation of duties and prevent unauthorized deliverable completions, the collaboration module implements **Anti-Self-Approval** ([`TaskReviewService.php`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/backend/app/Modules/Collaboration/Services/TaskReviewService.php)):

$$\text{CanApprove}(u, t) \iff \text{hasRole}(u, 'project\_manager') \land (u.\text{id} \neq t.\text{submitted\_by}) \land (u.\text{id} \neq t.\text{primary\_owner\_id}) \land (u.\text{id} \notin t.\text{contributor\_ids})$$

1. When a task reaches readiness, the author or owner clicks **"Request Review"**; the task transitions to `status = 'In Review'` with `review_status = 'pending_review'`.
2. An independent Project Manager or Quality Reviewer must sign off on the task.
3. If the author or any effort contributor attempts to call `/api/v1/tasks/{id}/review/approve`, the service throws `REVIEW_SELF_APPROVAL_FORBIDDEN` (HTTP 403).

---

## 5. Security & Middleware Pipeline

All requests through the Laravel API pipeline pass through rigorous security middleware:

```
[Incoming Request]
       │
       ▼
[SecurityHeadersMiddleware] ──► Inject CSP, HSTS, XFO, XXSS, Referrer-Policy
       │
       ▼
[Sanctum Stateful / Bearer] ──► Validate HttpOnly Session Cookie or Bearer Token
       │
       ▼
[TenantScopeMiddleware]     ──► Validate X-Organization-Id, Set Spatie Teams ID
       │
       ▼
[Module Controller & FormRequest] ──► Schema validation & Service Layer execution
```

- **`SecurityHeadersMiddleware`**:
  - `Content-Security-Policy`: Restricts scripts, objects, and framing to secure origins.
  - `Strict-Transport-Security`: Enforces HTTPS for 1 year (`max-age=31536000; includeSubDomains; preload`).
  - `X-Content-Type-Options`: `nosniff`.
  - `X-Frame-Options`: `DENY` (prevents clickjacking).
  - `Referrer-Policy`: `strict-origin-when-cross-origin`.
- **`AuditLoggerService`**:
  - Records every mutating action with actor ULID, organization ULID, target model, before/after diffs, client IP, and user-agent.
  - Implements **SHA-256 Hash Chaining**: Each audit entry stores the cryptographic hash of the previous record, ensuring tamper-evident forensics.

---

## 6. Complete Database Schema & Migrations Overview

The DeliverOps database schema consists of **51 migrations** establishing 34 production tables with `CHAR(26)` ULID primary keys:

### Core Tables Summary:
1. `organizations`: Multi-tenant organizations (id, name, slug, plan, default_calendar, created_at).
2. `organization_users`: Pivot table for tenant membership, roles, and invitation status.
3. `organization_invitations`: Pending invitations with secure tokens and expiry dates.
4. `users`: Enterprise user accounts, ULID PK, hashed password, capacity, status, MFA fields.
5. `personal_access_tokens`: Sanctum API tokens with expiration and token abilities.
6. `permissions`, `roles`, `model_has_roles`, `role_has_permissions`: Spatie RBAC tables with ULID PKs and `team_id`.
7. `projects`: Project records (id, organization_id, code, name, description, config JSON, target_launch_date).
8. `tasks`: WBS deliverables (id, project_id, organization_id, parent_id, wbs_code, name, status, priority, dates, effort hours, float).
9. `task_dependencies`: Predecessor/successor links (predecessor_id, successor_id, dependency_type, lag_days).
10. `task_effort_allocations`: Multi-contributor effort breakdown (task_id, user_id, allocated_hours).
11. `task_comments`, `comment_reactions`, `task_watchers`: Threaded collaboration feed and activity events.
12. `project_risks`: Risk, Issue & Blocker register (id, project_id, severity, likelihood, status, mitigation_plan).
13. `risk_task_blockers`: Pivot table linking active risks to frozen WBS tasks.
14. `baseline_versions`: Point-in-time WBS snapshots capturing locked schedules.
15. `timesheets`: Granular daily hours logged against WBS tasks with billing rates.
16. `expenses`: Project-level expenditures, categories, multi-currency rates, and receipt attachments.
17. `invoices`, `invoice_line_items`: SOW milestone and T&M client billing records.
18. `automation_rules`: Event-driven trigger/action workflow definitions.
19. `audit_logs`: Tamper-evident forensic log with SHA-256 hash chaining.
20. `compliance_dsar_requests`, `legal_holds`: GDPR erasure/export and legal hold tracking.

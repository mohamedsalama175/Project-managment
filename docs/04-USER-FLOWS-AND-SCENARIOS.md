# 04. User Flows, Execution Scenarios & Enterprise Journeys

> **Document ID:** `DOC-04-USER-FLOWS-AND-SCENARIOS`  
> **Status:** Production-Ready / Implementation-Grade  
> **Version:** 2.2.0  
> **Harmonized With:** [01-BUSINESS](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/01-BUSINESS-AND-DOMAIN.md), [02-FEATURES](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/02-FEATURES-AND-PAGES.md), [03-CRUD](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/03-CRUD-SPECIFICATIONS.md), [05-BACKEND](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/05-BACKEND-ARCHITECTURE.md), [06-API](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/06-API-REFERENCE.md), [07-FRONTEND](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/07-FRONTEND-ARCHITECTURE.md), [09-SECURITY](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/09-SECURITY-AND-COMPLIANCE.md), [10-TESTING](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/10-TESTING-STRATEGY.md)

---

## 1. Scenario 1: Tenant Onboarding & First-Run Provisioning

```
[System Install Wizard: First-Run]
   │
   ├─► 1. Accesses /install or calls deliverops:install CLI
   │   └─► Checks DB migrations (51), storage symlinks, Redis queue, app key
   │
   ├─► 2. Creates Initial SuperAdmin & Root Organization
   │   └─► Sets: Org Name, Slug, SuperAdmin Email, Secure Password (zxcvbn >= 3)
   │
   ├─► 3. Issues Scoped Auth Token (Sanctum + Tenant Context)
   │   └─► Header X-Organization-Id bound to session & localStorage
   │
   └─► 4. Directs to Main Dashboard / CLAYGANTT Matrix View
```

### Step-by-Step Flow:
1. **Trigger**: An enterprise DevOps engineer deploys a new instance of DeliverOps.
2. **Action**:
   - Navigates to `/install` (Visual Reference: [33_first_run_install_view.png](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/33_first_run_install_view.png)) or executes `php artisan deliverops:install`.
   - The installer verifies database connectivity, applies all 51 migrations, seeds baseline Spatie roles/permissions, and prompts for organization creation.
   - Enters Organization: `Acme Industrial Systems`, Slug: `acme-systems`.
   - Enters Admin User: `admin@acme.com`, Password: `SuperSecretPassword!2026`.
3. **Execution**:
   - Provisions `organizations` record with ULID primary key and `plan = 'enterprise'`.
   - Provisions `users` record, assigns `super_admin` role via Spatie Teams scoped to `organization_id`.
   - Authenticates user and redirects to the **CLAYGANTT Primary App Navbar**.

---

## 2. Scenario 2: Project Provisioning & High-Density WBS Decomposition

```
[User: Delivery Lead]
   │
   ├─► 1. Presses Cmd+N or Clicks "+ New Project" in Primary App Navbar
   │   └─► Specifies: Name, Code Prefix, PM, Calendar (MENA or Western), Budget
   │
   ├─► 2. Backend Provisions Project Record (App\Modules\Projects)
   │   └─► Generates ULID, sets tree_version = 1, binds to organization_id
   │
   ├─► 3. WBS Matrix Authoring (46/54 Split-Pane)
   │   ├─► Phase 1: "Hardware Commissioning" (Summary Node)
   │   ├─► Task 1.1: "Mount Scale Platforms" (Duration: 3d, Primary Owner: Tariq)
   │   └─► Task 1.2: "Wire Terminal Boxes" (Duration: 2d, Primary Owner: Sarah)
   │
   └─► 4. Live Schedule & Rollup Calculation
       └─► System calculates parent duration and progress dynamically
```

### Step-by-Step Flow:
1. **Trigger**: Delivery Lead initializes a multi-discipline industrial project.
2. **Action**:
   - Presses `Cmd+N` or clicks the quick-action button in the unified secondary utility bar.
   - Sets Name: `Factory Scale Modernization`, Code: `FSM-2026`.
   - Selects Weekend Calendar: `Friday & Saturday` (MENA working calendar).
   - Selects Duration Mode: `working_days`.
3. **Execution**:
   - Frontend issues `POST /api/v1/projects` with `X-Organization-Id`.
   - The backend validates project code uniqueness within tenant, provisions `projects` row, assigns PM, and logs a hash-chained `project.created` audit record.
4. **WBS Authoring**:
   - In the left pane WBS table (strict 40px row height), user adds summary phases and child deliverables.
   - Indents and outdents rows using keyboard or action icons.
   - Changes are auto-persisted via `PUT /api/v1/projects/{p}/tasks/{t}` with optimistic concurrency checks (`tree_version`).

---

## 3. Scenario 3: Mathematical Critical Path & Cycle Detection

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CPM SCHEDULING FLOWCHART                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Task A (3 days)          Task B (5 days)          Task C (Milestone) │
│   [ES=Oct 12, EF=Oct 14] ──► [ES=Oct 15, EF=Oct 21] ──► [Float = 0]    │
│   Float = 0 (CRITICAL)     Float = 0 (CRITICAL)                        │
│                                                                        │
│   Task D (2 days)                                                      │
│   [ES=Oct 12, EF=Oct 13] ───────────────────────────► Task B           │
│   Float = 1 day (NON-CRITICAL)                                         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Flow:
1. **Trigger**: User sequences tasks and defines delivery dependencies.
2. **Action**:
   - Opens the **Task Details Drawer** for Task B.
   - Adds Task A as a Finish-to-Start ($FS$) predecessor with 0 lag days.
3. **Cycle Detection Check**:
   - If the user attempts to add Task B as a predecessor of Task A ($A \to B \to A$), `CpmSchedulingService` executes Kahn's topological sort.
   - Cycle detected $\to$ Backend immediately rejects the mutation with `422 Unprocessable Content` and error code `CPM_CYCLE_DETECTED`.
4. **Forward and Backward Pass Calculations**:
   - **Forward Pass**: Successor Early Start ($ES$) is pushed to the earliest valid working day following predecessor completion.
   - **Backward Pass**: Late Finish ($LF$) and Late Start ($LS$) are computed backwards from the target project completion date.
   - **Total Float**: $TF = LS - ES$. Tasks with $TF \le 0$ are marked critical.
   - On the virtualized Gantt canvas, critical tasks highlight in glowing crimson (`#EF4444`) with curved orthogonal dependency vectors.

---

## 4. Scenario 4: Freezing Multi-Version Baselines & Tracking Drift

```
[Contract Signed] ──► Click "Lock Baseline" in Utilities Bar
                             │
                             ├─► Creates BaselineVersion "V1.0 Contractual Target"
                             ├─► Snapshots all current dates into task_baselines
                             │
                             ▼ (Supplier Delay of 4 working days occurs)
Actual End Shifts +4d ──► Compute Drift Metrics:
                             ├─► Start Variance:    SV = start - baseline_start (0d)
                             └─► Finish Variance:   FV = end - baseline_end (+4d SLIPPING)
```

### Step-by-Step Flow:
1. **Trigger**: Executive sponsors sign off on the baseline project delivery schedule.
2. **Action**:
   - Delivery Lead clicks the **Baseline Pill** in the secondary utility bar and selects **"Lock New Baseline"**.
   - Enters Version Label: `"V1.0 Contractual Target"`.
   - Frontend calls `POST /api/v1/projects/{p}/baselines`.
3. **Execution**:
   - Backend writes an immutable snapshot row into `baseline_versions` and all current task coordinates into `task_baselines`.
   - Sets `projects.has_locked_baseline = true`.
4. **Drift Detection & Visual Ghost Bars**:
   - Two weeks later, hardware procurement delays push Task 1.2 by 4 working days.
   - The Gantt engine renders a **ghost baseline bar** beneath the active task bar.
   - The secondary utility bar displays a live badge: `Finish Variance: +4d (Slipping)`.
   - The Executive EVM Dashboard recalculates the Schedule Performance Index ($SPI = \frac{EV}{PV}$).

---

## 5. Scenario 5: Blocker Emergence & Multi-Risk Task Locking

```
[Power Surge Incident] ──► Register Risk (Severity: Critical)
                               │
                               ├─► Link Risk to Task 1.2 in Affected Tasks selector
                               │   └─► Task status set to "Blocked"
                               │   └─► Preserves previous state: "In Progress||Power Surge"
                               │
                               ▼ (Stabilizer Installed & Tested)
[Mark Risk Resolved] ──► System Evaluates Remaining Active Blockers
                               └─► Active blockers count == 0:
                                     └─► Task status restored to "In Progress"
                                     └─► Blocker reason cleared
```

### Step-by-Step Flow:
1. **Trigger**: An on-site electrical fault prevents calibration of industrial scales.
2. **Action**:
   - Lead Engineer opens the **Risk Register Modal** (`Ctrl+R` or header action).
   - Creates Risk: `"Plant Voltage Fluctuations"`, Severity: `Critical`, Impact: `High`.
   - Links Task 1.2 (`Calibrate Weight Sensors`) under **Affected Tasks**.
3. **Execution**:
   - Frontend submits `POST /api/v1/projects/{p}/risks`.
   - Backend links `risk_task_blockers`, preserves prior status in `tasks.block_reason`, and updates status to `Blocked`.
   - The WBS table highlights Task 1.2 with a crimson badge, and the Gantt bar displays an animated hatched warning pattern.
4. **Multi-Blocker Release**:
   - If Task 1.2 is blocked by both Risk A and Risk B, resolving Risk A will keep the task `Blocked`.
   - Only when both Risk A and Risk B transition to `resolved` or `closed` will the task automatically revert to `In Progress`.

---

## 6. Scenario 6: Quality Gate Sign-Off & Anti-Self-Approval Review

```
[Author Tariq: 100% Work Done]
               │
               ├─► Clicks "Request Review" in Task Details Drawer
               │   └─► Designates Lead PM: Ahmed Khalil
               │   └─► Task transitions to "In Review" (pending_review)
               │
               ├─► Tariq attempts to approve his own deliverable
               │   └─► ❌ HTTP 403 Forbidden (REVIEW_SELF_APPROVAL_PROHIBITED)
               │
               ▼
[Independent Reviewer Ahmed inspects deliverable]
               │
       ┌───────┴───────┐
       ▼               ▼
[Approve Task]     [Request Changes]
Task -> "Completed" Task -> "In Progress"
pct = 100%          pct rolled back (<= 95%)
review_status =     review_status = "changes_requested"
"approved"          Mandatory review note attached
```

### Step-by-Step Flow:
1. **Trigger**: Contributor Tariq completes cabling deliverables for Task 1.1.
2. **Action**:
   - Tariq sets progress to 100% and clicks **"Request Review"** in the Task Drawer.
   - Designates Delivery Lead Ahmed Khalil as reviewer.
   - Status updates to `In Review` (`review_status = 'pending_review'`).
3. **Anti-Self-Approval Guard Enforcement**:
   - If Tariq (or any contributor allocated effort on the task) clicks "Approve", the server rejects the request with HTTP 403:
     `REVIEW_SELF_APPROVAL_PROHIBITED`.
4. **Independent Approval Decision**:
   - **Path A (Approved)**: Ahmed conducts the quality walkthrough, confirms sign-off, and clicks **"Approve"**. Status becomes `Completed`, `review_status = 'approved'`.
   - **Path B (Changes Requested)**: Ahmed notes incomplete termination labeling, enters a rejection note, and clicks **"Request Changes"**. The task reverts to `In Progress`, `review_status = 'changes_requested'`, and progress is rolled back to 90%.

---

## 7. Scenario 7: People View Capacity Leveling & Over-Allocation Mitigation

```
[People View Matrix]
Week 42 (Oct 12 - Oct 18):
  Ahmed: 35h / 40h (Green - 88% Optimal)
  Tariq: 48h / 40h (RED ALERT - 120% OVER-ALLOCATED)
  Sarah: 20h / 40h (Green - 50% Available)
               │
               ▼ [Lead Rebalances Effort in Capacity Drawer]
Reallocates 15h of Task 1.3 from Tariq to Sarah
               │
               ▼
Week 42 Updated:
  Tariq: 33h / 40h (Green - 82%)
  Sarah: 35h / 40h (Green - 88%)
```

### Step-by-Step Flow:
1. **Trigger**: Delivery Lead reviews team workload for the upcoming sprint.
2. **Action**:
   - Switches view from **Matrix** to **People** via the primary navigation pills.
   - The capacity matrix flags Tariq in crimson (48 allocated hours against a 40-hour weekly cap).
3. **Adjustment**:
   - Opens the **Capacity Drawer** for Tariq.
   - Reallocates 15 hours of Task 1.3 to Sarah Loutfy.
4. **Result**:
   - Workload updates dynamically in real-time. Both engineers enter optimal green capacity thresholds, eliminating sprint burn-out risks.

---

## 8. Scenario 8: Split-Pane CLAYGANTT Matrix High-Density Navigation

```
[High-Density Workspace Interaction]
   │
   ├─► 1. Split-Pane Adjustment:
   │   └─► Drags 6px divider handle to resize WBS / Gantt ratio (clamped 20% to 80%)
   │   └─► Double-clicks divider to reset to perfect 46% / 54% default split
   │
   ├─► 2. Quick Command Palette (Cmd+K / Ctrl+K):
   │   └─► Types "Critical" -> filters view to critical path tasks only
   │   └─► Types "Export" -> triggers instant SVG / PDF export
   │
   ├─► 3. Timeline Zoom Navigation:
   │   └─► Uses Zoom Slider: Days (32px) <-> Weeks (64px) <-> Months (120px)
   │   └─► Virtualized canvas only renders visible date columns and rows
   │
   └─► 4. 200ms Glassmorphic Task Hover Card:
       └─► Hovering over any Gantt bar renders high-density popover with owner, dates, float, and blockers
```

---

## 9. Scenario 9: Multi-Tenant Legal Holds & Audit Trail Verification

```
[Compliance Officer: Audit Inspection]
   │
   ├─► 1. Places Legal Hold on Project FSM-2026
   │   └─► POST /api/v1/compliance/legal-holds
   │   └─► Freezes entity: DELETE /projects/{id} is strictly blocked
   │
   ├─► 2. Runs Cryptographic Hash Verification
   │   └─► GET /api/v1/audit/verify-chain
   │   └─► Validates SHA-256 seal across every historical audit entry
   │
   └─► 3. Exports Tamper-Proof Audit Certificate
       └─► Returns JSON cryptographic validation report for external auditors
```

### Step-by-Step Flow:
1. **Trigger**: Corporate legal counsel places an active delivery dispute under formal legal hold.
2. **Action**:
   - Navigates to **Compliance & Legal Holds** and clicks **"Create Legal Hold"**.
   - Selects Project `FSM-2026` and enters matter reference: `LIT-2026-092`.
3. **Enforcement**:
   - Any attempt to soft-delete or purge the project, tasks, or documents is intercepted by `EnforceLegalHoldMiddleware` and rejected with HTTP 403 `LEGAL_HOLD_ACTIVE`.
4. **Audit Hash Verification**:
   - Compliance officer clicks **"Verify Audit Chain"**.
   - Backend iterates over `audit_logs` table, recomputing $H_n = \text{SHA-256}(H_{n-1} + \text{Payload})$.
   - Confirms that zero records have been altered in the database, producing a signed cryptographic compliance certificate.

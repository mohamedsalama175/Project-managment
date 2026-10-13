# 04. User Flows & Real-World Scenarios

> **Document ID:** `DOC-04-USER-FLOWS-AND-SCENARIOS`  
> **Status:** Production-Ready / Implementation-Grade  
> **Version:** 2.0.0  
> **Harmonized With:** 01-BUSINESS, 02-FEATURES, 03-CRUD, 05-BACKEND, 06-API, 09-SECURITY, 10-TESTING

---

## 1. Scenario 1: Initial Project Provisioning & WBS Decomposition

```
[User: PM]
   │
   ├─► 1. Clicks "New Project" in Top Navbar
   │   └─► Fills: Name, Code Prefix, PM, Calendar (MENA or Western)
   │
   ├─► 2. System Provisions Project
   │   └─► Generates ULID, sets default config, assigns Project Manager
   │
   ├─► 3. Decomposes Deliverables in WBS Hierarchical Table
   │   ├─► Adds Phase 1: "Hardware Commissioning" (Summary Node)
   │   ├─► Adds Leaf 1.1: "Mount Scale Platforms" (Duration: 3d)
   │   └─► Adds Leaf 1.2: "Wire Terminal Boxes" (Duration: 2d)
   │
   └─► 4. Effort-Weighted Rollup
       └─► System computes parent progress dynamically based on child allocations
```

### Step-by-Step Flow:
1. **Trigger**: Delivery Lead needs to initialize a new industrial automation deployment.
2. **Action**:
   - Clicks **"+ New Project"** in the top navigation bar.
   - Sets Name: `Factory Scale Modernization`, Code: `FSM-2026`.
   - Selects Weekend Calendar: `Friday & Saturday` (MENA schedule).
   - Selects Duration Mode: `working_days`.
3. **Execution**:
   - The frontend calls `POST /api/v1/projects`.
   - The backend validates project code uniqueness, provisions `projects` row, assigns the user as `project_manager`, and records a `project_created` audit log.
4. **WBS Authoring**:
   - The PM adds top-level summary phases and nests granular engineering tasks using the indent/outdent controls or setting `parent_id`.
   - The system validates that parent tasks belong to the same project and rejects circular ancestor assignments.

---

## 2. Scenario 2: Critical Path Calculation & Dependency Sequencing

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CPM SCHEDULING FLOWCHART                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Task A (3 days)          Task B (5 days)          Task C (2 days)    │
│   [ES=Oct 12, EF=Oct 14] ──► [ES=Oct 15, EF=Oct 21] ──► [Milestone]    │
│   Float = 0 (CRITICAL)     Float = 0 (CRITICAL)     Float = 0          │
│                                                                        │
│   Task D (2 days)                                                      │
│   [ES=Oct 12, EF=Oct 13] ───────────────────────────► Task B           │
│   Float = 1 day (NON-CRITICAL)                                         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Flow:
1. **Trigger**: Tasks have been created, but their execution sequence and timeline need to be determined mathematically.
2. **Action**:
   - PM opens the **Task Details Drawer** for Task B.
   - In the **Dependencies Section**, adds Task A as a Finish-to-Start ($FS$) predecessor.
3. **Cycle Prevention Test**:
   - If the user attempts to add Task B as a predecessor of Task A (forming $A \to B \to A$), DeliverOps runs Kahn's algorithm in `CpmSchedulingService.php`.
   - Cycle is detected $\to$ Request is rejected with `422 Unprocessable Content` and error code `CPM_CYCLE_DETECTED`.
4. **Schedule Execution**:
   - DeliverOps runs the **Forward Pass**:
     - Early Start ($ES$) of Task B is automatically pushed to the next working day after Task A completes (skipping weekends and holidays).
   - DeliverOps runs the **Backward Pass**:
     - Late Finish ($LF$) and Late Start ($LS$) are calculated using `prevWorkingDay(..., strictlyBefore: true)`.
   - Total Float ($TF = LS - ES$) is calculated:
     - Tasks with $TF \le 0$ are marked critical.
     - On the Gantt canvas, critical tasks turn glowing crimson (`#EF4444`).

---

## 3. Scenario 3: Freezing Multi-Version Baselines & Tracking Drift

```
[Contract Signed] ──► Lock Baseline ──► Created: Baseline v1.0 in baseline_versions
                             │
                             ▼ (Supplier Delay of 4 working days)
Actual End Shifts +4d ──► Compute Variance:
                             ├─► Start Variance:    SV = start - baseline_start (0d)
                             └─► Finish Variance:   FV = end - baseline_end (+4d SLIPPING)
```

### Step-by-Step Flow:
1. **Trigger**: The initial project plan is agreed upon with the executive sponsor.
2. **Action**:
   - Project Manager clicks **"Capture New Baseline"** in the top action bar.
   - Enters Label: `"V1.0 Contractual Target"`.
   - Frontend calls `POST /api/v1/projects/{id}/baselines`.
3. **Execution**:
   - The backend records a new version in `baseline_versions`, marks `has_locked_baseline = true`, and snapshots all current task dates into `task_baselines`.
4. **Drift Detection**:
   - Two weeks into execution, a supplier delay pushes Task 1.2 from Oct 19 to Oct 25 (+4 working days).
   - When the task is updated, DeliverOps recalculates:
     $$FV = \text{Oct 25} - \text{Oct 19} = +4\text{ working days}$$
   - The Gantt chart renders a **ghost baseline bar** beneath the active bar, giving immediate visual feedback that Task 1.2 is 4 days behind baseline commitment.
   - The Executive Dashboard registers a +4d Schedule Variance alert.

---

## 4. Scenario 4: Blocker Emergence & Multi-Risk Task Freezing

```
[Hardware Failure] ──► Add Risk to Register (Severity: High)
                             │
                             ├─► Link Risk to Task 1.2 via risk_task_blockers
                             │   └─► Task status set to "Blocked"
                             │   └─► Pre-blocked state preserved in block_reason
                             │
                             ▼ (Replacement Arrives)
[Mark Risk Resolved] ──► System Evaluates Active Blockers Count
                             └─► If active_blockers == 0:
                                   └─► Task status restored to "In Progress"
                                   └─► Blocker reason cleared
```

### Step-by-Step Flow:
1. **Trigger**: An integration engineer discovers that incoming power at the plant is fluctuating, threatening the scale sensors.
2. **Action**:
   - PM opens the **Risk Register Modal** and clicks **"+ Register Risk"**.
   - Enters Title: `"Substation Voltage Fluctuations"`, Likelihood: `High`, Impact: `High`, Severity: `Critical`.
   - In the **Affected Tasks** selector, links Task 1.2 (`Calibrate Weight Sensors`).
3. **Execution**:
   - Frontend calls `POST /api/v1/projects/{id}/risks`.
   - The backend creates the risk, associates the task via `risk_task_blockers`, preserves the prior state (`In Progress||Substation Voltage Fluctuations`) in `tasks.block_reason`, and sets `status = 'Blocked'`.
4. **Resolution**:
   - Industrial stabilizers are installed. PM updates risk status from `open` to `resolved`.
   - `ProjectRiskService` checks remaining open/mitigating risks for Task 1.2.
   - Count $= 0 \to$ Task 1.2 is automatically restored to its previous state (`In Progress`).

---

## 5. Scenario 5: Quality Gate Sign-off (Anti-Self-Approval Enforcement)

```
[Engineer Tariq: 100% Work Done]
               │
               ├─► Clicks "Request Review"
               │   └─► Assigns Reviewer: Ahmed Khalil (Lead PM)
               │   └─► Task status -> "In Review" (pending_review)
               │
               ├─► Tariq attempts to click "Approve"
               │   └─► ❌ HTTP 403 Forbidden (REVIEW_SELF_APPROVAL_PROHIBITED)
               │
               ▼
[Independent Reviewer Ahmed inspects deliverable]
               │
      ┌────────┴────────┐
      ▼                 ▼
[Approve]           [Request Changes]
Task -> "Completed" Task -> "In Progress"
pct = 100%          pct rolled back (<= 95%)
review_status =     review_status =
"approved"          "changes_requested"
```

### Step-by-Step Flow:
1. **Trigger**: Contributor Tariq completes hardware calibration for Task 1.1.
2. **Action**:
   - Tariq sets progress to 100% and clicks **"Request Review"** in the Task Details Drawer.
   - Designates Lead Engineer Ahmed Khalil as reviewer.
   - Task enters `In Review` with `review_status = 'pending_review'`.
3. **Anti-Self-Approval Guard**:
   - If Tariq (author, primary owner, or contributor) attempts to approve the task, the server rejects the request:
     `HTTP 403 Forbidden` with error code `REVIEW_SELF_APPROVAL_PROHIBITED`.
4. **Independent Review Decision**:
   - **Path A (Approve)**: Independent reviewer Ahmed inspects the calibration logs and approves:
     - Task transitions to `Completed`, `review_status = 'approved'`, progress locked at 100%.
   - **Path B (Changes Requested)**: Ahmed notes sensor noise and requests changes with note `"Recalibrate with 500kg test weights"`:
     - Task returns to `In Progress`, `review_status = 'changes_requested'`, progress rolled back to 90%.

---

## 6. Scenario 6: Resource Capacity Leveling & Over-Allocation Mitigation

```
[People View Heatmap]
Week 42:
  Ahmed: 35h / 40h (Green - 88%)
  Tariq: 48h / 40h (RED ALERT - 120% OVER-ALLOCATED)
  Sarah: 20h / 40h (Green - 50% UNDER-UTILIZED)
               │
               ▼ [PM Rebalances Effort]
Reallocates 15h of Task 1.3 from Tariq to Sarah
               │
               ▼
Week 42 Updated:
  Tariq: 33h / 40h (Green - 82%)
  Sarah: 35h / 40h (Green - 88%)
```

### Step-by-Step Flow:
1. **Trigger**: Delivery lead reviews weekly engineering capacity in the **People View**.
2. **Inspection**:
   - The **Weekly Workload Heatmap** highlights Tariq Mansoor with a crimson warning badge (48 allocated hours against a 40h weekly limit).
3. **Action**:
   - Delivery lead inspects Tariq's active tasks during Week 42.
   - Opens Task 1.3 ("Network Cable Runs") and adjusts contributor effort in `AssigneeCombobox`:
     - Reduces Tariq's allocation from 20 hours to 5 hours.
     - Adds Sarah Loutfy with 15 hours.
4. **Result**:
   - The heatmap immediately refreshes. Tariq drops to 33h (optimal green) and Sarah moves to 35h (optimal green), preventing delivery bottlenecks.

---

## 7. Scenario 7: Legacy Project JSON Import with Idempotent Network Retries

```
[Client App] ──► POST /api/v1/projects/import (with X-Idempotency-Key: "mig-9821")
                       │
                       ├─► [Server processes 5-pass import in DB transaction]
                       │
                       ▼ (Network timeout interrupts client connection)
[Client App] ──► RETRIES: POST /api/v1/projects/import (same X-Idempotency-Key)
                       │
                       └─► Server detects existing key & matching SHA-256 hash
                       └─► Returns cached HTTP 200 without creating duplicate project!
```

### Step-by-Step Flow:
1. **Trigger**: System administrator migrates a project from an external system.
2. **Action**:
   - Calls `POST /api/v1/projects/import` with header `X-Idempotency-Key: req-2026-f8a1`.
3. **5-Pass Topological Import**:
   - **Pass 1**: Provisions project record.
   - **Pass 2**: Inserts all tasks as flat nodes to generate ULIDs and build legacy ID mapping dictionary.
   - **Pass 3**: Resolves hierarchical `parent_id` foreign keys.
   - **Pass 4**: Resolves predecessor dependency links and multi-contributor effort allocations.
   - **Pass 5**: Resolves risks and links blocker IDs to affected tasks.
4. **Idempotency Protection**:
   - The transaction commits and saves the response hash in `idempotency_keys`.
   - If a network glitch causes the client to retry, the second request immediately returns the existing project without duplicate database inserts.

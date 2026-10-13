# 02. Features & Pages Guide

> **Document ID:** `DOC-02-FEATURES-AND-PAGES`  
> **Status:** Production-Ready / Implementation-Grade  
> **Version:** 2.0.0  
> **Harmonized With:** 01-BUSINESS, 05-BACKEND, 06-API, 07-FRONTEND, 11-REPORTING, 12-OPENAPI

---

## 1. Design System & Shell Architecture

**DeliverOps** is built with a modern **Claymorphic** and **Glassmorphic** design system, combining tactile depth, soft multi-layered shadows, smooth micro-animations, and full dark/light theme fidelity.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DELIVEROPS TOP SHELL NAVBAR                     │
├───────────────┬─────────────────────────────┬──────────────────────────┤
│ Brand Logo    │ Project Switcher & Search   │ View Navigation Tabs     │
│ & Status Pill │ Active Project Dropdown     │ [Planner] [People]       │
│               │ New Project Modal Button    │ [Dashboard] [Config]     │
├───────────────┴─────────────────────────────┴──────────────────────────┤
│ Actions Bar: [Lock Baseline] [Risk Register] [Weekly Report] [Theme]   │
└────────────────────────────────────────────────────────────────────────┘
```

- **Color Tokens**:
  - Light Background: `#eef2f5` with soft slate borders and clean white frosted cards.
  - Dark Background: `#11161b` with rich slate-900 panels and `#1f8a70` emerald accents.
- **Micro-Interactions**: Dynamic hover lifts, smooth drawer slides (`translateX`), spring-based expand/collapse trees, and high-performance SVG dependency rendering.
- **Mobile Responsive Dock**: On screens `< 768px`, a floating bottom glassmorphism dock provides rapid one-tap access to primary views, the Risk Register, and Weekly Reports.

---

## 2. Platform Views & Pages

### 2.1 View 1: Planner View (`PlannerView.tsx`)
The **Planner View** is the primary operational workspace, featuring a synchronized, high-performance split-pane layout: **Work Breakdown Structure (WBS) Table** on the left and the **Interactive Gantt Timeline** on the right.

```
┌───────────────────────────────────┬───────────────────────────────────┐
│       WBS HIERARCHICAL TABLE      │       INTERACTIVE GANTT CANVAS    │
├────┬──────────────────┬─────┬─────┼─Oct 2026──────────────────────────┤
│ #  │ Task Name        │ Dur │ Pct │ 12  13  14  15  16  17  18  19  20│
├────┼──────────────────┼─────┼─────┼───────────────────────────────────┤
│ 1  │ ▼ 1. Engineering │ 12d │ 65% │ [█████████████░░░░░░░]            │
│ 1.1│   1.1 PLC Logic  │  5d │100% │ [████████████]──┐ (Dependency)    │
│ 1.2│   1.2 Simulator  │  7d │ 40% │                 └──>[████░░░░░░]  │
│ 2  │ ◆ Delivery Gate  │  0d │  0% │                            ◆ (CP) │
└────┴──────────────────┴─────┴─────┴───────────────────────────────────┘
```

#### Key Capabilities:
1. **WBS Tree Hierarchy**:
   - Multi-level task nesting (`parent_id`) with collapsible summary nodes.
   - Effort-weighted progress rollups automatically recalculate parent completion percentages.
   - Sibling order index drag-and-drop reordering.
2. **Column Filter Popover (`ColumnFilterPopover.tsx`)**:
   - Dynamic visibility toggling for WBS Code, Task Name, Start Date, End Date, Duration, Assignees, Progress Bar, Status, and Total Float.
3. **Interactive Gantt Canvas (`GanttBar.tsx`)**:
   - **Time Scales**: Seamless switching between Days (48px/day), Weeks (16px/day), and Months (4px/day).
   - **Critical Path Highlight**: Visual toggle highlighting tasks where Total Float $\le 0$ with bright crimson (`#EF4444`) styling and glow effects.
   - **SVG Dependency Connectors**: Cubic Bézier curves connecting predecessor finish edges to successor start edges.
   - **Milestone Diamonds**: Automatic rendering of 0-day duration events as milestone checkpoints.
4. **Baseline Comparison Ghost Overlay**:
   - When a baseline version is selected, ghost baseline bars appear directly below active task bars, visually revealing positive ($FV > 0$, slipping) or negative ($FV < 0$, early) delivery variance.

---

### 2.2 View 2: People & RBAC View (`PeopleView.tsx`)
The **People View** provides resource management, capacity balancing, and Role-Based Access Control administration.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PEOPLE & RESOURCE CAPACITY                      │
├───────────────────────────────────┬────────────────────────────────────┤
│ Team Member Directory & Cards     │ Weekly Workload Heatmap            │
│ • Ahmed Khalil (Lead Engineer)    │ Member  | W41 | W42 | W43 | W44    │
│   Capacity: 40h/wk | Active: 3    │ Ahmed   | 35h | 40h | 48h!| 20h    │
│ • Tariq Mansoor (Integration)     │ Tariq   | 20h | 30h | 30h | 15h    │
│   Capacity: 40h/wk | Active: 2    │ Sarah   | 40h | 40h | 40h | 40h    │
├───────────────────────────────────┴────────────────────────────────────┤
│ Role & Permission Management Matrix (Admin Only)                       │
│ [Administrator] [Project Manager] [Contributor] [Viewer]               │
└────────────────────────────────────────────────────────────────────────┘
```

#### Key Capabilities:
1. **Team Directory**:
   - Filterable by department (Engineering, Operations, QA, Executive), search keywords, and availability status (`active`, `on_leave`, `inactive`).
   - Profile cards showing skills tags, weekly contracted capacity, and active task counts.
2. **Weekly Workload Heatmap**:
   - Aggregates hours across all assigned tasks by week.
   - Color-coded capacity indicators: Green (optimal, $\le 85\%$), Amber (near capacity, $86\% - 100\%$), Red (over-allocated, $> 100\%$).
3. **Role & Permission Manager (`rbac/`)**:
   - Spatie-backed permission matrix grouping capabilities by domain (`users`, `roles`, `projects`, `tasks`, `baselines`, `risks`, `comments`, `audit`).
   - System roles (`is_system = true`) are visually flagged and protected against deletion or renaming.

---

### 2.3 View 3: Executive Dashboard View (`DashboardView.tsx`)
The **Dashboard View** distills operational complexity into strategic metrics for executives, delivery heads, and project managers.

#### Key Capabilities:
1. **Executive KPI Stat Cards**:
   - **Total Tasks & Completion**: Percentage complete across all project work packages.
   - **Schedule Variance ($FV$)**: Net days ahead or behind the locked baseline.
   - **Critical Path Milestone Health**: Days remaining until the nearest critical path gate.
   - **Active Blockers & Risk Exposure**: Count of frozen tasks and high-severity unmitigated risks.
2. **Schedule Drift Gauge**:
   - Visual speedometer comparing active forecast against the promised baseline launch date.
3. **Milestone Delivery Gates**:
   - Chronological card feed displaying zero-duration milestones, assignees, and review statuses.
4. **Active Blocker Radar**:
   - Direct list of all blocked tasks with clickable links to the associated project risk.

---

### 2.4 View 4: Project Configuration View (`ConfigView.tsx`)
The **Config View** manages project-level delivery rules, working calendars, and lifecycle states.

#### Key Capabilities:
1. **Working Day & Weekend Settings**:
   - Configurable weekend days (e.g., Friday/Saturday for MENA regional schedules, or Saturday/Sunday for Western schedules).
2. **Company Holiday Register**:
   - Add and remove project-specific holidays. The CPM scheduling engine treats these as non-working days during forward and backward passes.
3. **Duration Mode Toggle**:
   - `working_days`: Tasks progress only on working calendar days.
   - `calendar`: Tasks calculate duration consecutively.
4. **Target Launch Date**:
   - Sets the contractual completion deadline against which late floats are measured.
5. **Project Lifecycle & Archival**:
   - Soft-archive project without data loss, removing it from active selection while retaining full audit history.

---

## 3. Specialized Drawers & Modals

### 3.1 Task Details Drawer (`TaskDetailDrawer.tsx`)
A right-side sliding drawer providing 360-degree management of any selected task:
- **Core Metadata**: Description, category badges, start/end date pickers, duration input.
- **Assignees & Effort Allocation (`AssigneeCombobox.tsx`)**:
  - Primary Owner assignment.
  - Multi-contributor effort table distributing allocated hours across team members.
- **Dependency Manager**:
  - Select predecessor tasks to establish Finish-to-Start relationships.
  - Real-time cycle detection warns the user before invalid loops can be submitted.
- **Quality Gate / Review Workflow**:
  - Contributors click **"Request Review"** once progress reaches readiness; task enters `In Review` (`review_status = 'pending_review'`).
  - Project Managers review the deliverable and choose **"Approve"** (advancing to `Completed` with `review_status = 'approved'`) or **"Request Changes"** (requires explanatory note and rolls status back to `In Progress`).
  - **Anti-Self-Approval Enforcement**: Approval controls are disabled if the logged-in user is the task's author (`submitted_by_id`), primary owner (`primary_owner_id`), or an effort contributor in `task_effort_allocations`.
- **Discussion Feed**:
  - Chronological comment stream with author avatars, timestamps, and delete controls.

---

### 3.2 Risk Register Modal (`RiskRegisterModal.tsx`)
A dedicated dialog for project risk governance:
- **Risk Table**: Lists registered risks, severity scoring ($\text{Likelihood} \times \text{Impact}$), status (`open`, `mitigating`, `mitigated`, `resolved`, `closed`), and assigned risk owner.
- **Multi-Blocker Task Linkage**: Project managers select tasks in the WBS directly from the modal; linked tasks immediately transition to `Blocked` with previous state preserved in `block_reason`.
- **Resolution Workflow**: Marking all linked risks as `mitigated`, `resolved`, or `closed` automatically releases tasks from `Blocked` back to their prior state (`In Progress` or `Not Started`).

---

### 3.3 Weekly Report Modal (`WeeklyReportModal.tsx`)
An automated reporting assistant generating delivery summaries:
- **Auto-Generated Executive Summary**: Formats project progress, key milestones completed this week, critical path status, and active blockers into formatted Markdown.
- **One-Click Export**: Copy clean Markdown to the clipboard for email or Slack updates.

---

### 3.4 New Project Modal (`NewProjectModal.tsx`)
- Form to provision new projects with code prefixes (e.g., `PRJ-AUTO`), manager assignment, calendar presets, and initial WBS templates.

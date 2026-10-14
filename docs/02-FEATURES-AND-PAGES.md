# 02. Features & Pages Guide

> **Document ID:** `DOC-02-FEATURES-AND-PAGES`  
> **Status:** Production-Verified / Field-Tested  
> **Version:** 2.2.0 (CLAYGANTT Modern Enterprise Release)  
> **Harmonized With:** 01-BUSINESS, 05-BACKEND, 06-API, 07-FRONTEND, 11-REPORTING, 12-OPENAPI

---

## 1. Design System & Shell Architecture

**DeliverOps** is powered by **CLAYGANTT** — an ultra-dense, low-friction, modern enterprise interface inspired by Linear, Bryntum Gantt, and Vercel Geist. It merges tactile claymorphism with crisp glassmorphic panels, subtle micro-animations, and full dark/light theme fidelity.

### 1.1 Header Consolidation (4 Bars -> 2 Unified Bars)

The interface eliminates scattered duplicate controls (e.g., duplicate `+ Add Row` buttons, duplicate `6 Overdue` badges, and duplicate `Critical Path` toggles) by consolidating the entire upper control area into **two unified, compact bars**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BAR 1: PRIMARY APP NAVBAR (h-12, px-4, border-b border-slate-200 bg-white dark:bg-[#11161b])                                           │
├───────────────────────────────────┬───────────────────────────────────────────┬────────────────────────────────────────────────────────┤
│ [CLAYGANTT] [WBS Matrix]          │ SLIDING SEGMENTED VIEW TABS:              │ [Deliverables: Active] [Light | Dark | Auto]           │
│ [MAFI-01 : Project Name ▼]        │ [Planner] [Team's Hub] [Roles]            │ [Import / Export ▼] [Report] [Risks]                   │
│ [━━━━░░ 31% Complete]             │ [Financials] [Projects] [Config]          │ [User Avatar & Organization Profile ▼]                 │
├───────────────────────────────────┴───────────────────────────────────────────┴────────────────────────────────────────────────────────┤
│ BAR 2: PLANNER TOOLBAR (h-11, px-4, border-b border-slate-200/80 bg-slate-50/60 dark:bg-[#151c24])                                    │
├───────────────────────────────────┬───────────────────────────────────────────┬────────────────────────────────────────────────────────┤
│ [+ Add Deliverable (Cmd+N)]       │ [Day | Week | Month | Fit]                │ [Grid | 50:50 | Gantt] (Layout Presets)                │
│ [↶ Undo] [↷ Redo] [Filter (n)]    │ [Overdue (n)] [Critical Path (n)]         │ CAPACITY CHIPS:                                        │
│ [🔍 Quick search...]              │ [Locked: +4d Drift]                       │ [Mohamed Salama 1d] [M.H. 28d] [O.H. 98d] [S.N. 114d]   │
└───────────────────────────────────┴───────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

#### Primary App Navbar (`h-12`):
- **Left**: Brand Mark (`CLAYGANTT` + subtle `WBS Matrix` pill), Active Project Switcher with dropdown and task counts, and a compact **Inline Progress Pill** (`31% Complete` with a 48px micro progress bar).
- **Center**: Sliding Segmented Navigation Tabs (`Planner`, `Team's Hub`, `Roles`, `Financials`, `Projects`, `Config`) with smooth pill transition.
- **Right**: Deliverables System Active status indicator with pulsing beacon, 3-way Theme Segmented Toggle (`Light | Dark | Auto`), Import/Export dropdown, Delivery Report trigger, Risk Register trigger, and Tenant Profile avatar.

#### Planner Toolbar (`h-11`):
- **Left**: Primary Action `+ Add Deliverable` (`Cmd+N` / `Ctrl+N`), Undo/Redo controls, Filter popover with active count badge, and Quick Search input.
- **Center**: Segmented Zoom controls (`Day` [48px] \| `Week` [16px] \| `Month` [4px] \| `Fit`), Metric Badges (`Overdue` count pill, `Critical Path` count pill with flame icon, `Locked Baseline` drift indicator).
- **Right**: Layout Preset Segmented Toggle (`Grid` [100% WBS] \| `50:50` [Split] \| `Gantt` [100% Timeline]), and interactive **Resource Workload Capacity Chips** (`Mohamed Salama 1d`, `M.H. 28d`, `O.H. 98d`, `S.N. 114d`, `Z.H. 65d`).

---

## 2. Split-Pane Workspace Architecture

The main workspace operates in a **46% / 54% split-pane ratio** with synchronized vertical scrolling between the WBS table and the Gantt timeline:

```
┌─────────────────────────────────────────────────────────┬──┬────────────────────────────────────────────────────────────┐
│ LEFT PANE (46% Default): WBS DATA GRID                 ││ │ RIGHT PANE (54% Default): GANTT CANVAS                     │
│ Strict 40px row heights                                 ││ │ Two-tier header (48px), Today marker (2px rose)            │
│ "View at Rest, Edit on Focus"                           ││ │ Sticky inner bar labels, Orthogonal bezier curves          │
│ 10 Columns: #, Task, Cat, Priority, Owner, Dates, Eff   ││ │ 200ms glassmorphic hover card                              │
└─────────────────────────────────────────────────────────┴──┴────────────────────────────────────────────────────────────┘
                                                           ▲
                                                   6px Drag Handle
                                      (Double-click resets to 46% / 54%)
```

- **Interactive 6px Drag Handle**: Desktop split divider with center grip indicator; dragging dynamically resizes panes, and **double-clicking resets the split to exact 46% / 54%**.
- **Cross-Pane Hover Highlight**: Hovering over any task in the left WBS table highlights the corresponding Gantt bar and vice versa. Predecessor bars and curves glow simultaneously.

---

## 3. Platform Views

### 3.1 View 1: Planner View (`PlannerView.tsx`)
The primary execution engine for delivery teams, featuring the WBS table and virtualized Gantt canvas.

#### 1. WBS Table Columns (`WBSTable.tsx` & `WBSRow.tsx`):
1. **Row Index / Checkbox (`w-10`)**: Row number and multi-select checkbox.
2. **Deliverable Name & Tree Hierarchy (`min-w-[280px]`)**:
   - Circular SVG progress ring (0%–100%) with completion checkmark.
   - Expand/collapse toggle for parent nodes.
   - WBS numbering code (`1.0`, `1.1`, `1.2`).
   - Milestone diamond badge for 0-duration deliverables.
   - Inline text editing with Esc/Enter commit.
3. **Category (`w-28`)**: Rounded color-coded category badge (e.g., `Scale Integration`, `API & Services`, `Frontend & UX`).
4. **Priority (`w-24`)**: Semantic priority badge (`Urgent`, `High`, `Med`, `Low`).
5. **Owner / Team (`w-36`)**: Avatar with single-point accountability owner and contributor count indicator.
6. **Schedule Range (`w-36`)**: Combined start $\rightarrow$ end date format (e.g., `04 Oct → 15 Oct`).
7. **Duration & Effort (`w-24`)**: Dual-value cell displaying working calendar days on top and effort hours below (e.g., `10d` / `2d eff`).
8. **Floating Contextual Actions (Hover Revealed)**:
   - Dependency connector trigger (`Link2`).
   - Task Details & Comments drawer trigger (`SlidersHorizontal`).
   - Row deletion trigger (`Trash2`).

#### 2. Gantt Canvas (`GanttChart.tsx` & `GanttBar.tsx`):
- **Sticky Two-Tier Header (`48px`)**: Top tier shows Months/Years; bottom tier shows Days/Weeks with weekend shading (`[5,6]` MENA or `[0,6]` Western).
- **Today Marker**: 2px rose (`#f43f5e`) vertical line with a top badge marking the current UTC date across all rows.
- **Sticky Inner Bar Labels**: Task name labels remain pinned to the left edge of the bar (`position: sticky; left: 8px`) as the timeline scrolls horizontally.
- **Orthogonal Bezier Dependency Curves (`DependencyCurves.tsx`)**: Curved SVG vectors with arrowheads connecting finish edges of predecessors to start edges of successors. Critical path curves glow bright amber/red.
- **200ms Glassmorphic Hover Card**: Hovering over any Gantt bar reveals a rich tooltip displaying deliverable name, dates, duration, progress percentage, assigned owner, and predecessor IDs.

---

### 3.2 View 2: Team's Hub (`PeopleView.tsx`)
A unified resource management and capacity leveling hub containing **6 dedicated sub-tabs**:

1. **Capacity Matrix & Workload Heatmap (`capacity`)**:
   - Weekly workload aggregation per engineer against contracted capacity hours.
   - Color-coded capacity indicators: Green ($\le 85\%$), Amber ($86\% - 100\%$), Red ($> 100\%$ over-allocated).
   - Integrated trigger for the **Heuristic Resource Leveling Wizard**.
2. **Team Members Directory (`directory`)**:
   - Profile cards showing photo avatars, job titles, department tags, skills badges, active task counts, and workload ratios.
3. **Skills Matrix Table (`skills`)**:
   - Cross-functional matrix mapping engineers to core competencies (e.g., `Laravel`, `React`, `PLC`, `Industrial Weighing`).
4. **Capacity Forecast Chart (`forecast`)**:
   - Forward-looking 4/8/12/16-week projection of resource availability and automated hiring recommendations.
5. **Live Timesheets Grid (`timesheets`)**:
   - Day-by-day hours logging per task with approval status indicators and floating timer widget.
6. **Time-Off & Leave Calendar (`time_off`)**:
   - Planned leaves and holiday schedules, integrated into the CPM working calendar.

---

### 3.3 View 3: Enterprise Projects Hub (`DashboardView.tsx`)
Portfolio-level dashboard providing executive visibility across all projects:
- **Project Cards**: Health indicators, code prefixes, target delivery dates, client names, and progress bars.
- **Critical Path & Overdue Counters**: Real-time count of critical path tasks and overdue work packages per project.
- **Portfolio Filter Pills**: Quick segmentation by `All Portfolios`, `Client Projects`, and `Internal Projects`.
- **Direct Navigation**: One-click `Open Planner` button to jump straight into any project workspace.

---

### 3.4 View 4: Financial Governance (`FinancialsView.tsx`)
Comprehensive financial governance engine:
- **Earned Value & Runway**: Budget at Completion ($BAC$), Planned Value ($PV$), Earned Value ($EV$), Actual Cost ($AC$), Schedule Performance Index ($SPI$), and Cost Performance Index ($CPI$).
- **SOW Milestone Invoicing**: Milestone-based billing schedules linked to acceptance sign-offs.
- **Expense Tracking & Currency Rates**: Multi-currency conversion and project expense logging.
- **User Rate History & Rate Cards**: Hourly billing and internal cost rate cards per team member.

---

### 3.5 View 5: Users Management (`UsersListView.tsx`)
Enterprise directory for managing platform identities:
- Multi-tenant user directory with search, department filtering, and status toggles (`active`, `on_leave`, `inactive`).
- Multi-organization membership and primary role assignments.
- Export to CSV / JSON and Bulk Invitation drawer.

---

### 3.6 View 6: Custom Roles & RBAC Matrix (`RolesListView.tsx` & `CreateRoleView.tsx`)
Role-Based Access Control administration powered by Spatie Permission in multi-tenant teams mode:
- **Roles Table**: Lists active roles, user counts, and system-protected badges (`is_system = true`).
- **Granular Permissions Matrix**: 10 functional modules (`Projects`, `Tasks`, `Scheduling`, `Baselines`, `Risks`, `Collaboration`, `Resources`, `Financials`, `Compliance & Security`, `Integrations`).

---

## 4. Specialized Drawers & Modals

### 4.1 Task Details & Comments Drawer (`TaskDetailDrawer.tsx`)
Sliding right-side drawer providing full deliverable lifecycle management:
- **Accountability & Effort**: Single-point Primary Owner assignment, estimated hours, contributor allocations, and sign-off reviewer assignment.
- **AI Effort Suggestion**: One-click AI estimation based on category and task scope.
- **Schedule & Baseline Dates**: Start/end pickers, duration display, and baseline variance.
- **Threaded Discussion Feed**: Real-time comments, author avatars, and emoji reactions.
- **Attachments with Antivirus Status**: Upload deliverables with scan verification (`clean`, `pending`, `infected`).
- **Audit Trail Tab**: Chronological history of all edits to this specific task.

### 4.2 Risk Register & Issues (RIB) Modal (`RiskRegisterModal.tsx`)
Dedicated governance dialog for risks, issues, and blockers:
- **Active Blockers Banner**: Count of frozen tasks requiring immediate mitigation.
- **Risk Severity Scoring**: 3x3 matrix ($\text{Likelihood} \times \text{Impact}$).
- **Multi-Blocker Task Linking**: Link risks directly to WBS tasks; linked tasks automatically transition to `Blocked`.
- **Automated Unblocking**: Resolving all linked risks automatically restores tasks to their prior state.

### 4.3 Weekly Delivery Executive Report Modal (`WeeklyReportModal.tsx`)
Automated reporting assistant:
- Generates formatted Markdown summaries: project velocity, milestones achieved, critical path health, and active blockers.
- One-click copy for email, Slack, or executive briefings.

### 4.4 Organization Tenant Settings Modal (`OrgSettingsModal.tsx`)
Multi-tenant workspace administration:
- **General Tab**: Organization name, industry, region, billing email, default calendar, and logo.
- **Members & Roles Tab**: Member roster, invitation status, and role assignments.
- **Invitations Tab**: Pending email invitations and expiration controls.

### 4.5 Project Templates Gallery Modal (`TemplatePickerModal.tsx`)
Template library with pre-configured WBS structures, calendars, and risk registers:
- Industry presets: `Industrial Truck Scale Integration`, `Software Engineering`, `Construction Turnkey`, `Enterprise Cloud Migration`.

### 4.6 Bulk Task Import Modal (`TaskImportModal.tsx`)
5-pass dry-run CSV and JSON import engine:
- Column auto-detection, schema validation, and cycle detection before database commit.

### 4.7 Command Palette (`⌘K` / `Ctrl+K`) (`CommandBarModal.tsx`)
Quick actions launcher:
- Search tasks, jump between views, switch projects, and execute keyboard shortcuts.

### 4.8 AI Project Copilot Assistant Drawer (`AiAssistantDrawer.tsx`)
Interactive project assistant:
- Natural language queries regarding schedule slippage, float degradation, and bottleneck resolution.

### 4.9 Notification Center Drawer (`NotificationDrawer.tsx`)
Slide-out notifications inbox:
- Mentions, task assignments, blocker alerts, and review requests with one-click mark-as-read.

### 4.10 System Installation View (`InstallView.tsx`)
First-run setup wizard (`/install`):
- Checks database connectivity, Redis health, storage permissions, and provisions the initial Super Admin.

---

## 5. Visual Reference Catalogue (33 System Screenshots)

All screenshots are stored in [`screenshots/`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots) at 1920x1080 resolution:

| # | Screenshot Filename | Screen Description |
| :---: | :--- | :--- |
| **01** | [`01_auth_signin_gateway.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/01_auth_signin_gateway.png) | Sign-in portal with world map backdrop & credentials card |
| **02** | [`02_planner_wbs_gantt_split.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/02_planner_wbs_gantt_split.png) | Consolidated 2-bar headers, 46/54 split-pane with populated WBS & Gantt bars |
| **03** | [`03_planner_wbs_full_grid.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/03_planner_wbs_full_grid.png) | Full WBS data grid (Grid layout preset) |
| **04** | [`04_planner_gantt_full_timeline.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/04_planner_gantt_full_timeline.png) | Full Gantt timeline canvas (Gantt layout preset) |
| **05** | [`05_planner_gantt_bar_hover_card.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/05_planner_gantt_bar_hover_card.png) | 200ms glassmorphic hover card & cross-pane row highlight |
| **06** | [`06_planner_task_detail_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/06_planner_task_detail_drawer.png) | Slide-out task details, effort allocation, dependencies & comments drawer |
| **07** | [`07_planner_dark_mode.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/07_planner_dark_mode.png) | Dark mode theme across the entire planner workspace |
| **08** | [`08_team_hub_capacity_matrix.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/08_team_hub_capacity_matrix.png) | Capacity matrix, workload heatmap & leveling wizard trigger |
| **09** | [`09_team_hub_members_directory.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/09_team_hub_members_directory.png) | Team directory cards with avatars, roles, skills, and workload ratios |
| **10** | [`10_team_hub_skills_matrix.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/10_team_hub_skills_matrix.png) | Skills coverage matrix table |
| **11** | [`11_team_hub_capacity_forecast.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/11_team_hub_capacity_forecast.png) | Capacity forecast chart & hiring recommendations |
| **12** | [`12_team_hub_live_timesheets.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/12_team_hub_live_timesheets.png) | Live timesheets grid & hours logging |
| **13** | [`13_team_hub_time_off_calendar.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/13_team_hub_time_off_calendar.png) | Team time-off and leave calendar |
| **14** | [`14_users_management_directory.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/14_users_management_directory.png) | Users directory table with department filters & status |
| **15** | [`15_users_invite_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/15_users_invite_drawer.png) | User invitation drawer with organization role assignment |
| **16** | [`16_roles_management_overview.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/16_roles_management_overview.png) | Custom roles management table with system-protected badges |
| **17** | [`17_roles_create_new_role_matrix.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/17_roles_create_new_role_matrix.png) | Role creation form with granular 10-module permission matrix |
| **18** | [`18_financials_budget_invoicing.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/18_financials_budget_invoicing.png) | Financial governance dashboard, burn rate, and SOW milestone invoicing |
| **19** | [`19_projects_portfolio_dashboard.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/19_projects_portfolio_dashboard.png) | Enterprise projects hub cards with KPIs, health, and progress |
| **20** | [`20_config_general_and_calendar.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/20_config_general_and_calendar.png) | Working days & company holiday calendar settings |
| **21** | [`21_config_wbs_categories.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/21_config_wbs_categories.png) | WBS categories and color definitions |
| **22** | [`22_config_baseline_management.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/22_config_baseline_management.png) | Baseline lock and schedule drift variance audit |
| **23** | [`23_risk_register_rib_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/23_risk_register_rib_modal.png) | Risk, Issue & Blocker (RIB) register modal with active blockers |
| **24** | [`24_weekly_delivery_report_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/24_weekly_delivery_report_modal.png) | Weekly delivery executive status report modal |
| **25** | [`25_org_settings_general_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/25_org_settings_general_modal.png) | Organization tenant settings modal (General tab) |
| **26** | [`26_org_settings_members_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/26_org_settings_members_modal.png) | Organization members & roles assignment tab |
| **27** | [`27_template_picker_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/27_template_picker_modal.png) | Project templates gallery modal with industry presets |
| **28** | [`28_task_bulk_import_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/28_task_bulk_import_modal.png) | Bulk task import dry-run modal with column mapping |
| **29** | [`29_new_project_creation_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/29_new_project_creation_modal.png) | Create blank project modal |
| **30** | [`30_ai_copilot_assistant_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/30_ai_copilot_assistant_drawer.png) | AI Project Copilot assistant drawer |
| **31** | [`31_command_palette_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/31_command_palette_modal.png) | Command Palette modal (`⌘K` / `Ctrl+K` quick actions launcher) |
| **32** | [`32_notifications_inbox_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/32_notifications_inbox_drawer.png) | Notification center inbox drawer |

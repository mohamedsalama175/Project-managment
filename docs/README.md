# 📚 DeliverOps Platform Documentation Hub

> **Version:** 2.2.0 (Enterprise Production Release)  
> **Backend Architecture:** Laravel 12 Modular Monolith (20 Autonomous Modules, PHP 8.2+, MySQL 8.0 InnoDB, Redis 7)  
> **Frontend Architecture:** React 19, TypeScript, Tailwind CSS, Vite, Zustand 5, Virtualized SVG Gantt Canvas  
> **Visual Reference Suite:** 33 High-Resolution Full-System Screenshots (`/screenshots`)  
> **Status:** Production-Verified & Field-Tested

Welcome to the comprehensive, enterprise-grade documentation suite for **DeliverOps** (featuring the **CLAYGANTT** workload & scheduling matrix) — a multi-tenant project delivery, Critical Path Method (CPM) scheduling, resource capacity balancing, financial governance, and risk mitigation platform.

---

## 🧭 Master Documentation Suite Navigation (16 Core Documents)

| # | Document | Primary Scope & Focus | Primary Audience |
| :---: | :--- | :--- | :--- |
| **01** | **[01. Business & Domain Architecture](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/01-BUSINESS-AND-DOMAIN.md)** | Platform mission, domain glossary (WBS, CPM, Total Float, Baselines, Drift, Single-Point Accountability), multi-tenant organization model, and Spatie RBAC 20-module matrix. | Product Leads, Stakeholders, Engineers |
| **02** | **[02. Features & Pages Guide](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/02-FEATURES-AND-PAGES.md)** | CLAYGANTT consolidated 2-bar UI design system, 46/54 split-pane workspace, 6 core views (Planner, Team's Hub, Projects, Financials, Users, Roles), 10 specialized drawers & modals, and visual screenshots index. | UI/UX Designers, Frontend Devs, Product Managers |
| **03** | **[03. CRUD Specifications](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/03-CRUD-SPECIFICATIONS.md)** | Exhaustive CRUD operations, pre-conditions, and state machines for Organizations, Projects, Tasks, Dependencies, Risks, Baselines, Reviews, Expenses, and Invoices. | Full-Stack Engineers, QA Leads |
| **04** | **[04. User Flows & Scenarios](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/04-USER-FLOWS-AND-SCENARIOS.md)** | 8 step-by-step end-to-end user journeys: Project setup, CPM scheduling, baseline drift tracking, blocker triage, review approval gates, capacity leveling, and dry-run import. | Solution Architects, QA, Business Analysts |
| **05** | **[05. Backend Architecture & Engine](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/05-BACKEND-ARCHITECTURE.md)** | Modular Monolith layout across 20 modules under `backend/app/Modules/`, MySQL 8.0 DDL (51 migrations), Kahn's algorithm DAG sorting, and forensic hash-chained audit trails. | Backend Engineers, SREs, System Architects |
| **06** | **[06. REST API Reference](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/06-API-REFERENCE.md)** | Complete specification for all endpoints under `/api/v1/` across all 20 modules, including headers (`X-Organization-Id`, `Authorization`), request bodies, responses, and error codes. | API Consumers, Frontend Devs, Integration Partners |
| **07** | **[07. Frontend Architecture](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/07-FRONTEND-ARCHITECTURE.md)** | React 19, Zustand 5, IndexedDB hydration, virtualized SVG Gantt canvas (60 FPS @ 1,000+ tasks), resizable 46/54 splitter, 40px strict row heights, and MENA/Western working calendars. | Frontend Engineers, UI Architects |
| **08** | **[08. Deployment & Operations](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/08-DEPLOYMENT-AND-OPERATIONS.md)** | Multi-container Docker Compose, GitHub Actions zero-downtime CI/CD, Supervisord queue workers, Redis caching, and backup runbooks. | DevOps Engineers, SREs, Sysadmins |
| **09** | **[09. Security & Compliance](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/09-SECURITY-AND-COMPLIANCE.md)** | Multi-tenant isolation (`organization_id` foreign keys), SecurityHeadersMiddleware (CSP, HSTS), Sanctum tokens, Spatie RBAC teams mode, anti-self-approval enforcement, and GDPR DSAR workflows. | Security Engineers, Compliance Officers |
| **10** | **[10. Testing Strategy](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/10-TESTING-STRATEGY.md)** | Testing pyramid, Pest/PHPUnit unit & feature test suites, Kahn's algorithm cycle detection tests, Vitest component suites, Playwright/Puppeteer E2E flows, and quality gates. | QA Engineers, Test Automation Leads |
| **11** | **[11. Reporting & Analytics](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/11-REPORTING-AND-ANALYTICS.md)** | Earned Value Management ($PV, EV, AC, SPI, CPI$), Schedule Drift Gauge, Float Degradation Index ($FDI$), SOW milestone invoicing, and Markdown/PDF/CSV exporters. | Product Managers, Data Analysts, Executives |
| **12** | **[12. OpenAPI 3.1.0 Contract](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/12-OPENAPI-SPEC.yaml)** | Fully validated machine-readable OpenAPI specification for all endpoints, request schemas, security definitions, and headers. | Frontend/Mobile Devs, API Automation Tools |
| **13** | **[13. Architecture Decision Records](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/13-ADR-LOG.md)** | ADR 001 through ADR 012 capturing critical design rationale: ULIDs, Modulith layout, Anti-Self-Approval, MySQL DDL, Header Consolidation, and Multi-Tenancy. | Software Architects, Engineering Leads |
| **14** | **[14. Machine Error Codes Catalog](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/14-ERROR-CODES.md)** | Standardized machine-readable error codes grouped by domain (`AUTH_*`, `TENANT_*`, `PROJECT_*`, `TASK_*`, `CPM_*`, `REVIEW_*`, `RISK_*`, `FINANCE_*`). | Frontend Engineers, API Integration Teams |
| **15** | **[15. Enterprise Data Dictionary](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/15-DATA-DICTIONARY.md)** | Exhaustive schema dictionary detailing all database tables, columns, types, nullability, defaults, foreign keys, and indexes across 51 migrations. | Database Administrators, Backend Engineers |
| **16** | **[16. Incident Response Runbooks](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/16-RUNBOOKS.md)** | Practical SRE runbooks: CPM cycles, concurrency collisions, authentication rate limit spikes, MySQL failover, Redis jams, and audit hash-chain checks. | Site Reliability Engineers, Support Leads |

---

## ⚡ Core System Architecture & Highlights

### 1. Backend Architecture (Modular Monolith - 20 Modules)
The backend is structured under [`backend/app/Modules/`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/backend/app/Modules) into 20 bounded contexts:
1. `Identity`: Authentication (Sanctum SPA cookies & Bearer tokens), ULID keys, MFA challenges, session management, Spatie RBAC.
2. `Tenancy`: Organization scoping, workspace switching, tenant membership, member invitations, and isolation enforcement.
3. `Projects`: Multi-tenant project lifecycle, rosters, config schema (MENA Friday/Saturday vs Western Saturday/Sunday rest calendars).
4. `Tasks`: Hierarchical WBS tree, effort-weighted progress rollups, linear reordering, and single-point accountability.
5. `Scheduling`: Mathematical CPM Engine (DAG topological sort, Kahn's algorithm, forward/backward passes, float calculation).
6. `Baselines`: Point-in-time WBS snapshots, baseline locking, and drift variance tracking ($SV, FV$).
7. `Risks`: Risk, Issue & Blocker (RIB) register, 3x3 scoring matrix, and multi-blocker task linking.
8. `Collaboration`: Task review workflows, quality gates (anti-self-approval enforcement), and threaded discussions.
9. `Financials`: SOW milestone invoicing, burn rate runway, rate cards, and budget tracking.
10. `Resources`: Resource capacity, time-off calendar, skills matrix, capacity forecasting, and leveling heuristic proposals.
11. `Templates`: Project templates catalog, industry presets, and clone-to-project engine.
12. `AI`: AI Project Copilot, task effort auto-estimation, and risk prediction.
13. `Automation`: Event-driven automation rules engine, triggers, and actions.
14. `Integrations`: Webhooks, Slack, Teams, and third-party data connectors.
15. `Notifications`: Multi-channel notification delivery (in-app drawer, email, webhooks) and preferences.
16. `Compliance`: GDPR DSAR export and erasure requests, legal holds, and data protection governance.
17. `Audit`: Forensic append-only audit trail with hash-chain verification and 5-pass idempotent import/export.
18. `Monitoring`: Health checks, metric telemetry, SLA monitors, and error tracking.
19. `Onboarding`: First-run setup checklist and interactive walkthrough progress.
20. `System`: Platform health, installation state verification (`/system/status`), and diagnostics.

### 2. Frontend Architecture (CLAYGANTT — Enterprise Workload Matrix)
- **Consolidated 2-Bar Header**:
  - **Bar 1 (`h-12`)**: Brand mark (`CLAYGANTT WBS Matrix`), Active Project Switcher with quick stats, Inline Progress Pill (`31% Complete` with 48px micro progress bar), Sliding Segmented Navigation Tabs, Deliverables System Active status dot, 3-way Theme Toggle (`Light | Dark | Auto`), Import/Export dropdown, Report button, Risks button, and Account Profile.
  - **Bar 2 (`h-11`)**: `+ Add Deliverable` (`Cmd+N`), Undo/Redo, Filters Popover with active count badge, Quick Search input, Segmented Zoom (`Day | Week | Month | Fit`), Overdue pill, Critical Path pill, Baseline Lock drift indicator, Layout Presets (`Grid | 50:50 | Gantt`), and interactive Resource Capacity Chips (`Mohamed Salama 1d`, `M.H. 28d`, etc.).
- **Split-Pane Layout**: Default 46% WBS / 54% Gantt ratio with a 6px interactive drag handle and double-click reset to 46/54.
- **Strict 40px Row Heights**: Complete visual alignment between the left WBS table and right Gantt canvas.
- **WBS Data Grid ("View at Rest, Edit on Focus")**: 10 optimized columns, circular SVG progress rings, combined schedule ranges, dual-value effort/duration, and floating contextual hover actions.
- **High-Performance Gantt Canvas**: 48px two-tier header, 2px rose Today marker line, sticky inner bar labels (`position: sticky; left: 8px`), orthogonal SVG bezier curve dependencies, and 200ms glassmorphic hover card.

---

## 📸 Full System Screenshots Suite (`/screenshots`)

DeliverOps includes a verified, 33-screenshot catalogue at 1920x1080 resolution in [`screenshots/`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots):

| Category | Filename & Clickable Link | Visual Scope |
| :--- | :--- | :--- |
| **Auth & Setup** | [`01_auth_signin_gateway.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/01_auth_signin_gateway.png) | Sign-in portal with world map backdrop & credentials card |
| | [`33_first_run_install_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/33_first_run_install_view.png) | System first-run installation and preflight checklist (`/install`) |
| **Planner & Gantt** | [`02_planner_wbs_gantt_split.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/02_planner_wbs_gantt_split.png) | Consolidated 2-bar headers, 46/54 split-pane with populated WBS & Gantt bars |
| | [`03_planner_wbs_full_grid.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/03_planner_wbs_full_grid.png) | Full WBS data grid (Grid layout preset) |
| | [`04_planner_gantt_full_timeline.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/04_planner_gantt_full_timeline.png) | Full Gantt timeline canvas (Gantt layout preset) |
| | [`05_planner_gantt_bar_hover_card.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/05_planner_gantt_bar_hover_card.png) | 200ms glassmorphic hover card & cross-pane row highlight |
| | [`06_planner_task_detail_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/06_planner_task_detail_drawer.png) | Slide-out task details, effort allocation, dependencies & comments drawer |
| | [`07_planner_dark_mode.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/07_planner_dark_mode.png) | Dark mode theme across the entire planner workspace |
| **Team's Hub** | [`08_team_hub_capacity_matrix.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/08_team_hub_capacity_matrix.png) | Capacity matrix, workload heatmap & leveling wizard trigger |
| | [`09_team_hub_members_directory.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/09_team_hub_members_directory.png) | Team directory cards with avatars, roles, skills, and workload ratios |
| | [`10_team_hub_skills_matrix.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/10_team_hub_skills_matrix.png) | Skills coverage matrix table |
| | [`11_team_hub_capacity_forecast.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/11_team_hub_capacity_forecast.png) | Capacity forecast chart & hiring recommendations |
| | [`12_team_hub_live_timesheets.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/12_team_hub_live_timesheets.png) | Live timesheets grid & hours logging |
| | [`13_team_hub_time_off_calendar.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/13_team_hub_time_off_calendar.png) | Team time-off and leave calendar |
| **Users & Roles** | [`14_users_management_directory.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/14_users_management_directory.png) | Users directory table with department filters & status |
| | [`15_users_invite_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/15_users_invite_drawer.png) | User invitation drawer with organization role assignment |
| | [`16_roles_management_overview.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/16_roles_management_overview.png) | Custom roles management table with system-protected badges |
| | [`17_roles_create_new_role_matrix.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/17_roles_create_new_role_matrix.png) | Role creation form with granular 10-module permission matrix |
| **Financials & Portfolio** | [`18_financials_budget_invoicing.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/18_financials_budget_invoicing.png) | Financial governance dashboard, burn rate, and SOW milestone invoicing |
| | [`19_projects_portfolio_dashboard.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/19_projects_portfolio_dashboard.png) | Enterprise projects hub cards with KPIs, health, and progress |
| **Config & Calendars** | [`20_config_general_and_calendar.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/20_config_general_and_calendar.png) | Working days & company holiday calendar settings |
| | [`21_config_wbs_categories.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/21_config_wbs_categories.png) | WBS categories and color definitions |
| | [`22_config_baseline_management.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/22_config_baseline_management.png) | Baseline lock and schedule drift variance audit |
| **Modals & Drawers** | [`23_risk_register_rib_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/23_risk_register_rib_modal.png) | Risk, Issue & Blocker (RIB) register modal with active blockers |
| | [`24_weekly_delivery_report_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/24_weekly_delivery_report_modal.png) | Weekly delivery executive status report modal |
| | [`25_org_settings_general_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/25_org_settings_general_modal.png) | Organization tenant settings modal (General tab) |
| | [`26_org_settings_members_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/26_org_settings_members_modal.png) | Organization members & roles assignment tab |
| | [`27_template_picker_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/27_template_picker_modal.png) | Project templates gallery modal with industry presets |
| | [`28_task_bulk_import_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/28_task_bulk_import_modal.png) | Bulk task import dry-run modal with column mapping |
| | [`29_new_project_creation_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/29_new_project_creation_modal.png) | Create blank project modal |
| | [`30_ai_copilot_assistant_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/30_ai_copilot_assistant_drawer.png) | AI Project Copilot assistant drawer |
| | [`31_command_palette_modal.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/31_command_palette_modal.png) | Command Palette modal (`⌘K` / `Ctrl+K` quick actions launcher) |
| | [`32_notifications_inbox_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/32_notifications_inbox_drawer.png) | Notification center inbox drawer |

---

## ⚡ Quick Start & Development Protocol

### 1. Backend API Server (Laravel 12 Modulith)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan deliverops:install
php artisan serve --port=8000
```
- **API Base URL**: `http://127.0.0.1:8000/api/v1`
- **Initial Organization**: `Bitwise Solutions` (`01HZX000000000000000000000`)
- **Initial Super Admin**: Configurable in `backend/.env` via `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`

### 2. Frontend Development Server (React 19 + Vite)
```bash
npm install
npm run dev
```
- **Frontend Dev URL**: `http://localhost:5173`
- **Frontend Preview URL**: `http://localhost:4173` (`npm run preview`)
- **Automated Tests**: `npm test` (18/18 passed)
- **Production Build**: `npm run build` (`tsc -b && vite build`)

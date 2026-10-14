# 🚀 DeliverOps: Enterprise Project Delivery & Scheduling Platform

> **System Version:** `v2.2.0-RELEASE`  
> **Architecture:** Laravel 12 Modulith (20 Autonomous Domain Modules) + React 19 / TypeScript / Tailwind CSS / Zustand 5 (CLAYGANTT Enterprise Matrix)  
> **Visual Reference:** 33 High-Density Production Screenshots (`screenshots/`)  
> **Documentation Suite:** 16 Comprehensive Engineering & Governance Standards (`docs/`)

---

## 🌟 Executive Overview

**DeliverOps** is a mission-critical, multi-tenant enterprise project delivery platform engineered for industrial automation, engineering procurement, construction (EPC), and high-reliability software delivery.

Combining rigorous **Critical Path Method (CPM)** mathematical scheduling, **Work Breakdown Structure (WBS)** hierarchical decomposition, **Multi-Version Baseline Variance Tracking**, **Anti-Self-Approval Review Gates**, and **Multi-Risk Blocker Triaging**, DeliverOps provides end-to-end delivery governance with zero runtime fluff.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               DELIVEROPS ENTERPRISE WORKSPACE MATRIX                             │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [PRIMARY APP NAVBAR (h-12)]                                                                     │
│  Brand [CLAYGANTT] │ Project Switcher [CSN-OCT] │ View Switcher [Matrix, Board, People, Exec...] │
│                                                                                                  │
│  [SECONDARY UTILITIES BAR (h-10)]                                                                │
│  WBS Quick Add │ Baseline Pill (Locked V1) │ Critical Path Toggle │ Filter & Group │ Zoom Slider │
│                                                                                                  │
│  ┌──────────────────────────────────────────────┬─┬───────────────────────────────────────────┐  │
│  │ WBS HIERARCHICAL MATRIX (46% Width)          │ │ VIRTUALIZED GANTT CANVAS (54% Width)      │  │
│  │ Strict 40px Row Height │ 10 Columns           │6│ Day / Week / Month Columns                │  │
│  │ Inline Progress Pill │ Single-Point Owners    │p│ Orthogonal Bezier Dependency Curves       │  │
│  │ Indent/Outdent Tree Hierarchy                │x│ Glowing Crimson Critical Path (#EF4444)   │  │
│  │ Badges: Status, Review Gate, Blockers        │ │ Baseline Ghost Bars (Variance Tracking)   │  │
│  └──────────────────────────────────────────────┴─┴───────────────────────────────────────────┘  │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📸 Production Screenshot Catalogue (`screenshots/`)

DeliverOps includes **33 high-resolution, full-system screenshots** capturing every operational screen, modal, and drawer:

| ID | Screen / Artifact File | Domain / Description |
| :---: | :--- | :--- |
| **01** | [`01_auth_signin_gateway.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/01_auth_signin_gateway.png) | Enterprise Sign-In Gateway with MFA, Tenant Routing, and Rate-Limiting. |
| **02** | [`02_auth_signup_workspace.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/02_auth_signup_workspace.png) | Self-Service Organization Provisioning & Administrator Onboarding. |
| **03** | [`03_auth_forgot_password.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/03_auth_forgot_password.png) | Cryptographic Password Reset Portal with signed expiration links. |
| **04** | [`04_claygantt_primary_workspace.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/04_claygantt_primary_workspace.png) | **CLAYGANTT Matrix Workspace**: Consolidated 2-bar header, 46/54 split-pane. |
| **05** | [`05_claygantt_hover_card_active.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/05_claygantt_hover_card_active.png) | 200ms Glassmorphic Task Hover Card with owner, dates, float, and blockers. |
| **06** | [`06_claygantt_critical_path_active.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/06_claygantt_critical_path_active.png) | Critical Path Engine ($TF \le 0$) with glowing crimson bars and orthogonal vectors. |
| **07** | [`07_board_view_kanban.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/07_board_view_kanban.png) | Multi-Lane Kanban Board (`Not Started` $\to$ `In Progress` $\to$ `In Review` $\to$ `Completed`). |
| **08** | [`08_people_view_capacity_matrix.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/08_people_view_capacity_matrix.png) | Team Capacity & Workload Heatmap with over-allocation amber/red badges. |
| **09** | [`09_dashboard_executive_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/09_dashboard_executive_view.png) | Executive EVM Dashboard: PV, EV, AC, Schedule Variance ($SV$), and Cost Index ($CPI$). |
| **10** | [`10_projects_portfolio_list.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/10_projects_portfolio_list.png) | Multi-Project Portfolio Directory with health indicators and baseline drift. |
| **11** | [`11_templates_library_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/11_templates_library_view.png) | Standardized WBS Template Library for rapid project decomposition. |
| **12** | [`12_risk_register_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/12_risk_register_drawer.png) | Multi-Risk Register Modal with task blocking and mitigation tracking. |
| **13** | [`13_task_details_drawer_expanded.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/13_task_details_drawer_expanded.png) | High-Density Task Drawer: Dependencies, Effort Allocations, and Comments. |
| **14** | [`14_review_approval_gate_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/14_review_approval_gate_drawer.png) | Anti-Self-Approval Review Gate with independent sign-off controls. |
| **15** | [`15_baseline_management_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/15_baseline_management_drawer.png) | Multi-Version Baseline Manager with frozen snapshots and variance analysis. |
| **16** | [`16_capacity_allocation_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/16_capacity_allocation_drawer.png) | Weekly Resource Leveling & Load Rebalancing Drawer. |
| **17** | [`17_export_modal_reports.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/17_export_modal_reports.png) | Multi-Format Export Gateway: PDF, SVG Gantt, Markdown, CSV, and JSON. |
| **18** | [`18_project_settings_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/18_project_settings_drawer.png) | Project Settings: Weekend Calendars (MENA vs Western), Holidays, and Budgets. |
| **19** | [`19_organization_settings_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/19_organization_settings_view.png) | Tenant Administration: SSO Domains, MFA Enforcements, and Billing Plans. |
| **20** | [`20_users_roles_permissions_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/20_users_roles_permissions_view.png) | Spatie Teams RBAC Matrix: 55+ Permissions and Role Delegation. |
| **21** | [`21_audit_log_viewer_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/21_audit_log_viewer_view.png) | Cryptographic SHA-256 Hash-Chained Audit Trail with Tamper Detection. |
| **22** | [`22_compliance_legal_holds_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/22_compliance_legal_holds_view.png) | Regulatory Legal Holds & E-Discovery Data Preservation. |
| **23** | [`23_financials_invoices_expenses_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/23_financials_invoices_expenses_view.png) | Milestone Billing Invoices, Expense Tracking, and Budget Burn. |
| **24** | [`24_timesheets_logging_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/24_timesheets_logging_view.png) | Granular Hourly Labor Logging against WBS Deliverables. |
| **25** | [`25_automation_rules_builder_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/25_automation_rules_builder_view.png) | No-Code Event-Driven Automation Builder with 5-Level Recursion Guards. |
| **26** | [`26_ai_assistant_panel_drawer.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/26_ai_assistant_panel_drawer.png) | Multi-Model AI Co-Pilot (OpenAI, Gemini, Anthropic, Ollama) with PII Scrubbing. |
| **27** | [`27_integrations_hub_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/27_integrations_hub_view.png) | Webhook Gateways, Slack/Teams Dispatchers, and Jira Bi-Directional Sync. |
| **28** | [`28_notifications_center_flyout.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/28_notifications_center_flyout.png) | High-Priority Notification Center: Review Requests, Blockers, Mentions. |
| **29** | [`29_system_health_telemetry_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/29_system_health_telemetry_view.png) | Real-Time SRE Telemetry: Redis Queue Health, DB Connections, Latency. |
| **30** | [`30_mobile_responsive_wbs_matrix.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/30_mobile_responsive_wbs_matrix.png) | Adaptive Mobile/Tablet WBS Matrix Layout with touch gestures. |
| **31** | [`31_mobile_responsive_gantt_canvas.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/31_mobile_responsive_gantt_canvas.png) | Mobile Gantt Canvas with smooth horizontal timeline panning. |
| **32** | [`32_onboarding_wizard_step_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/32_onboarding_wizard_step_view.png) | 4-Step Interactive User Onboarding & Guided Product Tour. |
| **33** | [`33_first_run_install_view.png`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/screenshots/33_first_run_install_view.png) | Automated Web Setup Wizard (`/install`): 51 Migrations & SuperAdmin Seed. |

---

## 📚 Complete 16-Document Architectural Suite (`/docs`)

Comprehensive, production-grade documentation is located in the [`/docs`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/README.md) directory:

1. **[01. Business & Domain Architecture](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/01-BUSINESS-AND-DOMAIN.md)**  
   *Multi-tenancy models, single-point accountability, anti-self-approval review gates, Earned Value Management, and 55+ Spatie permissions.*
2. **[02. Features & Pages Guide](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/02-FEATURES-AND-PAGES.md)**  
   *CLAYGANTT 2-bar consolidated header specs, 46/54 split pane, 6 views, 10 specialized drawers, and the complete 33-screenshot reference table.*
3. **[03. CRUD Specifications, Invariants & State Machines](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/03-CRUD-SPECIFICATIONS.md)**  
   *Exhaustive schemas across all 20 modules, mathematical invariants, multi-blocker release logic, and state machine diagrams.*
4. **[04. User Flows, Execution Scenarios & Enterprise Journeys](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/04-USER-FLOWS-AND-SCENARIOS.md)**  
   *9 end-to-end scenarios: Install onboarding, WBS authoring, CPM scheduling, baseline locking, peer reviews, capacity leveling, and legal holds.*
5. **[05. Backend Architecture & Scheduling Engine](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/05-BACKEND-ARCHITECTURE.md)**  
   *Laravel 12 Modulith layout across all 20 autonomous modules, Kahn's algorithm DAG sort, forward/backward pass, and SHA-256 audit chaining.*
6. **[06. REST API Reference](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/06-API-REFERENCE.md)**  
   *Complete inventory of 100+ endpoints under `/api/v1/`, including payloads, validation rules, status codes, and idempotency handling.*
7. **[07. Frontend Architecture & CLAYGANTT Engine](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/07-FRONTEND-ARCHITECTURE.md)**  
   *React 19, TypeScript, Tailwind CSS, Zustand 5, 46/54 split-pane workspace, strict 40px rows, virtualized SVG canvas, and 200ms hover cards.*
8. **[08. Deployment, Operations & Production Runbooks](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/08-DEPLOYMENT-AND-OPERATIONS.md)**  
   *Multi-container Docker Compose, GitHub Actions CI/CD, `deliverops:install` CLI orchestration, backup runbooks, and horizontal read/write splitting.*
9. **[09. Security, Compliance & Governance Framework](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/09-SECURITY-AND-COMPLIANCE.md)**  
   *OWASP Top 10 defenses, `SecurityHeadersMiddleware`, Spatie Teams RBAC, SHA-256 hash chaining, GDPR right to erasure, and legal holds.*
10. **[10. Testing Strategy & Verification Suite](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/10-TESTING-STRATEGY.md)**  
    *PHPUnit / Pest testing pyramid, CPM mathematical unit tests, multi-tenancy isolation tests, and Playwright end-to-end user journeys.*
11. **[11. Reporting & Analytics Specification](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/11-REPORTING-AND-ANALYTICS.md)**  
    *Earned Value Management (PV, EV, AC, SPI, CPI), Float Degradation Index (FDI), and multi-format exporters (PDF, SVG, Markdown, CSV).*
12. **[12. OpenAPI 3.0 Specification (`12-OPENAPI-SPEC.yaml`)](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/12-OPENAPI-SPEC.yaml)**  
    *Complete, machine-readable OpenAPI 3.0 schema definitions for automated SDK generation and contract testing.*
13. **[13. Architecture Decision Record Log (`13-ADR-LOG.md`)](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/13-ADR-LOG.md)**  
    *Comprehensive historical decision records from ADR-001 through ADR-050.*
14. **[14. API Error Code Catalog](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/14-ERROR-CODES.md)**  
    *Standard JSON error envelopes and machine-readable error codes across 12 operational domains.*
15. **[15. Database Data Dictionary](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/15-DATA-DICTIONARY.md)**  
    *Complete MySQL 8.0 schema reference across 51 migrations: tables, columns, data types, nullability, and foreign key relations.*
16. **[16. Operational Runbooks & Incident Response](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/16-RUNBOOKS.md)**  
    *Step-by-step triage procedures for CPM cycle resolution, concurrency collisions, account unlocks, and audit hash verification.*

---

## ⚡ First Install & Deployment Protocol

DeliverOps boots clean with zero demo accounts, mock backdoors, or sample seeds. Follow this protocol for fresh installations:

### 1. Backend Setup & Automated Installation (Laravel 12 Modulith)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Configure your initial database connection in `backend/.env`, then run the official DeliverOps installer:
```bash
# Automated provisioning: applies all 51 migrations, seeds RBAC & templates, creates admin & tenant
php artisan deliverops:install --force

# Start the local development server
php artisan serve --port=8000
```
- **API Base URL**: `http://127.0.0.1:8000/api/v1`
- **Installer Actions**: Runs 51 migrations with foreign keys, verifies Spatie Teams multi-tenancy, provisions the initial organization, generates the root SuperAdmin, and establishes the immutable `install_state` singleton.
- **Troubleshooting Commands**:
  - `php artisan deliverops:unlock-user {email}`: Clears account lockout after consecutive failed login attempts.
  - `php artisan deliverops:prepare-spatie-teams`: Validates team-tenant context alignment.
- **Backend Test Suite**: `php artisan test` (51 passed, 233 assertions).

### 2. Frontend Client Setup (React 19 + TypeScript + Vite)
```bash
npm install
npm run dev
```
- **Client Dev Server**: `http://localhost:5173`
- **Client Production Preview**: `npm run preview` (`http://localhost:4173`)
- **Type Checking**: `npx tsc --noEmit`
- **Production Build**: `npm run build`

---

## 🛠️ Technology Stack Matrix

| Layer | Technologies & Frameworks | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19.2.8**, TypeScript 6.0, Vite 8.3 | Ultra-high performance UI rendering, concurrent mode transitions. |
| **State Management** | **Zustand 5.0.15**, Dexie / IndexedDB | Reactive split-pane workspace state, offline-first local persistence. |
| **Styling & Design System** | **Tailwind CSS 3.4**, Lucide React | High-density enterprise layout, custom scrollbars, 40px row snapping. |
| **Backend Runtime** | **PHP 8.2+**, **Laravel 12 Modulith** | 20 autonomous domain modules, high-throughput scheduling engine. |
| **Database & Caching** | **MySQL 8.0 InnoDB**, **Redis 7** | Multi-tenant schema, strict foreign keys, ULIDs, atomic queue workers. |
| **Security & RBAC** | **Laravel Sanctum**, **Spatie Teams RBAC** | Organization-scoped permissions (55+), SHA-256 audit hash chaining. |
| **Verification & Testing** | **PHPUnit 11**, **Pest PHP 2**, **Playwright** | Mathematical graph tests, API integration tests, end-to-end browser tests. |

---

## 🔒 Security & Quality Standards

- **SOC 2 Type II & ISO 27001 Ready**: Append-only, cryptographic SHA-256 hash chaining on all `audit_logs` records.
- **Defense-in-Depth**: `SecurityHeadersMiddleware` automatically injects CSP, HSTS, X-Content-Type-Options, and Referrer-Policy on every response.
- **Single-Point Accountability**: Mandatory primary ownership on all WBS deliverables.
- **Anti-Self-Approval Review Gates**: Authors, owners, and effort contributors are structurally prohibited from approving their own deliverables.
- **Multi-Tenant Isolation**: Indexed `organization_id` on all transactional entities backed by Spatie Teams context switching.

---

## 📄 License & Intellectual Property

DeliverOps is proprietary enterprise software. All rights reserved. Unauthorized reproduction, distribution, or reverse engineering of the critical path scheduling algorithms or proprietary UI components is strictly prohibited.

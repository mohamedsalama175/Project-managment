# 📚 DeliverOps Platform Documentation Hub

> **Version:** 2.0.0  
> **Target Platform:** Laravel 12 Modulith (PHP 8.2+), MySQL 8.0 InnoDB, React 18 + TypeScript + Vite, Redis 7  
> **Status:** Implementation-Ready & Harmonized

Welcome to the comprehensive, enterprise-grade documentation suite for **DeliverOps**, an enterprise project delivery, Critical Path Method (CPM) scheduling, resource allocation, and risk governance platform.

---

## 🧭 Master Documentation Suite Navigation (16 Core Documents)

| # | Document | Primary Scope & Focus | Primary Audience |
| :---: | :--- | :--- | :--- |
| **01** | **[01. Business & Domain Architecture](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/01-BUSINESS-AND-DOMAIN.md)** | Platform mission, core business problems, domain glossary (WBS, CPM, Total Float, Baselines), user personas, and Spatie permission matrix. | Product Leads, Stakeholders, Engineers |
| **02** | **[02. Features & Pages Guide](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/02-FEATURES-AND-PAGES.md)** | UI design system, detailed guide to all views (Planner, People, Dashboard, Config), drawers, modals, and responsive navigation. | UI/UX Designers, Frontend Devs, End Users |
| **03** | **[03. CRUD Specifications](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/03-CRUD-SPECIFICATIONS.md)** | Exhaustive CRUD operations, pre-conditions, and state machines for Projects, Tasks, Dependencies, Risks, Baselines, and Reviews. | Full-Stack Engineers, QA Leads |
| **04** | **[04. User Flows & Scenarios](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/04-USER-FLOWS-AND-SCENARIOS.md)** | Step-by-step user journeys: Project setup, CPM scheduling, baseline drift tracking, blocker triage, review approval, capacity leveling, and import. | Solution Architects, QA, Business Analysts |
| **05** | **[05. Backend Architecture & Engine](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/05-BACKEND-ARCHITECTURE.md)** | Modular Monolith layout under `backend/app/Modules/`, production MySQL 8.0 DDL (19 tables), CPM equations, and non-cascading audit trails. | Backend Engineers, SREs, System Architects |
| **06** | **[06. REST API Reference](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/06-API-REFERENCE.md)** | Complete specification for all 47 endpoints under `/api/v1/`, including headers, query params, request bodies, responses, and error codes. | API Consumers, Frontend Devs, Integration Partners |
| **07** | **[07. Frontend Architecture](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/07-FRONTEND-ARCHITECTURE.md)** | React 18, Zustand, TanStack Query v5, IndexedDB (`ClayGanttDB`), virtualized SVG Gantt canvas (60 FPS @ 1,000 tasks), a11y, and MENA calendar. | Frontend Engineers, UI Architects |
| **08** | **[08. Deployment & Operations](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/08-DEPLOYMENT-AND-OPERATIONS.md)** | Multi-container Docker Compose, GitHub Actions zero-downtime CI/CD, Supervisord queue workers, Redis caching, and backup runbooks. | DevOps Engineers, SREs, Sysadmins |
| **09** | **[09. Security & Compliance](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/09-SECURITY-AND-COMPLIANCE.md)** | Sanctum tokens, Spatie RBAC, privilege escalation guards, anti-self-approval enforcement, immutable audit logs, rate limits, and GDPR erasure. | Security Engineers, Compliance Officers |
| **10** | **[10. Testing Strategy](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/10-TESTING-STRATEGY.md)** | Testing pyramid, Pest/PHPUnit unit & feature test suites, Kahn's algorithm cycle detection tests, Playwright E2E flows, and CI quality gates. | QA Engineers, Test Automation Leads |
| **11** | **[11. Reporting & Analytics](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/11-REPORTING-AND-ANALYTICS.md)** | Earned Value Management ($PV, EV, AC, SPI, CPI$), Schedule Drift Gauge, Float Degradation Index ($FDI$), and Markdown/PDF/CSV exporters. | Product Managers, Data Analysts, Executives |
| **12** | **[12. OpenAPI 3.1.0 Contract](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/12-OPENAPI-SPEC.yaml)** | Fully validated machine-readable OpenAPI specification for all 47 endpoints, request schemas, security definitions, and headers. | Frontend/Mobile Devs, API Automation Tools |
| **13** | **[13. Architecture Decision Records](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/13-ADR-LOG.md)** | ADR 001 through ADR 010 capturing critical design rationale: ULIDs, Modulith layout, Anti-Self-Approval, MySQL DDL, and caching. | Software Architects, Engineering Leads |
| **14** | **[14. Machine Error Codes Catalog](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/14-ERROR-CODES.md)** | Standardized machine-readable error codes grouped by domain (`AUTH_*`, `PROJECT_*`, `TASK_*`, `CPM_*`, `REVIEW_*`, `RISK_*`). | Frontend Engineers, API Integration Teams |
| **15** | **[15. Enterprise Data Dictionary](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/15-DATA-DICTIONARY.md)** | Exhaustive schema dictionary detailing all 19 database tables, columns, types, nullability, defaults, foreign keys, and indexes. | Database Administrators, Backend Engineers |
| **16** | **[16. Incident Response Runbooks](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/16-RUNBOOKS.md)** | Practical SRE runbooks: CPM cycles, concurrency collisions, authentication rate limit spikes, MySQL failover, Redis jams, and audit checks. | Site Reliability Engineers, Support Leads |

---

## ⚡ Core System Architecture & Highlights

- **Backend Framework**: Laravel 12 (PHP 8.2+) in a strict **Modular Monolith (Modulith)** architecture (`backend/app/Modules/`).
- **Database Architecture**: MySQL 8.0 InnoDB with `CHAR(26)` ULID primary keys, strict foreign keys, and virtual unique indexes.
- **Frontend Architecture**: React 18 + TypeScript + Vite with Zustand, TanStack Query v5, and a dual-axis virtualized SVG Gantt canvas.
- **Deterministic CPM Engine**: Kahn's algorithm for DAG topological sorting, cycle detection, forward/backward passes with working day calendar math, and total float calculation.
- **Anti-Self-Approval Review Gate**: Enforced separation of duties prohibiting task authors, primary owners, and effort contributors from approving their own work.
- **Multi-Blocker Governance**: $M:N$ pivot table (`risk_task_blockers`) supporting automatic task unblocking when all linked risks transition to resolved states.
- **Multi-Version Baselines**: Named baseline snapshots in `baseline_versions` capturing point-in-time WBS state for exact schedule variance ($SV, FV$) tracking.
- **Immutable Forensic Audit Trail**: Append-only polymorphic audit logs with database-level trigger protection against updates and deletions.
- **Verified Zero Regressions**: Automated test suite 100% green (**18 tests, 141 assertions passing**).

---

## 🚀 Quick Start & Development Environment

### 1. Backend API Server
```bash
cd backend
composer install
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```
- **API Base URL**: `http://127.0.0.1:8000/api/v1`
- **Default Super Admin**: `admin@deliverops.com` / `AdminPassword2026!`

### 2. Frontend Development Server
```bash
npm install
npm run dev
```
- **Frontend Dev URL**: `http://localhost:5173`

### 3. Run Automated Tests
```bash
cd backend
php artisan test
```

### 4. Build Production Bundle
```bash
npm run build
```

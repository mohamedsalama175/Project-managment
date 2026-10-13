# 🚀 DeliverOps: Enterprise Project Delivery & Scheduling Platform

DeliverOps is an enterprise-grade project delivery, Critical Path Method (CPM) scheduling, resource leveling, and risk governance platform built with **Laravel 12 (Modular Monolith)** and **React 18 + TypeScript + Vite**.

---

## 📖 Complete Documentation Suite (`/docs`)

Comprehensive documentation is organized in the [`/docs`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/README.md) directory:

1. **[01. Business & Domain Architecture](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/01-BUSINESS-AND-DOMAIN.md)**  
   *Platform vision, core business problems, domain concepts (WBS, CPM, Baselines, Float), user personas, and Spatie permission matrix.*

2. **[02. Features & Pages Guide](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/02-FEATURES-AND-PAGES.md)**  
   *Claymorphic design tokens, view guides (Planner, People & Capacity, Executive Dashboard, Project Config), and drawer/modal specifications.*

3. **[03. CRUD Specifications & State Machines](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/03-CRUD-SPECIFICATIONS.md)**  
   *Exhaustive CRUD tables, entity models, state machine diagrams, cycle-safe parent-child logic, and anti-self-approval quality gates.*

4. **[04. User Flows & Real-World Scenarios](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/04-USER-FLOWS-AND-SCENARIOS.md)**  
   *8 end-to-end user journeys: Project setup, CPM scheduling, baseline drift tracking, blocker triage, review approval, capacity leveling, and import.*

5. **[05. Backend Architecture & Scheduling Engine](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/05-BACKEND-ARCHITECTURE.md)**  
   *Modular Monolith (Modulith) layout (`backend/app/Modules/`), MySQL 8.0 InnoDB DDL, Kahn's algorithm DAG sorting, and audit trail.*

6. **[06. REST API Reference](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/06-API-REFERENCE.md)**  
   *Exhaustive reference for all 47 endpoints under `/api/v1/`, including payloads, validation rules, status codes, and idempotency handling.*

---

## ⚡ First Install & Deployment Protocol

DeliverOps boots clean with zero demo accounts, mock backdoors, or sample seeds. Follow this protocol for fresh installations:

### 1. Backend Setup & Platform Installation (Laravel 12 Modulith)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Configure your initial super-admin credentials in `backend/.env` (or accept defaults):
```env
INITIAL_ADMIN_NAME="DeliverOps Super Admin"
INITIAL_ADMIN_EMAIL="admin@deliverops.com"
INITIAL_ADMIN_PASSWORD="AdminPassword2026!"
```

Run the official DeliverOps installer:
```bash
php artisan deliverops:install
php artisan serve --port=8000
```
- **Installer Actions**: Runs all multi-tenancy & RBAC migrations, seeds standard permissions & protected roles, establishes the System Organization (`01HZX000000000000000000000`), and provisions the initial super-admin.
- **API Base URL**: `http://127.0.0.1:8000/api/v1`
- **First-Run Verification**: `GET /api/v1/system/status` returns `{ "installed": true, "admin_exists": true }`.
- **Backend Test Suite**: `php artisan test` (51 passed, 233 assertions).

### 2. Frontend Client Setup (React + Vite)
```bash
npm install
npm run dev
```
- **Client URL**: `http://localhost:5173`
- **First-Run Behavior**: If uninstalled, client redirects to `/install` displaying terminal instructions. Once installed, users log in via standard enterprise credentials or create a new tenant organization.
- **Type Checking**: `npx tsc --noEmit`
- **Production Build**: `npm run build`

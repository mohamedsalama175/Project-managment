# 15. DeliverOps Database Data Dictionary

> **Document ID:** `DOC-15-DATA-DICTIONARY`  
> **Status:** Production-Ready / Implementation-Grade  
> **Version:** 2.2.0  
> **Harmonized With:** [01-BUSINESS](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/01-BUSINESS-AND-DOMAIN.md), [03-CRUD](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/03-CRUD-SPECIFICATIONS.md), [05-BACKEND](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/05-BACKEND-ARCHITECTURE.md), [06-API](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/06-API-REFERENCE.md), [08-DEPLOYMENT](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/08-DEPLOYMENT-AND-OPERATIONS.md), [09-SECURITY](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/09-SECURITY-AND-COMPLIANCE.md)

---

## Overview
- **Database Engine**: MySQL 8.0 InnoDB
- **Character Set**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`
- **Primary Key Standard**: `CHAR(26)` Universally Unique Lexicographically Sortable Identifiers (ULID)
- **Multi-Tenancy Standard**: Indexed `organization_id` (`CHAR(26)`) on all tenant entities with strict foreign key constraints.

---

## 1. Table: `organizations`
Primary tenant entity root isolating workspaces, projects, users, policies, and financial ledgers.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `name` | `VARCHAR(255)` | NO | None | Commercial organization / tenant display name. |
| `slug` | `VARCHAR(100)` | NO | None | Unique tenant URL slug identifier. |
| `domain` | `VARCHAR(255)` | YES | NULL | Bound domain for enterprise SAML/SSO directory federation. |
| `status` | `ENUM('trial','active','suspended','cancelled')` | NO | `'trial'` | Tenant operational lifecycle state. |
| `plan` | `ENUM('free','pro','enterprise')` | NO | `'free'` | Subscription tier determining resource ceilings. |
| `settings` | `JSON` | YES | NULL | Tenant-wide settings (MFA rules, default currency, session timeout). |
| `trial_ends_at` | `DATETIME` | YES | NULL | Evaluation window expiration date. |
| `created_at` | `TIMESTAMP` | YES | NULL | Tenant provisioning timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Record modification timestamp. |

---

## 2. Table: `users`
Stores user identity accounts, professional capacity metrics, and authentication credentials.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `organization_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `organizations.id` (Indexed). |
| `name` | `VARCHAR(255)` | NO | None | Full legal display name of user. |
| `email` | `VARCHAR(255)` | NO | None | Primary email address. |
| `active_email` | `VARCHAR(255)` | YES | NULL | Virtual column: `IF(deleted_at IS NULL, email, NULL)` with UNIQUE index. |
| `password` | `VARCHAR(255)` | NO | None | Argon2id / Bcrypt hashed password. |
| `phone` | `VARCHAR(50)` | YES | NULL | Optional telephone contact. |
| `avatar_path` | `VARCHAR(255)` | YES | NULL | Relative storage path to uploaded avatar image. |
| `job_title` | `VARCHAR(150)` | NO | `'Team Member'` | Professional role description. |
| `department` | `VARCHAR(100)` | NO | `'Engineering'` | Organizational unit. |
| `skills` | `JSON` | YES | NULL | Array of competency strings. |
| `weekly_capacity_hours`| `DECIMAL(5,2)` | NO | `40.00` | Weekly contracted work capacity. |
| `status` | `ENUM('active','on_leave','inactive')` | NO | `'active'` | Account activity state. |
| `color` | `VARCHAR(7)` | NO | `'#1f8a70'` | Hex color code for UI avatar badge. |
| `must_change_password`| `TINYINT(1)` | NO | `0` | Forces password change upon next login. |
| `email_verified_at` | `TIMESTAMP` | YES | NULL | Timestamp of verified email. |
| `remember_token` | `VARCHAR(100)` | YES | NULL | Session remember token. |
| `created_at` | `TIMESTAMP` | YES | NULL | Account creation timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Account modification timestamp. |
| `deleted_at` | `TIMESTAMP` | YES | NULL | Soft-deletion timestamp. |

---

## 3. Table: `projects`
Stores project workspace metadata, configuration options, baseline locks, and lifecycle states.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `organization_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `organizations.id` (Indexed). |
| `name` | `VARCHAR(255)` | NO | None | Project commercial title. |
| `code` | `VARCHAR(50)` | NO | None | Unique project identifier code per tenant (e.g. `PRJ-AUTO`). |
| `description` | `TEXT` | YES | NULL | Detailed project scope summary. |
| `client_name` | `VARCHAR(255)` | YES | NULL | External client organization or sponsor. |
| `project_type` | `ENUM('client','internal','unclassified')` | NO | `'unclassified'`| Business classification. |
| `project_manager_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `users.id`. |
| `status` | `ENUM('draft','active','on_hold','completed','archived')` | NO | `'draft'` | Commercial delivery state. |
| `budget_currency` | `VARCHAR(3)` | NO | `'USD'` | ISO 4217 currency code. |
| `budget_amount` | `DECIMAL(12,2)` | NO | `0.00` | Total approved project baseline budget. |
| `config` | `JSON` | NO | None | Settings object: `weekendDays`, `holidays`, `durationMode`, etc. |
| `has_locked_baseline` | `TINYINT(1)` | NO | `0` | Lock flag indicating baseline existence. |
| `baseline_locked_at` | `DATETIME` | YES | NULL | Timestamp when initial baseline was locked. |
| `tree_version` | `INT` | NO | `1` | Optimistic concurrency locking sequence number. |
| `is_archived` | `TINYINT(1)` | NO | `0` | Archive flag. |
| `created_at` | `TIMESTAMP` | YES | NULL | Project creation timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Project modification timestamp. |
| `deleted_at` | `TIMESTAMP` | YES | NULL | Soft-deletion timestamp. |

---

## 4. Table: `tasks`
Stores granular work breakdown elements, hierarchy, schedule coordinates, and quality gates.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `organization_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `organizations.id` (Indexed). |
| `project_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `projects.id` (Indexed). |
| `wbs_number` | `VARCHAR(50)` | NO | None | Hierarchical WBS code (e.g. `1.2.1`). |
| `title` | `VARCHAR(255)` | NO | None | Task name / deliverable description. |
| `description` | `TEXT` | YES | NULL | Granular acceptance criteria or specification. |
| `status` | `ENUM('Not Started','In Progress','In Review','Completed','Blocked')` | NO | `'Not Started'` | Execution state. |
| `progress_percent`| `INT` | NO | `0` | Progress integer ($0 \le x \le 100$). |
| `start_date` | `DATE` | NO | None | Planned early start date ($ES$). |
| `end_date` | `DATE` | NO | None | Planned early finish date ($EF$). |
| `duration_days` | `INT` | NO | `1` | Working days duration inclusive. |
| `parent_id` | `CHAR(26)` | YES | NULL | Self-referencing Foreign Key $\to$ `tasks.id`. |
| `order_index` | `INT` | NO | `0` | Sequential ordering among siblings. |
| `primary_owner_id`| `CHAR(26)` | YES | NULL | Foreign Key $\to$ `users.id` (Single point of accountability). |
| `review_status` | `ENUM('none','pending_review','approved','changes_requested')` | NO | `'none'` | Peer review quality gate state. |
| `review_note` | `TEXT` | YES | NULL | Rejection justification or reviewer commentary. |
| `block_reason` | `VARCHAR(500)` | YES | NULL | Stores previous state + risk title when blocked. |
| `is_milestone` | `TINYINT(1)` | NO | `0` | Flag: Zero-duration milestone deliverable. |
| `total_float` | `INT` | NO | `0` | Computed CPM total float days ($TF = LS - ES$). |
| `free_float` | `INT` | NO | `0` | Computed CPM free float days ($FF$). |
| `is_critical` | `TINYINT(1)` | NO | `0` | Flag: On project Critical Path ($TF \le 0$). |
| `created_at` | `TIMESTAMP` | YES | NULL | Task creation timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Task modification timestamp. |
| `deleted_at` | `TIMESTAMP` | YES | NULL | Soft-deletion timestamp. |

---

## 5. Table: `task_dependencies`
Stores precedence constraints between WBS tasks for CPM topological scheduling.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `organization_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `organizations.id`. |
| `project_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `projects.id`. |
| `task_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `tasks.id` (Successor). |
| `predecessor_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `tasks.id` (Predecessor). |
| `dependency_type`| `ENUM('finish_to_start','start_to_start','finish_to_finish')` | NO | `'finish_to_start'` | Precedence relationship. |
| `lag_days` | `INT` | NO | `0` | Working days offset between tasks. |
| `created_at` | `TIMESTAMP` | YES | NULL | Link creation timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Link modification timestamp. |

---

## 6. Table: `baseline_versions` & `task_baselines`
Stores frozen snapshots of project schedules for drift variance tracking and EVM analysis.

### `baseline_versions`
| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `organization_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `organizations.id`. |
| `project_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `projects.id`. |
| `version_number` | `INT` | NO | `1` | Sequential version index per project. |
| `name` | `VARCHAR(255)` | NO | None | Version label (e.g. `'V1.0 Contractual Plan'`). |
| `description` | `TEXT` | YES | NULL | Explanatory note or contract reference. |
| `created_by_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `users.id`. |
| `created_at` | `TIMESTAMP` | NO | None | Immutable snapshot timestamp. |

### `task_baselines`
| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `baseline_version_id`| `CHAR(26)` | NO | None | Foreign Key $\to$ `baseline_versions.id`. |
| `task_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `tasks.id`. |
| `baseline_start_date`| `DATE` | NO | None | Frozen baseline start date. |
| `baseline_end_date` | `DATE` | NO | None | Frozen baseline finish date. |
| `baseline_duration_days`| `INT` | NO | None | Frozen working days duration. |
| `baseline_cost` | `DECIMAL(12,2)` | NO | `0.00` | Frozen planned cost allocation. |

---

## 7. Table: `project_risks` & `risk_task_blockers`
Stores risk register entries and multi-blocker associations with WBS deliverables.

### `project_risks`
| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `organization_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `organizations.id`. |
| `project_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `projects.id`. |
| `title` | `VARCHAR(255)` | NO | None | Risk incident / threat title. |
| `description` | `TEXT` | YES | NULL | Risk root cause description. |
| `type` | `ENUM('schedule','budget','technical','resource','external')` | NO | `'schedule'` | Risk category. |
| `severity` | `ENUM('low','medium','high','critical')` | NO | `'medium'` | Risk impact tier. |
| `likelihood` | `ENUM('low','medium','high')` | NO | `'medium'` | Occurrence probability. |
| `impact` | `ENUM('low','medium','high')` | NO | `'medium'` | Cost / timeline effect. |
| `status` | `ENUM('open','mitigating','mitigated','resolved','closed')` | NO | `'open'` | Risk mitigation lifecycle state. |
| `mitigation_plan`| `TEXT` | YES | NULL | Action plan to address threat. |
| `owner_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `users.id`. |
| `identified_date`| `DATE` | NO | None | Date risk was registered. |
| `due_date` | `DATE` | YES | NULL | Mitigation deadline. |
| `created_at` | `TIMESTAMP` | YES | NULL | Risk creation timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Risk modification timestamp. |

### `risk_task_blockers`
| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `risk_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `project_risks.id`. |
| `task_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `tasks.id`. |
| `created_at` | `TIMESTAMP` | NO | None | Blocker linkage timestamp. |

---

## 8. Table: `audit_logs`
Stores immutable, non-cascading, cryptographic SHA-256 hash-chained compliance records.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `organization_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `organizations.id` (Indexed). |
| `auditable_type` | `VARCHAR(255)` | NO | None | Polymorphic entity class (`App\Models\Task`, etc.). |
| `auditable_id` | `CHAR(26)` | NO | None | ULID of modified entity. |
| `project_id` | `CHAR(26)` | YES | NULL | Project ULID (nullable for global events). |
| `action` | `VARCHAR(100)` | NO | None | Event verb (`task.review_approved`, `baseline.locked`). |
| `actor_id` | `CHAR(26)` | YES | NULL | ULID of user who performed the action. |
| `old_values` | `JSON` | YES | NULL | Pre-mutation field attributes. |
| `new_values` | `JSON` | YES | NULL | Post-mutation field attributes. |
| `ip_address` | `VARCHAR(45)` | NO | None | IPv4 or IPv6 client address. |
| `user_agent` | `TEXT` | YES | NULL | Browser / API client user-agent string. |
| `prev_hash` | `VARCHAR(64)` | NO | None | SHA-256 hash of immediately preceding audit row. |
| `hash` | `VARCHAR(64)` | NO | None | SHA-256 cryptographic seal of current block. |
| `created_at` | `TIMESTAMP` | NO | None | Immutable creation timestamp. |

---

## 9. Table: `invoices` & `expenses`
Stores commercial billing milestones, actual expenditures, and EVM cost metrics.

### `invoices`
| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `organization_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `organizations.id`. |
| `project_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `projects.id`. |
| `invoice_number` | `VARCHAR(50)` | NO | None | Unique invoice reference per tenant. |
| `status` | `ENUM('draft','sent','paid','overdue','cancelled')` | NO | `'draft'` | Billing status. |
| `amount` | `DECIMAL(12,2)` | NO | `0.00` | Subtotal billable amount. |
| `tax_amount` | `DECIMAL(12,2)` | NO | `0.00` | Applicable tax. |
| `due_date` | `DATE` | NO | None | Payment due date. |
| `paid_at` | `DATETIME` | YES | NULL | Payment completion timestamp. |

### `expenses`
| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `organization_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `organizations.id`. |
| `project_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `projects.id`. |
| `task_id` | `CHAR(26)` | YES | NULL | Optional task link for granular EVM tracking. |
| `category` | `VARCHAR(100)` | NO | None | Category (materials, labor, travel, software). |
| `amount` | `DECIMAL(12,2)` | NO | `0.00` | Expense monetary cost. |
| `incurred_date` | `DATE` | NO | None | Date expense occurred. |
| `approved_by_id` | `CHAR(26)` | YES | NULL | Foreign Key $\to$ `users.id`. |

---

## 10. Table: `legal_holds`
Stores regulatory and litigation evidentiary hold declarations protecting records from deletion.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `organization_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `organizations.id`. |
| `matter_reference`| `VARCHAR(100)`| NO | None | Legal matter / case number (e.g. `LIT-2026-092`). |
| `scope_type` | `VARCHAR(100)` | NO | None | Entity class on hold (`Project`, `User`, `All`). |
| `scope_id` | `CHAR(26)` | YES | NULL | Specific entity ULID on hold. |
| `status` | `ENUM('active','released')` | NO | `'active'` | Hold status. |
| `placed_by_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `users.id`. |
| `released_at` | `DATETIME` | YES | NULL | Timestamp hold was formally lifted. |
| `created_at` | `TIMESTAMP` | YES | NULL | Hold creation timestamp. |

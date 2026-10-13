# 15. DeliverOps Database Data Dictionary

## Overview
- **Database Engine**: MySQL 8.0 InnoDB
- **Character Set**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`
- **Primary Key Standard**: `CHAR(26)` Universally Unique Lexicographically Sortable Identifiers (ULID)

---

## 1. Table: `users`
Stores user identity accounts, professional capacity metrics, and authentication credentials.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `name` | `VARCHAR(255)` | NO | None | Full legal display name of user. |
| `email` | `VARCHAR(255)` | NO | None | Primary email address. |
| `active_email` | `VARCHAR(255)` | YES | NULL | Virtual column: `IF(deleted_at IS NULL, email, NULL)` with UNIQUE index. |
| `password` | `VARCHAR(255)` | NO | None | Bcrypt hashed password. |
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

## 2. Table: `projects`
Stores project workspace metadata, configuration options, baseline locks, and lifecycle states.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `name` | `VARCHAR(255)` | NO | None | Project commercial title. |
| `code` | `VARCHAR(50)` | NO | None | Unique project identifier code (e.g. `PRJ-AUTO`). |
| `description` | `TEXT` | YES | NULL | Detailed project scope summary. |
| `client_name` | `VARCHAR(255)` | YES | NULL | External client organization or sponsor. |
| `project_type` | `ENUM('client','internal','unclassified')` | NO | `'unclassified'`| Business classification. |
| `project_manager_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `users.id`. |
| `config` | `JSON` | NO | None | Settings object: `weekendDays`, `holidays`, `durationMode`, etc. |
| `has_locked_baseline`| `TINYINT(1)` | NO | `0` | Flag indicating an active frozen baseline. |
| `baseline_locked_at` | `DATETIME` | YES | NULL | Timestamp of most recent baseline lock. |
| `active_baseline_version`| `INT UNSIGNED` | NO | `0` | Active version number in `baseline_versions`. |
| `target_launch_date` | `DATE` | YES | NULL | Contractual completion date for negative float analysis. |
| `tree_version` | `INT UNSIGNED` | NO | `1` | Optimistic concurrency control lock. |
| `is_archived` | `TINYINT(1)` | NO | `0` | Soft-archive flag. |
| `archived_at` | `TIMESTAMP` | YES | NULL | Timestamp of archival. |
| `created_at` | `TIMESTAMP` | YES | NULL | Project creation timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Project update timestamp. |
| `deleted_at` | `TIMESTAMP` | YES | NULL | Soft-deletion timestamp. |

---

## 3. Table: `baseline_versions`
Stores immutable historical snapshots of project baselines across project revisions.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `project_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `projects.id`. |
| `version_number` | `INT UNSIGNED` | NO | None | Sequential version number ($1, 2, 3\dots$). |
| `name` | `VARCHAR(100)` | NO | None | Baseline title (e.g., "Initial Contract Baseline"). |
| `description` | `TEXT` | YES | NULL | Reason for baseline lock or change order note. |
| `locked_by_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `users.id` (PM or Admin who locked it). |
| `snapshot_data` | `JSON` | NO | None | Complete frozen array of task dates at lock time. |
| `is_active` | `TINYINT(1)` | NO | `0` | Whether this version is the currently evaluated baseline. |
| `created_at` | `TIMESTAMP` | NO | None | Creation timestamp. |

---

## 4. Table: `tasks`
Stores Work Breakdown Structure tasks, execution progress, schedule dates, and review states.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `project_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `projects.id`. |
| `parent_id` | `CHAR(26)` | YES | NULL | Foreign Key $\to$ `tasks.id` (WBS parent node). |
| `wbs_code` | `VARCHAR(50)` | NO | None | Hierarchical decimal code (e.g., `1.2.1`). |
| `name` | `VARCHAR(255)` | NO | None | Task title. |
| `description` | `TEXT` | YES | NULL | Scope and acceptance criteria. |
| `category` | `VARCHAR(50)` | NO | `'general'` | Functional category (e.g. `electrical`, `software`). |
| `priority` | `ENUM('Low','Medium','High','Urgent')` | NO | `'Medium'` | Operational priority. |
| `start_date` | `DATE` | NO | None | Scheduled start date. |
| `end_date` | `DATE` | NO | None | Scheduled finish date. |
| `baseline_start_date`| `DATE` | YES | NULL | Frozen start date from active baseline. |
| `baseline_end_date` | `DATE` | YES | NULL | Frozen finish date from active baseline. |
| `pct` | `UNSIGNED TINYINT`| NO | `0` | Progress percentage ($0..100$). |
| `is_milestone` | `TINYINT(1)` | NO | `0` | Zero-duration milestone event flag. |
| `is_summary` | `TINYINT(1)` | NO | `0` | Synthetic summary task container flag. |
| `status` | `ENUM(...)` | NO | `'Not Started'`| Lifecycle state: `Not Started`, `In Progress`, `In Review`, `Blocked`, `Completed`. |
| `review_status` | `ENUM(...)` | NO | `'none'` | Review state: `none`, `pending_review`, `approved`, `changes_requested`. |
| `order_index` | `INT UNSIGNED` | NO | `0` | Linear sequence position among siblings. |
| `primary_owner_id` | `CHAR(26)` | YES | NULL | Foreign Key $\to$ `users.id` (Lead assignee). |
| `primary_owner_hours`| `DECIMAL(7,2)`| YES | NULL | Hours allocated directly to primary owner. |
| `reviewer_id` | `CHAR(26)` | YES | NULL | Foreign Key $\to$ `users.id` (Designated peer reviewer). |
| `submitted_by_id` | `CHAR(26)` | YES | NULL | Foreign Key $\to$ `users.id` (Actor who requested review). |
| `blocking_risk_id` | `CHAR(26)` | YES | NULL | Foreign Key $\to$ `project_risks.id` (Active blocker). |
| `block_reason` | `TEXT` | YES | NULL | Reason for block, formatted with pre-blocked state token. |
| `review_note` | `TEXT` | YES | NULL | Latest review decision or changes requested note. |
| `estimated_hours` | `DECIMAL(7,2)` | YES | NULL | Total planned task effort. |
| `logged_hours` | `DECIMAL(7,2)` | NO | `0.00` | Actual hours spent. |
| `lock_version` | `INT UNSIGNED` | NO | `1` | Optimistic concurrency lock. |
| `created_at` | `TIMESTAMP` | YES | NULL | Creation timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Last modification timestamp. |

---

## 5. Table: `task_dependencies`
Stores Directed Acyclic Graph (DAG) dependency edges between predecessor and successor tasks.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `project_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `projects.id`. |
| `task_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `tasks.id` (Successor task). |
| `predecessor_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `tasks.id` (Predecessor task). |
| `dependency_type` | `ENUM(...)` | NO | `'finish_to_start'` | Type: `finish_to_start`, `start_to_start`, `finish_to_finish`. |
| `lag_days` | `INT` | NO | `0` | Lead (negative) or lag (positive) working days. |
| `created_at` | `TIMESTAMP` | YES | NULL | Creation timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Update timestamp. |

---

## 6. Table: `task_effort_allocations`
Stores multi-contributor effort distributions across tasks and calendar weeks.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `task_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `tasks.id`. |
| `user_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `users.id` (Contributing member). |
| `allocated_hours` | `DECIMAL(7,2)` | NO | `0.00` | Allocated hours for work item. |
| `week_number` | `UNSIGNED TINYINT` | YES | NULL | ISO calendar week number ($1..53$). |
| `year` | `UNSIGNED SMALLINT`| YES | NULL | Calendar year ($2026\dots$). |
| `lock_version` | `INT UNSIGNED` | NO | `1` | Optimistic concurrency version. |
| `created_at` | `TIMESTAMP` | YES | NULL | Creation timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Update timestamp. |

---

## 7. Table: `project_risks`
Stores project risks, assumptions, and issues scored by likelihood and impact.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `project_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `projects.id`. |
| `title` | `VARCHAR(255)` | NO | None | Short risk headline. |
| `description` | `TEXT` | NO | None | Root cause and potential consequence. |
| `type` | `ENUM(...)` | NO | `'risk'` | Type: `risk`, `issue`, `dependency`, `assumption`. |
| `severity` | `ENUM(...)` | NO | `'medium'` | Score tier: `low`, `medium`, `high`, `critical`. |
| `likelihood` | `ENUM(...)` | NO | `'medium'` | Rating: `low` (1), `medium` (2), `high` (3). |
| `impact` | `ENUM(...)` | NO | `'medium'` | Rating: `low` (1), `medium` (2), `high` (3). |
| `status` | `ENUM(...)` | NO | `'open'` | Lifecycle state: `open`, `mitigating`, `mitigated`, `resolved`, `closed`. |
| `mitigation_plan` | `TEXT` | NO | None | Actions taken to manage or eliminate the risk. |
| `owner_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `users.id` (Responsible manager). |
| `identified_date` | `DATE` | NO | None | Date first raised. |
| `due_date` | `DATE` | NO | None | Target resolution or mitigation date. |
| `created_at` | `TIMESTAMP` | YES | NULL | Creation timestamp. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Update timestamp. |

---

## 8. Table: `risk_task_blockers`
Pivot table supporting multi-blocker relationships between risks and WBS tasks.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `risk_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `project_risks.id`. |
| `task_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `tasks.id`. |
| `created_at` | `TIMESTAMP` | NO | None | Link creation timestamp. |

---

## 9. Table: `task_comments`
Stores chronological discussion entries and feedback on tasks.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `task_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `tasks.id`. |
| `user_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `users.id` (Author). |
| `content` | `TEXT` | NO | None | Markdown commentary text. |
| `created_at` | `TIMESTAMP` | YES | NULL | Timestamp posted. |
| `updated_at` | `TIMESTAMP` | YES | NULL | Timestamp edited. |

---

## 10. Table: `audit_logs`
Stores non-cascading, immutable polymorphic compliance trails.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `auditable_type` | `VARCHAR(255)` | NO | None | Polymorphic entity class (`App\Models\Task`, etc.). |
| `auditable_id` | `CHAR(26)` | NO | None | ULID of modified entity. |
| `project_id` | `CHAR(26)` | YES | NULL | Project ULID (nullable for global events). |
| `action` | `VARCHAR(100)` | NO | None | Event verb (`task.review_approved`, etc.). |
| `actor_id` | `CHAR(26)` | YES | NULL | ULID of user who performed the action. |
| `old_values` | `JSON` | YES | NULL | Delta snapshot before mutation. |
| `new_values` | `JSON` | YES | NULL | Delta snapshot after mutation. |
| `reason` | `VARCHAR(255)` | YES | NULL | Optional explanatory justification. |
| `created_at` | `TIMESTAMP` | NO | None | Tamper-evident creation timestamp. |

---

## 11. Table: `idempotency_keys`
Stores client request deduplication hashes and cached HTTP responses.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `CHAR(26)` | NO | None | Primary Key (ULID). |
| `user_id` | `CHAR(26)` | NO | None | Foreign Key $\to$ `users.id`. |
| `idempotency_key` | `VARCHAR(255)` | NO | None | Unique string supplied in `X-Idempotency-Key` header. |
| `request_hash` | `CHAR(64)` | NO | None | SHA-256 hash of the JSON payload. |
| `response_code` | `INT` | NO | None | Cached HTTP status code ($200, 201$). |
| `response_body` | `JSON` | NO | None | Cached response body returned on matching key. |
| `created_at` | `TIMESTAMP` | NO | None | Creation timestamp. |
| `expires_at` | `TIMESTAMP` | NO | None | Expiration timestamp ($24\text{ hours}$ sliding TTL). |

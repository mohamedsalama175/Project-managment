# 05. Backend Architecture & Scheduling Engine

## 1. Modular Monolith (Modulith) Architecture

The **DeliverOps** backend is architected as an explicit **Modular Monolith (Modulith)** in Laravel 12 running on PHP 8.2+ and MySQL 8.0 InnoDB.

Every bounded context is isolated as an autonomous module under [`backend/app/Modules/`](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/backend/app/Modules) with its own **Controllers**, **Services**, **Form Requests**, **API Resources**, and **Policies**.

```
backend/app/Modules/
├── Identity/          # Authentication, Users, Roles, Permissions & Spatie RBAC
├── Projects/          # Project lifecycle, rosters, config schema, multi-baselines
├── Scheduling/        # Mathematical CPM Engine (DAG topological sort, SS/FF/FS, Lags, Float)
├── Tasks/             # WBS hierarchy, effort-weighted rollups, linear reordering
├── Risks/             # Risk register, 3x3 scoring matrix, multi-blocker task linking
├── Baselines/         # Multi-baseline versioning, lock snapshots, variance calculation
├── Collaboration/     # Review workflows (anti-self-approval) & threaded discussions
└── Audit/             # Immutable polymorphic audit logs & 5-pass idempotent import/export
```

### Module Boundary Rules:
1. **Isolated Service Layer**: Inter-module interactions take place strictly through injected service interfaces or domain events, never through cross-boundary model mutations.
2. **Transaction Boundaries**: State transitions (e.g., risk resolution unblocking tasks, review sign-offs, baseline locks) execute within atomic `DB::transaction()` blocks.
3. **Service-Level Invariants**: Security invariants (anti-self-approval, self-deletion, last-admin lock) reside in domain services so they cannot be bypassed by `Gate::before()` admin overrides.

---

## 2. Complete Database DDL & Schema Architecture (MySQL 8.0 InnoDB)

All primary keys are `CHAR(26)` **ULIDs**. All foreign keys are indexed. Character set is `utf8mb4` with collation `utf8mb4_unicode_ci`.

```sql
-- =============================================================================
-- 1. IDENTITY & RBAC DOMAIN
-- =============================================================================

CREATE TABLE `users` (
  `id` CHAR(26) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `active_email` VARCHAR(255) GENERATED ALWAYS AS (IF(`deleted_at` IS NULL, `email`, NULL)) VIRTUAL,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `avatar_path` VARCHAR(255) NULL,
  `job_title` VARCHAR(150) NOT NULL DEFAULT 'Team Member',
  `department` VARCHAR(100) NOT NULL DEFAULT 'Engineering',
  `skills` JSON NULL,
  `weekly_capacity_hours` DECIMAL(5,2) NOT NULL DEFAULT 40.00,
  `status` ENUM('active', 'on_leave', 'inactive') NOT NULL DEFAULT 'active',
  `color` VARCHAR(7) NOT NULL DEFAULT '#1f8a70',
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `email_verified_at` TIMESTAMP NULL,
  `remember_token` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_active_email_unique` (`active_email`),
  KEY `users_department_status_idx` (`department`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Spatie RBAC Tables with CHAR(26) ULIDs
CREATE TABLE `permissions` (
  `id` CHAR(26) NOT NULL,
  `name` VARCHAR(125) NOT NULL,
  `guard_name` VARCHAR(50) NOT NULL DEFAULT 'web',
  `group_name` VARCHAR(50) NOT NULL DEFAULT 'general',
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_guard_unique` (`name`, `guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` CHAR(26) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `guard_name` VARCHAR(50) NOT NULL DEFAULT 'web',
  `display_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_guard_unique` (`name`, `guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `model_has_permissions` (
  `permission_id` CHAR(26) NOT NULL,
  `model_type` VARCHAR(255) NOT NULL,
  `model_id` CHAR(26) NOT NULL,
  PRIMARY KEY (`permission_id`, `model_id`, `model_type`),
  KEY `model_has_permissions_model_idx` (`model_id`, `model_type`),
  CONSTRAINT `fk_mhp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `model_has_roles` (
  `role_id` CHAR(26) NOT NULL,
  `model_type` VARCHAR(255) NOT NULL,
  `model_id` CHAR(26) NOT NULL,
  PRIMARY KEY (`role_id`, `model_id`, `model_type`),
  KEY `model_has_roles_model_idx` (`model_id`, `model_type`),
  CONSTRAINT `fk_mhr_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_has_permissions` (
  `permission_id` CHAR(26) NOT NULL,
  `role_id` CHAR(26) NOT NULL,
  PRIMARY KEY (`permission_id`, `role_id`),
  KEY `role_has_permissions_role_idx` (`role_id`),
  CONSTRAINT `fk_rhp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rhp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. PROJECTS & BASELINES DOMAIN
-- =============================================================================

CREATE TABLE `projects` (
  `id` CHAR(26) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  `client_name` VARCHAR(255) NULL,
  `project_type` ENUM('client', 'internal', 'unclassified') NOT NULL DEFAULT 'unclassified',
  `project_manager_id` CHAR(26) NOT NULL,
  `config` JSON NOT NULL,
  `has_locked_baseline` TINYINT(1) NOT NULL DEFAULT 0,
  `baseline_locked_at` DATETIME NULL,
  `active_baseline_version` INT UNSIGNED NOT NULL DEFAULT 0,
  `target_launch_date` DATE NULL,
  `tree_version` INT UNSIGNED NOT NULL DEFAULT 1,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  `archived_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `projects_code_unique` (`code`),
  KEY `projects_pm_idx` (`project_manager_id`),
  KEY `projects_status_idx` (`is_archived`, `deleted_at`),
  CONSTRAINT `fk_projects_pm` FOREIGN KEY (`project_manager_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `project_user` (
  `id` CHAR(26) NOT NULL,
  `project_id` CHAR(26) NOT NULL,
  `user_id` CHAR(26) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'contributor',
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_user_unique` (`project_id`, `user_id`),
  KEY `project_user_user_idx` (`user_id`),
  CONSTRAINT `fk_pu_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `baseline_versions` (
  `id` CHAR(26) NOT NULL,
  `project_id` CHAR(26) NOT NULL,
  `version_number` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `locked_by_id` CHAR(26) NOT NULL,
  `snapshot_data` JSON NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `baseline_project_version_unique` (`project_id`, `version_number`),
  KEY `baseline_project_active_idx` (`project_id`, `is_active`),
  CONSTRAINT `fk_bv_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bv_user` FOREIGN KEY (`locked_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. TASKS & WBS DOMAIN
-- =============================================================================

CREATE TABLE `tasks` (
  `id` CHAR(26) NOT NULL,
  `project_id` CHAR(26) NOT NULL,
  `parent_id` CHAR(26) NULL,
  `wbs_code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'general',
  `priority` ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `baseline_start_date` DATE NULL,
  `baseline_end_date` DATE NULL,
  `pct` UNSIGNED TINYINT NOT NULL DEFAULT 0,
  `is_milestone` TINYINT(1) NOT NULL DEFAULT 0,
  `is_summary` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('Not Started', 'In Progress', 'In Review', 'Blocked', 'Completed') NOT NULL DEFAULT 'Not Started',
  `review_status` ENUM('none', 'pending_review', 'approved', 'changes_requested') NOT NULL DEFAULT 'none',
  `order_index` INT UNSIGNED NOT NULL DEFAULT 0,
  `primary_owner_id` CHAR(26) NULL,
  `primary_owner_hours` DECIMAL(7,2) NULL,
  `reviewer_id` CHAR(26) NULL,
  `submitted_by_id` CHAR(26) NULL,
  `blocking_risk_id` CHAR(26) NULL,
  `block_reason` TEXT NULL,
  `review_note` TEXT NULL,
  `estimated_hours` DECIMAL(7,2) NULL,
  `logged_hours` DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  `lock_version` INT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tasks_project_id_unique` (`project_id`, `id`),
  KEY `tasks_project_order_idx` (`project_id`, `order_index`),
  KEY `tasks_parent_idx` (`parent_id`),
  KEY `tasks_owner_idx` (`primary_owner_id`),
  KEY `tasks_status_idx` (`project_id`, `status`),
  CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_parent` FOREIGN KEY (`parent_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_owner` FOREIGN KEY (`primary_owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_submitter` FOREIGN KEY (`submitted_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_dependencies` (
  `id` CHAR(26) NOT NULL,
  `project_id` CHAR(26) NOT NULL,
  `task_id` CHAR(26) NOT NULL,
  `predecessor_id` CHAR(26) NOT NULL,
  `dependency_type` ENUM('finish_to_start', 'start_to_start', 'finish_to_finish') NOT NULL DEFAULT 'finish_to_start',
  `lag_days` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_dep_unique` (`task_id`, `predecessor_id`),
  KEY `task_dep_pred_idx` (`predecessor_id`),
  KEY `task_dep_project_idx` (`project_id`),
  CONSTRAINT `fk_td_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_td_pred` FOREIGN KEY (`predecessor_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_td_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_effort_allocations` (
  `id` CHAR(26) NOT NULL,
  `task_id` CHAR(26) NOT NULL,
  `user_id` CHAR(26) NOT NULL,
  `allocated_hours` DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  `week_number` UNSIGNED TINYINT NULL,
  `year` UNSIGNED SMALLINT NULL,
  `lock_version` INT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tea_task_user_week_unique` (`task_id`, `user_id`, `year`, `week_number`),
  KEY `tea_user_task_idx` (`user_id`, `task_id`),
  CONSTRAINT `fk_tea_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tea_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_comments` (
  `id` CHAR(26) NOT NULL,
  `task_id` CHAR(26) NOT NULL,
  `user_id` CHAR(26) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `task_comments_task_idx` (`task_id`, `created_at`),
  KEY `task_comments_user_idx` (`user_id`),
  CONSTRAINT `fk_tc_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. RISKS & BLOCKERS DOMAIN
-- =============================================================================

CREATE TABLE `project_risks` (
  `id` CHAR(26) NOT NULL,
  `project_id` CHAR(26) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `type` ENUM('risk', 'issue', 'dependency', 'assumption') NOT NULL DEFAULT 'risk',
  `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  `likelihood` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  `impact` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  `status` ENUM('open', 'mitigating', 'mitigated', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  `mitigation_plan` TEXT NOT NULL,
  `owner_id` CHAR(26) NOT NULL,
  `identified_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `risks_project_status_idx` (`project_id`, `status`),
  KEY `risks_owner_idx` (`owner_id`),
  CONSTRAINT `fk_risks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_risks_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `risk_task_blockers` (
  `id` CHAR(26) NOT NULL,
  `risk_id` CHAR(26) NOT NULL,
  `task_id` CHAR(26) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `risk_task_unique` (`risk_id`, `task_id`),
  KEY `rtb_task_idx` (`task_id`),
  CONSTRAINT `fk_rtb_risk` FOREIGN KEY (`risk_id`) REFERENCES `project_risks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rtb_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. ATTACHMENTS, NOTIFICATIONS, AUDIT & IDEMPOTENCY
-- =============================================================================

CREATE TABLE `attachments` (
  `id` CHAR(26) NOT NULL,
  `attachable_type` VARCHAR(255) NOT NULL,
  `attachable_id` CHAR(26) NOT NULL,
  `uploaded_by_id` CHAR(26) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_size_bytes` UNSIGNED INT NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `attachments_attachable_idx` (`attachable_type`, `attachable_id`),
  CONSTRAINT `fk_attachments_user` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` CHAR(26) NOT NULL,
  `user_id` CHAR(26) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `action_url` VARCHAR(500) NULL,
  `read_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_unread_idx` (`user_id`, `read_at`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` CHAR(26) NOT NULL,
  `auditable_type` VARCHAR(255) NOT NULL,
  `auditable_id` CHAR(26) NOT NULL,
  `project_id` CHAR(26) NULL,
  `action` VARCHAR(100) NOT NULL,
  `actor_id` CHAR(26) NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `reason` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_entity_idx` (`auditable_type`, `auditable_id`),
  KEY `audit_project_idx` (`project_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `idempotency_keys` (
  `id` CHAR(26) NOT NULL,
  `user_id` CHAR(26) NOT NULL,
  `idempotency_key` VARCHAR(255) NOT NULL,
  `request_hash` CHAR(64) NOT NULL,
  `response_code` INT NOT NULL,
  `response_body` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idempotency_user_key_unique` (`user_id`, `idempotency_key`),
  KEY `idempotency_expires_idx` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Mathematical CPM Engine & Multi-Dependency Math

The CPM Scheduling Engine supports **Finish-to-Start (FS)**, **Start-to-Start (SS)**, and **Finish-to-Finish (FF)** dependency relationships with positive or negative `lag_days`.

### 3.1 Mathematical Definitions

Let $P$ be a predecessor task and $S$ be a successor task. Duration $D \ge 1$ working days.

#### 1. Forward Pass (Early Dates):
- **Finish-to-Start ($FS$) with Lag ($L$)**:
  $$ES_S = \max \left( ES_S, \text{addWorkDays}(\text{nextWorkDay}(EF_P, \text{strictlyAfter}=\text{true}), L) \right)$$
  $$EF_S = \text{addWorkDays}(ES_S, D_S - 1)$$
- **Start-to-Start ($SS$) with Lag ($L$)**:
  $$ES_S = \max \left( ES_S, \text{addWorkDays}(ES_P, L) \right)$$
  $$EF_S = \text{addWorkDays}(ES_S, D_S - 1)$$
- **Finish-to-Finish ($FF$) with Lag ($L$)**:
  $$EF_S = \max \left( EF_S, \text{addWorkDays}(EF_P, L) \right)$$
  $$ES_S = \text{subWorkDays}(EF_S, D_S - 1)$$

#### 2. Backward Pass (Late Dates):
Let $ProjectFinish = \max_{t} (EF_t)$ or the project's contractual `target_launch_date`.
- **Finish-to-Start ($FS$) with Lag ($L$)**:
  $$LF_P = \min \left( LF_P, \text{subWorkDays}(\text{prevWorkDay}(LS_S, \text{strictlyBefore}=\text{true}), L) \right)$$
  $$LS_P = \text{subWorkDays}(LF_P, D_P - 1)$$
- **Start-to-Start ($SS$) with Lag ($L$)**:
  $$LS_P = \min \left( LS_P, \text{subWorkDays}(LS_S, L) \right)$$
  $$LF_P = \text{addWorkDays}(LS_P, D_P - 1)$$
- **Finish-to-Finish ($FF$) with Lag ($L$)**:
  $$LF_P = \min \left( LF_P, \text{subWorkDays}(LF_S, L) \right)$$
  $$LS_P = \text{subWorkDays}(LF_P, D_P - 1)$$

#### 3. Summary & Milestone Treatment:
- **Milestones ($D = 0$)**: Early Start $\equiv$ Early Finish. Lags propagate directly.
- **Summary Tasks**: Excluded from dependency DAG edges directly. A summary task's $ES = \min_{c \in \text{children}}(ES_c)$ and $EF = \max_{c \in \text{children}}(EF_c)$. Summary float is the minimum float of its children.

#### 4. Total Float & Negative Float:
- **Total Float ($TF$)**: $TF = LS - ES = LF - EF$.
- **Negative Float ($TF < 0$)**: Occurs when a fixed `target_launch_date` is earlier than the forward-pass $ProjectFinish$, indicating the project is mathematically in breach of contract.
- **Critical Path**: Every task where $TF \le \min_{t}(TF_t)$ (or $TF \le 0$ when no target date constraint is violated).

---

## 4. Multi-Blocker Governance & State Restoration

When multiple risks link to a single task via `risk_task_blockers`:
1. **Transition to Blocked**:
   - The task's status prior to blockage (`Not Started`, `In Progress`, or `In Review`) is preserved in `block_reason` formatted as: `PREV_STATUS||Risk Title`.
   - Task `status` transitions to `Blocked`.
2. **Resolution & Unblocking Condition**:
   - When a risk transitions to `mitigated`, `resolved`, or `closed`, DeliverOps queries all remaining active blockers for the task:
     ```php
     $remainingActiveBlockers = RiskTaskBlocker::where('task_id', $task->id)
         ->whereHas('risk', fn ($q) => $q->whereIn('status', ['open', 'mitigating']))
         ->count();
     ```
   - **If $remainingActiveBlockers = 0$**: The task is restored to its exact pre-blocked state (`Not Started` vs `In Progress`), `blocking_risk_id` is set to `null`, and `block_reason` is cleared.
   - **If $remainingActiveBlockers > 0$**: The task remains `Blocked`, and `blocking_risk_id` is re-pointed to the next highest severity active risk.
   - **CPM Trigger**: `CpmSchedulingService::calculateCriticalPath($project)` executes automatically upon any blocker change.

---

## 5. Security & Invariant Hierarchy

```
┌────────────────────────────────────────────────────────┐
│                   INVARIANT LEVEL                      │
├─────────────────────────┬──────────────────────────────┤
│ 1. Service Layer Invariant │ Unbypasable (No Gate Bypass)  │
│    - Anti-Self-Approval    │ Checked inside Service Method│
│    - Self-Deletion Guard   │ Throws 422 Exception         │
│    - Last Admin Lock       │ Wrapped in DB Transaction    │
├─────────────────────────┼──────────────────────────────┤
│ 2. Policy Layer Gate    │ Bypassed by Admin Role       │
│    - $user->can(...)    │ Gate::before returns true    │
│    - Project membership │ Used for standard authorization│
└─────────────────────────┴──────────────────────────────┘
```

1. **Anti-Self-Approval Review Guard**:
   In `ReviewWorkflowService::approveReview()`:
   ```php
   $isOwner = $task->primary_owner_id === $reviewer->id;
   $isSubmitter = $task->submitted_by_id === $reviewer->id;
   $isContributor = $task->effortAllocations()->where('user_id', $reviewer->id)->exists();

   if (($isOwner || $isSubmitter || $isContributor) && !$reviewer->hasRole('admin')) {
       throw ValidationException::withMessages([
           'reviewer' => ['Governance Violation: The task submitter, primary owner, and contributing members cannot approve their own deliverable review.'],
       ]);
   }
   ```
2. **Self-Deletion Guard**:
   In `UserService::deleteUser()`:
   ```php
   if ($target->id === $actor->id) {
       throw ValidationException::withMessages([
           'user' => ['You cannot delete your own account.'],
       ]);
   }
   ```
3. **Last Active Administrator Lock**:
   In `UserService::ensureNotLastActiveAdmin()`:
   ```php
   $activeAdminCount = User::role('admin')
       ->where('status', 'active')
       ->where('id', '!=', $user->id)
       ->count();
   if ($activeAdminCount === 0) {
       throw ValidationException::withMessages([
           'user' => ['Cannot modify or delete the last active administrator in the system.'],
       ]);
   }
   ```

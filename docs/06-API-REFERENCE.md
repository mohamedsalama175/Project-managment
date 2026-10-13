# 06. DeliverOps Complete REST API Reference (All 47 Endpoints)

## 1. Global API Standards & Conventions

- **Base URL**: `http://127.0.0.1:8000/api/v1`
- **Protocol**: HTTP/1.1 or HTTP/2 over TLS
- **Data Exchange**: All request payloads and response bodies use strict `application/json; charset=UTF-8`.
- **Primary Keys**: All IDs are 26-character time-sortable **ULIDs** (`CHAR(26)`).
- **Global Headers**:
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer {sanctum_personal_access_token}
  ```
- **Idempotency Header** (Used for `POST /projects/import`):
  ```http
  X-Idempotency-Key: {unique_client_generated_ulid_or_uuid}
  ```
  - **TTL**: 24 hours.
  - **Scope**: User-scoped (`user_id` + `idempotency_key`).
  - **Behavior**: If request payload hash matches, returns cached response with identical status code. If hash differs, returns `409 Conflict`.
- **Standard Error Schema**:
  ```json
  {
    "message": "Human-readable error explanation",
    "code": "ERROR_CONSTANT_STRING",
    "errors": {
      "field_name": ["Specific validation error message"]
    }
  }
  ```

---

## 2. Complete Inventory of All 47 Endpoints

| # | HTTP Method | Path | Controller Action | Domain Module |
| :-: | :--- | :--- | :--- | :--- |
| **1** | `POST` | `/auth/login` | `AuthController@login` | Identity |
| **2** | `POST` | `/auth/logout` | `AuthController@logout` | Identity |
| **3** | `GET` | `/auth/me` | `AuthController@me` | Identity |
| **4** | `POST` | `/auth/password/change` | `AuthController@changePassword` | Identity |
| **5** | `GET` | `/users` | `UserController@index` | Identity |
| **6** | `POST` | `/users` | `UserController@store` | Identity |
| **7** | `GET` | `/users/{id}` | `UserController@show` | Identity |
| **8** | `PUT` | `/users/{id}` | `UserController@update` | Identity |
| **9** | `DELETE` | `/users/{id}` | `UserController@destroy` | Identity |
| **10** | `GET` | `/permissions` | `RolePermissionController@permissionsList` | Identity |
| **11** | `GET` | `/roles` | `RolePermissionController@index` | Identity |
| **12** | `POST` | `/roles` | `RolePermissionController@store` | Identity |
| **13** | `PUT` | `/roles/{id}` | `RolePermissionController@update` | Identity |
| **14** | `DELETE` | `/roles/{id}` | `RolePermissionController@destroy` | Identity |
| **15** | `GET` | `/projects` | `ProjectController@index` | Projects |
| **16** | `POST` | `/projects` | `ProjectController@store` | Projects |
| **17** | `GET` | `/projects/{id}` | `ProjectController@show` | Projects |
| **18** | `PUT` | `/projects/{id}` | `ProjectController@update` | Projects |
| **19** | `DELETE` | `/projects/{id}` | `ProjectController@destroy` | Projects |
| **20** | `POST` | `/projects/{id}/restore` | `ProjectController@restore` | Projects |
| **21** | `POST` | `/projects/{id}/members` | `ProjectController@addMember` | Projects |
| **22** | `DELETE` | `/projects/{id}/members/{user_id}` | `ProjectController@removeMember` | Projects |
| **23** | `GET` | `/projects/{id}/tasks` | `TaskController@index` | Tasks |
| **24** | `POST` | `/projects/{id}/tasks` | `TaskController@store` | Tasks |
| **25** | `GET` | `/projects/{id}/tasks/{taskId}` | `TaskController@show` | Tasks |
| **26** | `PUT` | `/projects/{id}/tasks/{taskId}` | `TaskController@update` | Tasks |
| **27** | `DELETE` | `/projects/{id}/tasks/{taskId}` | `TaskController@destroy` | Tasks |
| **28** | `POST` | `/projects/{id}/tasks/reorder` | `TaskController@reorder` | Tasks |
| **29** | `GET` | `/projects/{id}/critical-path` | `TaskController@criticalPath` | Tasks / Scheduling |
| **30** | `GET` | `/projects/{id}/risks` | `ProjectRiskController@index` | Risks |
| **31** | `POST` | `/projects/{id}/risks` | `ProjectRiskController@store` | Risks |
| **32** | `GET` | `/projects/{id}/risks/{riskId}` | `ProjectRiskController@show` | Risks |
| **33** | `PUT` | `/projects/{id}/risks/{riskId}` | `ProjectRiskController@update` | Risks |
| **34** | `DELETE` | `/projects/{id}/risks/{riskId}` | `ProjectRiskController@destroy` | Risks |
| **35** | `POST` | `/projects/{id}/baselines/lock` | `BaselineController@lock` | Baselines |
| **36** | `POST` | `/projects/{id}/baselines/clear` | `BaselineController@clear` | Baselines |
| **37** | `GET` | `/projects/{id}/baselines/variance` | `BaselineController@variance` | Baselines |
| **38** | `POST` | `/projects/{id}/tasks/{taskId}/review/request` | `TaskReviewController@requestReview` | Collaboration |
| **39** | `POST` | `/projects/{id}/tasks/{taskId}/review/approve` | `TaskReviewController@approve` | Collaboration |
| **40** | `POST` | `/projects/{id}/tasks/{taskId}/review/reject` | `TaskReviewController@reject` | Collaboration |
| **41** | `GET` | `/projects/{id}/tasks/{taskId}/comments` | `TaskCommentController@index` | Collaboration |
| **42** | `POST` | `/projects/{id}/tasks/{taskId}/comments` | `TaskCommentController@store` | Collaboration |
| **43** | `DELETE` | `/projects/{id}/tasks/{taskId}/comments/{commentId}`| `TaskCommentController@destroy`| Collaboration |
| **44** | `GET` | `/projects/{id}/audit` | `AuditLogController@projectLogs` | Audit |
| **45** | `GET` | `/audit/global` | `AuditLogController@globalLogs` | Audit |
| **46** | `GET` | `/projects/{id}/export` | `ImportExportController@export` | Audit / Migration |
| **47** | `POST` | `/projects/import` | `ImportExportController@import` | Audit / Migration |

---

## 3. Detailed Specifications by Domain

### 3.1 Authentication & Session Domain

#### `POST /auth/login`
- **Rate Limit**: 5 attempts per minute per email + IP (`AUTH_THROTTLED`).
- **Request Body**:
  ```json
  {
    "email": "admin@deliverops.com",
    "password": "AdminPassword2026!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "8|MnzypdyUhPpvMGvs6CB3XmEH5X0U1NYj6YDYuraVa46a4e0c",
    "user": {
      "id": "01m4rc2nbjem909ckfs3093xqy",
      "name": "DeliverOps Super Admin",
      "email": "admin@deliverops.com",
      "jobTitle": "System Architect",
      "department": "Executive",
      "weeklyCapacityHours": 40.0,
      "roles": ["admin"],
      "primaryRole": "admin"
    },
    "permissions": ["users.view", "users.create", "projects.view", "tasks.create"]
  }
  ```
- **Errors**: `401 Unauthorized` (credentials mismatch), `403 Forbidden` (`ACCOUNT_INACTIVE`), `429 Too Many Requests` (`AUTH_THROTTLED`).

#### `GET /auth/me`
- **Response (200 OK)**: Returns authenticated user profile, permissions array, and active workload summary.

#### `POST /auth/logout`
- **Response (200 OK)**: `{"message": "Logged out successfully."}`

#### `POST /auth/password/change`
- **Request Body**: `current_password`, `new_password`, `new_password_confirmation`.
- **Response (200 OK)**: `{"message": "Password updated successfully."}`

---

### 3.2 Identity & Users Domain

#### `GET /users`
- **Permission**: `users.view`
- **Query Parameters**:
  - `search` (string): Filters across name, email, department, job title.
  - `department` (string): Exact department match.
  - `status` (`active` | `on_leave` | `inactive`).
  - `role` (string): Spatie role name.
  - `page` (int, default: 1), `per_page` (int, default: 25).
- **Response (200 OK)**: Paginated `UserResource` collection with pagination metadata.

#### `POST /users`
- **Permission**: `users.create`
- **Invariants**: Anti-escalation: non-admins cannot assign roles they do not hold.
- **Request Body**:
  ```json
  {
    "name": "Samir Naguib",
    "email": "samir.naguib@deliverops.local",
    "password": "InitialPassword123!",
    "job_title": "Field Integration Lead",
    "department": "Engineering",
    "weekly_capacity_hours": 40,
    "status": "active",
    "roles": ["project_manager"],
    "skills": ["PLC", "SCADA", "Safety Systems"]
  }
  ```
- **Response (201 Created)**: Created `UserResource`.

#### `PUT /users/{id}`
- **Permission**: `users.edit`
- **Invariants**: Cannot deactivate or revoke admin role from the system's last active admin.
- **Response (200 OK)**: Updated `UserResource`.

#### `DELETE /users/{id}`
- **Permission**: `users.delete`
- **Invariants**:
  1. Cannot self-delete (`HTTP 422`).
  2. Cannot delete the last active administrator (`HTTP 422`).
  3. Cannot delete if actively assigned as PM of non-archived projects (`HTTP 422`).
- **Response (200 OK)**: `{"message": "User deleted successfully."}`

---

### 3.3 Roles & Permissions Domain

- `GET /permissions`: Returns grouped permissions matrix.
- `GET /roles`: Lists all roles with assigned user counts.
- `POST /roles`: Creates custom role (`name`, `display_name`, `description`, `permissions`).
- `PUT /roles/{id}`: Updates custom role. System role names cannot be altered.
- `DELETE /roles/{id}`: Deletes custom role. System roles (`is_system = true`) and roles with active assigned users return `HTTP 422`.

---

### 3.4 Projects Domain

#### `GET /projects`
- **Permission**: `projects.view`
- **Query Parameters**: `search`, `status` (`active` | `archived`), `page`, `per_page`.
- **Response (200 OK)**: Returns paginated project collection.

#### `POST /projects`
- **Permission**: `projects.create`
- **Request Body**:
  ```json
  {
    "name": "Line 4 Automation Upgrade",
    "code": "L4-AUTO",
    "description": "Plant-wide line upgrade",
    "project_manager_id": "01m4rc2nbjem909ckfs3093xqy",
    "config": {
      "weekendDays": [5, 6],
      "holidays": ["2026-12-25"],
      "durationMode": "working_days",
      "targetLaunchDate": "2026-12-01",
      "highlightCriticalPath": true
    }
  }
  ```
- **Response (201 Created)**: Created `ProjectResource`.

#### `POST /projects/{id}/members`
- **Permission**: `projects.edit`
- **Request Body**: `{"user_id": "01m4rc39akbm1234ckfs3093xz", "role": "contributor"}`
- **Response (200 OK)**: `{"message": "Member added to project successfully."}`

#### `DELETE /projects/{id}/members/{user_id}`
- **Permission**: `projects.edit`
- **Invariants**: Cannot remove the active Project Manager without reassigning first.
- **Response (200 OK)**: `{"message": "Member removed from project successfully."}`

---

### 3.5 Tasks & Scheduling Domain

#### `GET /projects/{id}/tasks`
- **Permission**: `projects.view`
- **Response (200 OK)**: Returns full ordered WBS tree with nested predecessors, successors, effort allocations, and primary owner resources.

#### `POST /projects/{id}/tasks`
- **Permission**: `tasks.create`
- **Request Body**:
  ```json
  {
    "name": "Mount Terminal Boxes",
    "wbs_code": "1.2.1",
    "parent_id": "01m4rfa0919238475628192834",
    "start_date": "2026-10-15",
    "end_date": "2026-10-18",
    "primary_owner_id": "01m4rc2nbjem909ckfs3093xqy",
    "category": "electrical",
    "effort_allocations": [
      {
        "user_id": "01m4rc2nbjem909ckfs3093xqy",
        "allocated_hours": 16.0
      }
    ]
  }
  ```
- **Response (201 Created)**: Created `TaskResource`.

#### `POST /projects/{id}/tasks/reorder`
- **Permission**: `tasks.edit_details`
- **Request Body**: `{"tasks": [{"id": "...", "order_index": 0}, {"id": "...", "order_index": 1}]}`
- **Response (200 OK)**: `{"message": "Tasks reordered successfully."}`

#### `GET /projects/{id}/critical-path`
- **Permission**: `projects.view`
- **Response (200 OK)**:
  ```json
  {
    "critical_path_tasks": [
      {
        "id": "01m4rfa0919238475628192834",
        "name": "Structural Platform Assembly",
        "early_start": "2026-10-12",
        "early_finish": "2026-10-15",
        "late_start": "2026-10-12",
        "late_finish": "2026-10-15",
        "total_float": 0,
        "is_critical": true
      }
    ],
    "critical_tasks_count": 1
  }
  ```

---

### 3.6 Risks & Blockers Domain

- **Allowed Status Enum**: `open`, `mitigating`, `mitigated`, `resolved`, `closed`.
- **Severity Scoring**: $\text{Likelihood (1..3)} \times \text{Impact (1..3)} \to \text{Score (1..9)}$:
  - Low (1–2), Medium (3–4), High (5–6), Critical (7–9).
- `POST /projects/{id}/risks`: Registers risk and immediately blocks specified tasks, storing pre-blocked status.
- `PUT /projects/{id}/risks/{riskId}`: Updates risk. When status transitions to `mitigated`, `resolved`, or `closed`, linked tasks restore to pre-blocked status if no other active blockers remain.
- `DELETE /projects/{id}/risks/{riskId}`: Removes risk and safely unblocks linked tasks.

---

### 3.7 Baselines & Variance Domain

- `POST /projects/{id}/baselines/lock`: Freezes task dates, increments version in `baseline_versions`, sets `has_locked_baseline = true`.
- `POST /projects/{id}/baselines/clear`: Clears active baseline dates on tasks.
- `GET /projects/{id}/baselines/variance`: Computes Start Variance ($SV$) and Finish Variance ($FV$) in working days.

---

### 3.8 Collaboration & Reviews Domain

#### `POST /projects/{id}/tasks/{taskId}/review/request`
- **Permission**: `tasks.request_review`
- **Request Body**: `{"reviewer_id": "01m4rc2nbjem909ckfs3093xqy", "note": "Calibration complete"}`
- **Response (200 OK)**: Returns task in `In Review` status (`review_status = 'pending_review'`). Sets `submitted_by_id = actor.id`.

#### `POST /projects/{id}/tasks/{taskId}/review/approve`
- **Permission**: `tasks.approve_review`
- **Invariants**: Returns `HTTP 422` if reviewer is:
  1. The task submitter (`submitted_by_id`).
  2. The primary owner (`primary_owner_id`).
  3. Any contributing member in `task_effort_allocations`.
- **Response (200 OK)**: Returns task in `Completed` status with `pct = 100` and `review_status = 'approved'`.

#### `POST /projects/{id}/tasks/{taskId}/review/reject`
- **Permission**: `tasks.approve_review`
- **Request Body**:
  ```json
  {
    "review_note": "Load cell terminal wiring must be re-soldered to pass inspection.",
    "remaining_progress_pct": 85
  }
  ```
- **Invariants**: Review note is mandatory. Progress percentage is capped at $\le 95\%$.
- **Response (200 OK)**: Returns task in `In Progress` status with `review_status = 'changes_requested'`.

---

### 3.9 Task Comments Domain

- `GET /projects/{id}/tasks/{taskId}/comments`: Lists chronological comments with author profiles.
- `POST /projects/{id}/tasks/{taskId}/comments`: Creates comment (`{"content": "..."}`).
- `DELETE /projects/{id}/tasks/{taskId}/comments/{commentId}`: Author or Admin can delete comment.

---

### 3.10 Audit & Data Migration Domain

- `GET /projects/{id}/audit`: Returns project audit events with before/after JSON diffs.
- `GET /audit/global`: Admin-only global security audit log.
- `GET /projects/{id}/export`: Exports complete project bundle (metadata, WBS, dependencies, risks, effort).
- `POST /projects/import`:
  - **Header**: `X-Idempotency-Key: {ulid_or_uuid}`
  - **Transaction**: 5-pass topological resolution.
  - **Response**: `HTTP 201 Created` on new import, `HTTP 200 OK` on cached idempotency hit.

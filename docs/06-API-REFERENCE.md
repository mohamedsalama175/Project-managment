# 06. DeliverOps Complete REST API Reference

> **Document ID:** `DOC-06-API-REFERENCE`  
> **Status:** Production-Verified / Field-Tested  
> **Version:** 2.2.0 (Laravel 12 REST API under `/api/v1/`)  
> **Harmonized With:** 01-BUSINESS, 02-FEATURES, 05-BACKEND, 09-SECURITY, 12-OPENAPI

---

## 1. Global API Standards & Conventions

- **Base URL**: `http://127.0.0.1:8000/api/v1`
- **Protocol**: HTTP/1.1 or HTTP/2 over TLS (with `SecurityHeadersMiddleware`)
- **Data Exchange**: Strict `application/json; charset=UTF-8`
- **Primary Keys**: 26-character time-sortable **ULIDs** (`CHAR(26)`)
- **Global Headers**:
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer {sanctum_personal_access_token}
  X-Organization-Id: {active_tenant_organization_ulid}
  ```
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

## 2. Complete Inventory of Endpoints by Domain

### 2.1 System & First-Run Setup Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/system/status` | System health, version, and installation status | Public |
| `GET` | `/system/install/status` | Database & preflight checklist status | Public |
| `POST` | `/system/install` | Provisions initial system organization & super admin | Throttled (Public) |

#### `POST /system/install`
- **Payload**:
  ```json
  {
    "admin_name": "DeliverOps Super Admin",
    "admin_email": "admin@bitwise-solutions.com",
    "admin_password": "SecurePassword123!",
    "admin_password_confirmation": "SecurePassword123!",
    "company_name": "Bitwise Solutions"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "System installation completed successfully.",
    "organization": { "id": "01HZX000000000000000000000", "name": "Bitwise Solutions" },
    "user": { "id": "01HZX000000000000000000001", "email": "admin@bitwise-solutions.com" }
  }
  ```

---

### 2.2 Authentication & Identity Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | Register new organization & owner user | Public |
| `POST` | `/auth/register` | Register new member within existing org | Public |
| `POST` | `/auth/login` | Authenticate credentials (Sanctum SPA / Bearer) | Public (Throttled) |
| `POST` | `/auth/mfa/challenge` | Complete 2FA challenge via TOTP or recovery code | Public |
| `POST` | `/auth/logout` | Revoke active token / terminate session | Authenticated |
| `POST` | `/auth/logout-all` | Revoke all active sessions across all devices | Authenticated |
| `GET` | `/auth/me` | Fetch active user profile, tenant orgs & permissions | Authenticated |
| `PUT` | `/auth/me` | Update name, phone, avatar, or job title | Authenticated |
| `PUT` | `/auth/password` | Change user password | Authenticated |
| `GET` | `/auth/sessions` | List active sessions, IP addresses, and user-agents | Authenticated |
| `DELETE` | `/auth/sessions/{id}` | Revoke specific session | Authenticated |
| `DELETE` | `/auth/sessions` | Revoke all other sessions | Authenticated |
| `POST` | `/auth/mfa/setup` | Generate TOTP QR code & secret key | Authenticated |
| `POST` | `/auth/mfa/confirm` | Confirm TOTP activation with code | Authenticated |
| `POST` | `/auth/mfa/disable` | Disable 2FA on account | Authenticated |

#### `POST /auth/login`
- **Payload**:
  ```json
  {
    "email": "mohamed.salama@bitwise-solutions.com",
    "password": "SecurePassword123!",
    "remember": true
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "1|sanctum_personal_access_token_hash",
    "user": {
      "id": "01HZX...",
      "name": "Mohamed Salama",
      "email": "mohamed.salama@bitwise-solutions.com",
      "primaryRole": "admin",
      "roles": ["admin"]
    },
    "currentOrganization": {
      "id": "01HZX000000000000000000000",
      "name": "Bitwise Solutions",
      "plan": "enterprise"
    },
    "permissions": ["*"]
  }
  ```

---

### 2.3 Multi-Tenancy & Organizations Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/organizations` | Create new tenant organization workspace | Authenticated |
| `POST` | `/organizations/switch` | Switch active tenant workspace context | Authenticated |
| `GET` | `/organizations/current` | Get active tenant profile & billing settings | Tenant Context |
| `PUT` | `/organizations/current` | Update tenant name, logo, region, default calendar | Tenant Admin |
| `GET` | `/organizations/current/members` | Roster of tenant organization members | Tenant Context |
| `PUT` | `/organizations/current/members/{user}`| Update member role in active tenant | Tenant Admin |
| `DELETE`| `/organizations/current/members/{user}`| Remove member from active tenant | Tenant Admin |
| `GET` | `/organizations/invitations` | List pending tenant invitations | Tenant Admin |
| `POST` | `/organizations/invitations` | Send invitation email to new team member | Tenant Admin |
| `DELETE`| `/organizations/invitations/{id}` | Revoke pending invitation | Tenant Admin |

---

### 2.4 Users & RBAC Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | Paginated users directory (search, department filters)| `users.view` |
| `POST` | `/users` | Create user and assign organization roles | `users.create` |
| `GET` | `/users/{id}` | View detailed user profile & allocated projects | `users.view` |
| `PUT` | `/users/{id}` | Update user details, capacity, and role assignment | `users.edit` |
| `DELETE`| `/users/{id}` | Soft-delete user account (Protected against self-delete)| `users.delete` |
| `GET` | `/permissions` | List all 55+ platform permissions grouped by module | `roles.view` |
| `GET` | `/roles` | List custom and system roles with user counts | `roles.view` |
| `POST` | `/roles` | Create custom role with permissions matrix | `roles.create` |
| `PUT` | `/roles/{role}` | Update custom role permissions (System roles protected) | `roles.edit` |
| `DELETE`| `/roles/{role}` | Delete custom role (System roles protected) | `roles.delete` |

---

### 2.5 Projects Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/projects` | List projects (with search, pagination, status) | `projects.view` |
| `POST` | `/projects` | Create blank project with calendar configuration | `projects.create` |
| `GET` | `/projects/{id}` | Get project details, config, milestones, and stats | `projects.view` |
| `PUT` | `/projects/{id}` | Update project metadata, description, target launch | `projects.edit` |
| `DELETE`| `/projects/{id}` | Soft-archive project | `projects.delete` |
| `POST` | `/projects/{id}/restore` | Restore soft-archived project | `projects.restore` |
| `POST` | `/projects/{id}/members` | Assign team member to project roster | `projects.manage_roster` |
| `DELETE`| `/projects/{id}/members/{user}` | Remove team member from project roster | `projects.manage_roster` |
| `POST` | `/projects/{id}/save-as-template`| Save existing project as reusable template | `templates.create` |

---

### 2.6 Tasks, WBS Hierarchy & CPM Scheduling Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/projects/{project}/tasks` | Get all WBS tasks, dependencies, and rollups | `tasks.view` |
| `POST` | `/projects/{project}/tasks` | Create deliverable in WBS hierarchy | `tasks.create` |
| `GET` | `/projects/{project}/tasks/{task}`| Get task details, effort allocations, float metrics | `tasks.view` |
| `PUT` | `/projects/{project}/tasks/{task}`| Update task name, dates, effort, status, category | `tasks.edit` |
| `DELETE`| `/projects/{project}/tasks/{task}`| Delete task (cascades sub-tasks or unlinks) | `tasks.delete` |
| `POST` | `/projects/{project}/tasks/reorder`| Update sibling WBS ordering index | `tasks.edit` |
| `GET` | `/projects/{project}/critical-path`| Calculate & return critical path task IDs & total float| `scheduling.view` |

#### `POST /projects/{project}/tasks`
- **Payload**:
  ```json
  {
    "name": "RS-232 Scale Protocol Driver",
    "category": "Scale Integration",
    "priority": "Urgent",
    "start": "2026-10-15",
    "end": "2026-10-22",
    "estimated_hours": 16,
    "primary_owner_id": "01HZX...",
    "parent_id": null,
    "is_milestone": false,
    "depends_on": ["01HZX_PRED_ID"]
  }
  ```

---

### 2.7 Risks, Issues & Blockers (RIB) Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/projects/{project}/risks` | List registered risks with severity & linked blockers | `risks.view` |
| `POST` | `/projects/{project}/risks` | Log new risk/blocker and link to WBS tasks | `risks.create` |
| `GET` | `/projects/{project}/risks/{risk}`| View risk details, root cause, mitigation plan | `risks.view` |
| `PUT` | `/projects/{project}/risks/{risk}`| Update risk status, severity, impact, mitigation | `risks.edit` |
| `DELETE`| `/projects/{project}/risks/{risk}`| Delete risk record (releases linked blocked tasks) | `risks.delete` |

---

### 2.8 Baselines & Variance Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/projects/{project}/baselines/lock` | Capture point-in-time WBS snapshot and lock baseline | `baselines.lock` |
| `POST` | `/projects/{project}/baselines/clear`| Clear locked baseline | `baselines.clear` |
| `GET` | `/projects/{project}/baselines/variance` | Compute net schedule drift days ($SV, FV$) | `baselines.view` |

---

### 2.9 Collaboration, Reviews & Attachments Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/projects/{project}/tasks/{task}/review/request` | Submit deliverable for sign-off review | `reviews.request` |
| `POST` | `/projects/{project}/tasks/{task}/review/approve` | Approve deliverable (Anti-Self-Approval enforced) | `reviews.approve` |
| `POST` | `/projects/{project}/tasks/{task}/review/reject` | Request changes with explanation note | `reviews.reject` |
| `GET` | `/projects/{project}/tasks/{task}/comments` | Get threaded discussion feed | `comments.view` |
| `POST` | `/projects/{project}/tasks/{task}/comments` | Post comment with mentions | `comments.create` |
| `POST` | `/comments/{comment}/reactions` | Add emoji reaction to comment | `comments.create` |
| `DELETE`| `/comments/{comment}/reactions/{emoji}` | Remove emoji reaction | `comments.delete` |
| `GET` | `/projects/{project}/tasks/{task}/watchers` | List watchers subscribed to task | `tasks.view` |
| `POST` | `/projects/{project}/tasks/{task}/watch` | Subscribe active user to task updates | Authenticated |
| `DELETE`| `/projects/{project}/tasks/{task}/watch` | Unsubscribe active user from task updates | Authenticated |
| `GET` | `/projects/{project}/tasks/{task}/attachments` | List uploaded deliverable attachments | `tasks.view` |
| `POST` | `/projects/{project}/tasks/{task}/attachments` | Upload attachment (antivirus scanning verified) | `tasks.edit` |
| `GET` | `/projects/{project}/tasks/{task}/attachments/{id}/download` | Secure download URL | `tasks.view` |

---

### 2.10 Notifications & Preferences Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | Paginated notification feed for active user | Authenticated |
| `GET` | `/notifications/unread-count`| Real-time unread notifications count | Authenticated |
| `PUT` | `/notifications/{notification}/read` | Mark specific notification as read | Authenticated |
| `PUT` | `/notifications/read-all` | Mark all notifications as read | Authenticated |
| `GET` | `/notification-preferences` | Get user email, in-app, webhook alert preferences | Authenticated |
| `PUT` | `/notification-preferences` | Update delivery channels and quiet hours | Authenticated |

---

### 2.11 Audit, Compliance & Forensics Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/projects/{project}/audit` | Filtered audit logs for specific project | `audit.view` |
| `GET` | `/audit/global` | Global tenant audit trail | `audit.view_global` |
| `GET` | `/projects/{project}/export` | Export project WBS, schedule, and risks as JSON/CSV | `projects.export` |
| `POST` | `/projects/import` | 5-pass idempotent import with dry-run verification | `projects.import` |
| `POST` | `/projects/{project}/tasks/import` | Bulk task import with column mapping validation | `tasks.import` |

---

### 2.12 Automation & Workflows Domain
| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/automation/templates` | Library of pre-built workflow templates | `automation.view` |
| `GET` | `/automation/rules` | Tenant active automation rules | `automation.view` |
| `POST` | `/automation/rules` | Create automation rule (triggers, conditions, actions) | `automation.create` |
| `PUT` | `/automation/rules/{rule}` | Update automation rule configuration | `automation.edit` |
| `DELETE`| `/automation/rules/{rule}` | Delete automation rule | `automation.delete` |
| `PATCH` | `/automation/rules/{rule}/toggle`| Enable / disable automation rule | `automation.edit` |
| `GET` | `/automation/runs` | Execution audit log of triggered automation runs | `automation.view` |

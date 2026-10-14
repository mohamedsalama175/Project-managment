# 14. DeliverOps API Error Code Catalog

> **Document ID:** `DOC-14-ERROR-CODES`  
> **Status:** Production-Ready / Implementation-Grade  
> **Version:** 2.2.0  
> **Harmonized With:** [03-CRUD](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/03-CRUD-SPECIFICATIONS.md), [05-BACKEND](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/05-BACKEND-ARCHITECTURE.md), [06-API](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/06-API-REFERENCE.md), [07-FRONTEND](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/07-FRONTEND-ARCHITECTURE.md), [09-SECURITY](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/09-SECURITY-AND-COMPLIANCE.md)

---

All DeliverOps API errors return a standard JSON envelope with machine-readable error codes and specific validation fields:

```json
{
  "message": "Human-readable summary of the error.",
  "code": "DOMAIN_SPECIFIC_CONSTANT_STRING",
  "errors": {
    "field_name": [
      "Granular explanation of what failed validation."
    ]
  }
}
```

---

## 2. Authentication & Session Domain (`AUTH_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `AUTH_INVALID_CREDENTIALS` | `401` | The provided credentials do not match our records. | Email or password incorrect. | Prompt user to re-enter password or request password reset. |
| `AUTH_UNAUTHENTICATED` | `401` | Unauthenticated. | Bearer token missing, malformed, or expired. | Redirect client to `/auth/login`. |
| `AUTH_ACCOUNT_INACTIVE` | `403` | Your account is currently inactive or on leave. | User status is `inactive` or `on_leave`. | Instruct user to contact system administrator. |
| `AUTH_PASSWORD_MISMATCH` | `422` | The provided current password does not match. | `current_password` failed hash check during update. | Request user re-enter current password. |
| `AUTH_THROTTLED` | `429` | Too many login attempts. Please wait 60 seconds. | Exceeded 5 failed attempts/minute on IP or email. | Display 60-second cooldown timer on UI. |

---

## 3. Users & Identity Domain (`USER_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `USER_SELF_DELETION_BLOCKED` | `422` | You cannot delete your own account. | Authenticated actor requested deletion of their own ULID. | Prevent self-delete button on UI; display error notification. |
| `USER_LAST_ADMIN_PROTECTED` | `422` | Cannot modify or delete the last active administrator in the system. | Operation would result in zero active users with the `admin` role. | Require promotion of another admin before deactivating/deleting. |
| `USER_ACTIVE_PM_CONFLICT` | `422` | Cannot delete user: They are actively managing non-archived projects. | Target user is assigned as `project_manager_id` on active projects. | Reassign project manager on active projects before retrying deletion. |
| `USER_ROLE_ESCALATION_BLOCKED` | `422` | You cannot assign roles you do not possess. | Non-admin user attempted to grant a role higher than their own. | Filter role assignment dropdown to only roles held by the actor. |
| `USER_EMAIL_TAKEN` | `422` | The email has already been taken. | Email exists on an active (non-deleted) account. | Suggest password recovery or enter distinct email. |

---

## 4. Roles & Access Control Domain (`ROLE_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `ROLE_SYSTEM_PROTECTED` | `422` | System roles are protected and cannot be deleted or renamed. | Attempted deletion or renaming of a role where `is_system = true`. | Disable delete/rename actions for system roles in UI. |
| `ROLE_IN_USE_CONFLICT` | `422` | Cannot delete role: active users are currently assigned to this role. | Role has `users_count > 0`. | Reassign users to a different role before deleting. |
| `ROLE_NAME_DUPLICATE` | `422` | A role with this identifier already exists. | Role `name` conflicts on `(name, guard_name)`. | Choose a unique role machine name. |
| `ROLE_FORBIDDEN` | `403` | User does not have the right permissions. | User lacks required Spatie capability. | Show permission denied banner. |

---

## 5. Projects Domain (`PROJECT_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `PROJECT_NOT_FOUND` | `404` | Project not found or access denied. | Project ID invalid or actor lacks access. | Return user to project list. |
| `PROJECT_CODE_DUPLICATE` | `422` | The project code has already been taken. | `code` unique index violation on `projects`. | Supply unique project code prefix (e.g. `PRJ-02`). |
| `PROJECT_PM_REQUIRED` | `422` | A valid project manager must be assigned. | `project_manager_id` is null or does not exist. | Select an active user as Project Manager. |
| `PROJECT_VERSION_CONFLICT` | `409` | Project schedule has been modified by another user. | `tree_version` optimistic locking mismatch. | Fetch latest project state, rebase changes, and retry. |
| `PROJECT_CANNOT_REMOVE_PM` | `422` | Cannot remove the active Project Manager from project roster. | Attempted removal of PM from `project_user`. | Reassign Project Manager before removing member from roster. |

---

## 6. Tasks, WBS & Scheduling Domain (`TASK_*`, `CPM_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `TASK_NOT_FOUND` | `404` | Task not found in this project. | Task ID invalid or belongs to another project. | Refresh task list. |
| `TASK_PARENT_CROSS_PROJECT` | `422` | Parent task must belong to the same project. | `parent_id` belongs to a different project. | Select a valid parent within the active project. |
| `TASK_CIRCULAR_ANCESTOR` | `422` | A task cannot be its own ancestor or descendant. | Circular nesting in WBS hierarchy. | Abort reparenting loop. |
| `CPM_CYCLE_DETECTED` | `422` | Circular dependency cycle detected in project task network. | Kahn's algorithm detected closed cycle in DAG. | Visualise offending dependency edge and abort submission. |
| `TASK_DATE_INVALID` | `422` | The end date must be a date after or equal to start date. | `end_date < start_date`. | Auto-adjust end date to start date plus duration. |
| `TASK_BLOCKED_MUTATION` | `422` | Blocked tasks cannot be marked Completed without resolving blocker. | Progress set to 100% while status is `Blocked`. | Resolve linked project risk first. |

---

## 7. Collaboration & Review Domain (`REVIEW_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `REVIEW_SELF_APPROVAL_BLOCKED` | `422` | Governance Violation: The task primary owner and contributing members cannot approve their own deliverable review. | Reviewer is `primary_owner_id`, `submitted_by_id`, or in `effort_allocations`. | Designate an independent reviewer or project manager. |
| `REVIEW_NOTE_MANDATORY` | `422` | A review note explaining the required changes is mandatory when requesting changes. | Rejection submitted without explanation. | Prompt reviewer to provide constructive change note. |
| `REVIEW_INVALID_STATE` | `422` | Task must be In Review before approval or rejection. | Action attempted on a task not in `In Review`. | Submit task for review first. |
| `COMMENT_EMPTY` | `422` | The comment content field cannot be blank. | Empty discussion text submitted. | Disable submit button until text is entered. |

---

## 8. Risks & Blockers Domain (`RISK_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `RISK_TITLE_REQUIRED` | `422` | The risk title field is required. | Title omitted during registration. | Provide concise risk headline. |
| `RISK_TASK_NOT_FOUND` | `422` | Linked task does not belong to this project. | Task blocker link target outside project scope. | Select tasks strictly within project WBS. |
| `RISK_INVALID_SEVERITY` | `422` | Invalid severity level specified. | Value outside `['low', 'medium', 'high', 'critical']`. | Supply valid severity enum. |

---

## 9. Baselines & Migration Domain (`BASELINE_*`, `IMPORT_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `BASELINE_EMPTY_PROJECT` | `422` | Cannot lock baseline on project with no tasks. | Baseline lock requested on 0-task project. | Create WBS tasks before locking baseline. |
| `IMPORT_PAYLOAD_INVALID` | `422` | Project import payload is missing required task definitions. | JSON archive lacks required `tasks` array. | Validate archive structure against schema. |
| `IMPORT_IDEMPOTENCY_CONFLICT` | `409` | Idempotency key already exists with different payload hash. | Re-used `X-Idempotency-Key` with altered payload. | Generate new unique idempotency key for new payloads. |

---

## 10. Multi-Tenancy, Organization & MFA Domain (`TENANT_*`, `ORG_*`, `AUTH_MFA_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `TENANT_CONTEXT_MISSING_ERROR` | `500` | No active tenant context detected for tenant-scoped model query. | Query executed on tenant model without initialized tenant. | Ensure request passes through tenant middleware or supply `X-Organization-Id`. |
| `TENANT_CONTEXT_MISSING` | `400` | No active organization selected. | Endpoint requiring tenant context called without active tenant. | Select or switch to an active organization first. |
| `TENANT_ACCESS_DENIED` | `403` | Access denied to target organization. | User attempted to switch or access an organization they do not belong to. | Select an organization the authenticated user belongs to. |
| `ORG_OWNERSHIP_TRANSFER_FORBIDDEN` | `403` | Only the primary organization owner can transfer ownership. | Non-owner member attempted to trigger ownership transfer. | Request active organization owner to execute transfer. |
| `ORG_TRANSFER_TARGET_INVALID` | `422` | Target user must be an active member of this organization. | Target user for transfer is not in `organization_users`. | Invite and add user to organization before transferring ownership. |
| `ORG_PLAN_LIMIT_EXCEEDED` | `422` | Organization plan limit exceeded. Upgrade to add more resources. | Free tier exceeded limit of 3 projects or 5 members. | Upgrade organization subscription tier. |
| `INVITE_NOT_FOUND` | `404` | Organization invitation not found or access denied. | Invalid or expired invitation token or ID. | Request an invitation from organization administrator. |
| `INVITE_ALREADY_ACCEPTED` | `422` | This invitation has already been accepted. | Invitation has non-null `accepted_at`. | Proceed to login using existing credentials. |
| `INVITE_EXPIRED` | `410` | This invitation has expired. | Invitation link has exceeded its 7-day expiration window. | Request a refreshed invitation from organization administrator. |
| `INVITE_ALREADY_MEMBER` | `422` | The user is already an active member of this organization. | Target email already belongs to `organization_members`. | No action needed; user already has access. |
| `AUTH_MFA_REQUIRED` | `200` | Two-factor authentication code required. | User has MFA enabled and passed primary credential check. | Prompt user for 6-digit TOTP code or recovery code. |
| `AUTH_MFA_CHALLENGE_EXPIRED` | `410` | The MFA challenge token is invalid or has expired. Please log in again. | Cache key `mfa_challenge:*` exceeded 5-minute TTL. | Return user to primary login form. |
| `AUTH_MFA_INVALID_CODE` | `422` | Invalid two-factor authentication code or recovery code. | Code failed TOTP algorithm and recovery code hashes. | Re-enter 6-digit authenticator code or valid backup code. |
| `AUTH_ACCOUNT_LOCKED` | `423` | Account locked due to consecutive failed attempts. | User failed 5 consecutive password attempts (`locked_until` active). | Display lockout countdown timer until 15-minute cooldown expires. |
| `AUTH_EMAIL_UNVERIFIED` | `403` | Your email address has not been verified and your grace period has expired. | User has null `email_verified_at` and `created_at` older than 3 days. | Click resend verification email or follow signed verification link. |
| `AUTH_PASSWORD_RESET_INVALID` | `422` | Invalid or expired password reset token. | Token does not match active record in `password_reset_tokens`. | Request a new password reset link. |
| `AUTH_PASSWORD_RESET_EXPIRED` | `422` | Password reset token has expired. | Password reset request created more than 60 minutes ago. | Request a fresh password reset link. |
| `AUTH_RATE_LIMIT_EXCEEDED` | `429` | Too many attempts. Please try again later. | Rate limit throttle threshold exceeded for signup, resend, or login. | Wait for the throttle cooldown period to elapse before retrying. |

---

## 11. Onboarding, Templates & Installation Domain (`ONBOARDING_*`, `TEMPLATE_*`, `INSTALL_*`, `IMPORT_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `ONBOARDING_STEP_OUT_OF_ORDER` | `422` | Cannot advance to a step beyond your current onboarding sequence. | `$step > $progress->current_step`. | Complete preceding onboarding steps in chronological order. |
| `ONBOARDING_PREREQUISITE_MISSING` | `422` | Prior required onboarding steps are incomplete. | Preceding steps are neither completed nor marked skipped. | Complete or skip all prior steps before saving current step. |
| `TEMPLATE_NOT_FOUND` | `404` | Project template not found or access denied. | Template ID invalid or belongs to another organization. | Select a valid system or tenant template. |
| `TEMPLATE_SOURCE_EMPTY` | `422` | Cannot create a template from an empty project. | Project has zero tasks in WBS hierarchy. | Add tasks to the project before saving as template. |
| `TEMPLATE_PAYLOAD_TOO_LARGE` | `422` | Template definition exceeds maximum allowed size (5MB). | Serialized template tasks, dependencies, and risks exceed 5MB. | Reduce project scope or task metadata size before templating. |
| `SYSTEM_ALREADY_INSTALLED` | `409` | System is already installed and initialized. | Installation attempted when `install_state` already has a record. | Installation is singleton; proceed to user login. |
| `IMPORT_DRY_RUN_PASSED` | `200` | Task import dry-run validated successfully with no errors. | Dry-run completed with zero validation issues. | Proceed to final import execution. |

---

## 12. Collaboration, Attachments & Notifications Domain (`COMMENT_*`, `ATTACHMENT_*`, `NOTIFICATION_*`, `MENTION_*`)

| Machine Code | HTTP Status | Message | Trigger Cause | Client Resolution |
| :--- | :---: | :--- | :--- | :--- |
| `COMMENT_EDIT_WINDOW_EXPIRED` | `422` | Comments can only be edited within 15 minutes of posting. | `created_at` older than 15 minutes. | Post a new follow-up comment instead. |
| `COMMENT_VIEW_FORBIDDEN` | `403` | You do not have access to view discussion for this task. | User is not a member of the project roster and lacks admin privilege. | Request project manager to add user to project roster. |
| `COMMENT_FORBIDDEN` | `403` | You do not have permission to modify or delete this comment. | Non-author attempted edit/delete without admin or owner status. | Only comment author, org owner, or admin can modify comment. |
| `COMMENT_REACTION_INVALID` | `422` | Unsupported reaction emoji. | Emoji outside allowed set `['👍', '❤️', '🎉', '👀', '✅']`. | Submit one of the standard reaction emojis. |
| `ATTACHMENT_FILE_TOO_LARGE` | `422` | The uploaded file exceeds the 25 MB limit. | File size exceeds 26,214,400 bytes. | Compress file or share via external repository link. |
| `ATTACHMENT_INVALID_MIME` | `422` | Unsupported file format. | Magic-byte MIME type or extension outside whitelist. | Upload valid file: PDF, PNG, JPEG, CSV, XLSX, DOCX, ZIP. |
| `ATTACHMENT_SCAN_PENDING` | `423` | File is undergoing security scan and is not yet available for download. | Download requested while `scan_status = 'pending'`. | Wait for background scan job to complete. |
| `ATTACHMENT_SCAN_INFECTED` | `422` | Security violation: file was quarantined due to malware detection. | Download requested on quarantined attachment. | Contact security team or re-upload verified safe document. |
| `NOTIFICATION_NOT_FOUND` | `404` | Notification not found or access denied. | Notification ID does not exist or belongs to another user. | Refresh notifications inbox. |
| `MENTION_USER_NOT_IN_PROJECT` | `422` | Mentioned user is not an active member of this project roster. | Mention target not in `project_users`. | Add user to project team before assigning or mentioning. |



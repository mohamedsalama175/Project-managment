# 13. DeliverOps Architecture Decision Record (ADR) Log

## ADR-001: Risk Status Lifecycle & Blocker Disconnection Strategy
- **Status**: Approved
- **Context**: The DDL initially used `open`, `mitigated`, `closed`, whereas API and business documents referenced `resolved` and `mitigating`. A clear state machine is required to govern when tasks linked as blockers are released.
- **Decision**: Standardize `project_risks.status` on five deterministic values: `open`, `mitigating`, `mitigated`, `resolved`, `closed`.
  - `open`: Identified risk; actively blocks linked tasks.
  - `mitigating`: Actions underway; tasks remain blocked unless manually unlinked.
  - `mitigated`: Risk reduced below threshold; automatically releases linked tasks.
  - `resolved`: Root cause eliminated; automatically releases linked tasks.
  - `closed`: Verified and permanently decommissioned.
- **Consequences**: DDL migration updated to `ENUM('open', 'mitigating', 'mitigated', 'resolved', 'closed')`. Unblocking logic in `ProjectRiskService` activates on `['mitigated', 'resolved', 'closed']`.

---

## ADR-002: Task Lifecycle & Review Status Standardized Naming
- **Status**: Approved
- **Context**: Task status was inconsistently referred to as `In Review` in DDL and `Under Review` in API docs.
- **Decision**: Standardize task status on `In Review`. Review progress status standardized on `review_status`: `['none', 'pending_review', 'approved', 'changes_requested']`.
- **Consequences**: API references, frontend badges, and database DDL are 100% harmonized.

---

## ADR-003: Submitter & Contributor Anti-Self-Approval Quality Gate
- **Status**: Approved
- **Context**: The existing snippet blocked `reviewer_id`, which prevented the legitimate assigned reviewer from signing off on the deliverable.
- **Decision**: Introduce `submitted_by_id` on `tasks`. In `ReviewWorkflowService::approveReview()`, block:
  1. The task submitter (`submitted_by_id`).
  2. The primary owner (`primary_owner_id`).
  3. Any user listed in `task_effort_allocations` for that task.
  The assigned reviewer (`reviewer_id`) is explicitly permitted and expected to approve, provided they are not the submitter, owner, or contributor.
- **Consequences**: Prevents self-sign-offs while allowing formal peer inspection.

---

## ADR-004: Multi-Baseline Versioning Strategy
- **Status**: Approved
- **Context**: Projects experience scope changes and change orders over time; a single boolean `has_locked_baseline` fails to preserve historical baselines.
- **Decision**: Create a `baseline_versions` table storing sequential snapshots (`version_number`, `snapshot_data`, `locked_by_id`, `created_at`). The active baseline is referenced by `active_baseline_version` on `projects`.
- **Consequences**: Full historical variance auditing across multiple contract amendments.

---

## ADR-005: Mathematical Scheduling Multi-Dependency Support (SS, FF, FS + Lag)
- **Status**: Approved
- **Context**: Complex automation projects require Start-to-Start (SS) and Finish-to-Finish (FF) relationships with lead/lag days, but algorithms previously only specified FS.
- **Decision**: Implement forward/backward pass formulas for SS, FF, and FS dependencies including positive/negative `lag_days`. Enforce `strictlyBefore: true` on FS late-finish backward passes to prevent artificial float introduction.
- **Consequences**: Mathematical zero-float critical path precision across all dependency topologies.

---

## ADR-006: Frontend State Management Architecture
- **Status**: Approved
- **Context**: DeliverOps requires split-pane synchronized rendering between the WBS table and the Gantt SVG canvas with offline resilience.
- **Decision**: Use **Zustand** for lightweight reactive UI state coupled with **Dexie / IndexedDB** for local offline persistence, and **TanStack React Query** for server-state caching and optimistic updates.
- **Consequences**: Eliminates heavy Redux boilerplate; provides zero-lag sub-millisecond timeline scrubbing.

---

## ADR-007: Real-Time Synchronization Strategy
- **Status**: Approved
- **Context**: Multiple project managers and contributors collaborate simultaneously on the same project schedule.
- **Decision**: Implement **Server-Sent Events (SSE)** for lightweight downstream schedule change broadcasts and lock notifications, paired with optimistic locking via `tree_version` / `lock_version` to prevent write-write conflicts. Full bidirectional WebSockets deferred to Phase 2.
- **Consequences**: High firewall compatibility without managing complex stateful WebSocket clusters.

---

## ADR-008: Spatie RBAC Integration with CHAR(26) ULIDs
- **Status**: Approved
- **Context**: Standard Spatie Laravel Permission migrations use auto-incrementing big integers, conflicting with DeliverOps ULID primary key requirements.
- **Decision**: Customize Spatie migrations and pivot tables (`model_has_roles`, `model_has_permissions`, `role_has_permissions`) to utilize `CHAR(26)` ULIDs.
- **Consequences**: Uniform referential integrity and time-ordered clustering across all database tables.

---

## ADR-009: Non-Cascading Polymorphic Audit Log Immutability
- **Status**: Approved
- **Context**: Deleting a project, task, or user must never delete regulatory compliance logs.
- **Decision**: The `audit_logs` table does NOT use cascading foreign keys. Records use nullable `auditable_type`, `auditable_id`, and `project_id`. Deleting a parent project preserves all related audit trail entries.
- **Consequences**: Meets corporate compliance and ISO 9001 audit standards.

---

## ADR-010: Idempotency Key Vault 24-Hour Sliding TTL
- **Status**: Approved
- **Context**: High-volume data imports from legacy project files over unreliable networks risk duplicate project creation on client retry.
- **Decision**: Store request hashes (`SHA-256`) and cached response bodies in `idempotency_keys` with a 24-hour expiration (`expires_at`). Matching keys return cached responses; mismatched payload hashes with the same key return `HTTP 409 Conflict`.
- **Consequences**: Safe automatic retries on network dropouts.

---

## ADR-021: Multi-Tenancy Isolation Architecture: Fail-Closed TenantScope & Exclusions
- **Status**: Approved
- **Context**: DeliverOps transitions from a single-tenant visual demo to an enterprise multi-tenant SaaS platform. Cross-tenant data leakage is catastrophic.
- **Decision**: Implement row-level multi-tenancy using `organization_id CHAR(26)` foreign keys across all tenant tables. Enforce isolation using a global `TenantScope`. The scope is fail-closed: if an Eloquent query executes on a tenant-scoped model without an initialized tenant context, `TenantScope` throws `TenantContextMissingException`. Global models (`User`, `Organization`) are strictly excluded from `TenantScope`. System jobs and tenant onboarding wrap unscoped queries using `TenantManager::executeWithoutTenantScope()`.
- **Consequences**: Impossible to leak tenant data via missing `where` clauses; queries fail closed deterministically in all environments.

---

## ADR-022: Multi-Tenancy Zero-Downtime Data Migration & System Backfill Protocol
- **Status**: Approved
- **Context**: Introducing non-nullable `organization_id` foreign keys to tables containing existing seeded demo data risks deployment failures and foreign key constraint violations.
- **Decision**: Split the tenancy migration into three deterministic steps:
  1. Add nullable `organization_id` columns with indices to all tenant tables.
  2. Create a default "System" organization (`01HZX000000000000000000000`) and backfill all existing orphan records in chunks of 500.
  3. Alter `organization_id` columns to `NOT NULL` and attach cascading `FOREIGN KEY` constraints referencing `organizations(id)`.
- **Consequences**: Zero downtime migration path without data truncation or foreign key constraint collisions across MySQL and SQLite environments.

---

## ADR-023: Role-Based Access Control Scoped by Organization via Spatie Teams
- **Status**: Approved
- **Context**: A user may belong to multiple organizations (e.g., an Admin in Org A, but a Contributor or Viewer in Org B). Traditional single-organization roles cannot handle multi-tenancy memberships.
- **Decision**: Configure Spatie Laravel Permission with `'teams' => true`. All role assignments and permission checks are scoped to `team_id = organization_id`. Roles table includes a nullable `team_id` column to support global system roles and tenant-custom roles. Delete `role` column on `organization_users`; roles are sourced exclusively from Spatie's `model_has_roles` scoped by `team_id`.
- **Consequences**: Total role isolation across tenant boundaries. Switching organizations instantly activates the actor's permissions for that specific tenant.

---

## ADR-024: Production Authentication via Stateful Laravel Sanctum HttpOnly Session Cookies
- **Status**: Approved
- **Context**: Storing bearer tokens in client `localStorage` is vulnerable to Cross-Site Scripting (XSS) token exfiltration.
- **Decision**: Transition frontend client to stateful cookie authentication using Laravel Sanctum with `credentials: 'include'` and HttpOnly session cookies. Pre-flight CSRF initialization is performed via `GET /sanctum/csrf-cookie` with `X-XSRF-TOKEN` request validation. For hybrid/headless API clients, Sanctum plain-text bearer tokens are supported simultaneously.
- **Consequences**: Immunity to token exfiltration via client-side scripts; standard secure cookie lifecycle across modern browsers.

---

## ADR-025: Two-Factor Authentication (TOTP) & Single-Use Recovery Code Vault
- **Status**: Approved
- **Context**: Enterprise security policy requires multi-factor authentication (MFA) with RFC 6238 Time-based One-Time Passwords (TOTP) and backup access redundancy.
- **Decision**: Implement TOTP verification with encrypted secrets (`Crypt::encryptString`) and standard SHA-1 30-second windows with ±1 step drift tolerance. Issue 8 cryptographically secure single-use recovery codes stored in `mfa_recovery_codes` hashed with `Hash::make()`. Recovery code status endpoints return only counts (`count`, `max`), never plaintext codes. Verification logic fails closed when MFA is disabled.
- **Consequences**: Regulatory compliance for enterprise accounts with zero secret leakage in logs or API responses.

---

## ADR-026: Multi-Device Session Invalidation & Account Lockout Security Policy
- **Status**: Approved
- **Context**: Credential stuffing attacks and lost devices threaten account security without automated lockout and session termination.
- **Decision**: Enforce a strict password policy (minimum 12 characters, uppercase, lowercase, numbers, symbols, HIBP compromised password checks). Lock accounts for 15 minutes after 5 consecutive failed login attempts (`failed_login_attempts`, `locked_until`). Implement `POST /auth/logout-all` to delete all active database sessions in `sessions` table (except the current session) and revoke all active Sanctum tokens within a single atomic database transaction.
- **Consequences**: Brute-force protection; instant kill-switch for compromised accounts across all devices.

---

## ADR-027: Deterministic Pessimistic Locking for Atomic Organization Ownership Transfer
- **Status**: Approved
- **Context**: An organization must have exactly one primary owner at any time (`organization_users.is_owner = 1` enforced by a virtual generated unique index). Concurrently transferring ownership could result in zero owners or multiple owners.
- **Decision**: Implement `TransferOwnershipService` using `DB::transaction()` and pessimistic locking (`lockForUpdate()`) on the `organizations` row and both `organization_users` records. The previous owner is set to `is_owner = 0` and the new owner is set to `is_owner = 1` in the same transaction. Unauthorized actors trigger `ORG_OWNERSHIP_TRANSFER_FORBIDDEN` (403), and non-member targets trigger `ORG_TRANSFER_TARGET_INVALID` (422) via `HttpResponseException`.
- **Consequences**: Mathematically guaranteed single-owner invariant with zero race conditions under high concurrency.

---

## ADR-028: Self-Service Identity, Progressive Lockout, and Dual-Table Session Security
- **Status**: Approved
- **Context**: Replacing demo authentication with production-grade enterprise identity requires self-service signup, cryptographically signed email verification, progressive account lockout with CLI break-glass unlock, unverified grace periods, and granular multi-device session revocation.
- **Decision**:
  1. Signup creates the User, primary Organization, and dispatches a signed URL email verification (`GET /api/v1/auth/email/verify/{id}/{hash}`).
  2. Implement a 3-day unverified login grace period (`email_verified_at` null check against `created_at->addDays(3)`).
  3. Non-enumerating password resets via 64-character cryptographic tokens stored in `password_reset_tokens` (60-minute TTL). Password change/reset immediately revokes all existing sessions in `sessions` and Sanctum personal access tokens.
  4. Consecutive failed login attempts trigger an exponential/hard lockout (10 consecutive failures locks for 1 hour; 5 failures locks for 15 minutes). Admin unlock is provided via `php artisan deliverops:unlock {email}`.
  5. Multi-device session manager tracks user agent, platform, browser, IP, and last active timestamp in `sessions`. Sessions can be individually or globally revoked.
  6. Dispatches `NewDeviceLoginNotification` email whenever a login occurs from an unrecorded IP and user agent.
- **Consequences**: Complete protection against brute force and credential stuffing, full session visibility for users, and zero user enumeration attack vectors.

---

## ADR-029: Client-Side Real-Time Password Entropy Calculation & Defense-in-Depth
- **Status**: Approved
- **Context**: Users frequently submit weak passwords that fail server-side validation, degrading user experience. Server-side HIBP (Have I Been Pwned) checks protect against credential stuffing, but immediate visual feedback is needed.
- **Decision**: Implement `PasswordStrengthMeter` on frontend registration and reset views with a 5-tier entropy scale and granular requirement checklist (min 12 chars, uppercase, lowercase, number, symbol). Server-side validation acts as the definitive enforcement layer using Laravel's `Password::min(12)->mixedCase()->letters()->numbers()->symbols()->uncompromised()`.
- **Consequences**: Real-time UX guidance reduces registration bounce rates while maintaining military-grade password entropy compliance.

---

## ADR-030: Row-Level Tenancy, BelongsToOrganization Global Scoping, and Single-Owner Generated Virtual Indices
- **Status**: Approved
- **Context**: DeliverOps operates a single shared MySQL database where all tenant entities (`projects`, `tasks`, `task_dependencies`, `task_effort_allocations`, `task_comments`, `project_risks`, `risk_task_blockers`, `baseline_versions`, `audit_logs`, `notifications`, `attachments`) reside. Strict query-level isolation is mandatory to prevent cross-tenant data leakage. Additionally, an organization must strictly have exactly one owner.
- **Decision**:
  1. Introduce the global scope `BelongsToOrganization` and middleware `EnsureOrganizationScope`. If a tenant-scoped model query is executed without an active tenant context, the scope fails closed by throwing `TenantContextMissingException`.
  2. Implement a custom AST PHPStan rule (`DetectUnscopedQueryRule`) that rejects any code invoking `withoutGlobalScope(BelongsToOrganization::class)` or `withoutGlobalScopes()` on tenant models outside designated system bypass wrappers.
  3. All tenant models index `organization_id`.
  4. On `organization_members`, enforce single-owner integrity via a MySQL virtual generated column (`is_owner_virtual = IF(role = 'owner', 1, NULL)`) with a unique index `idx_org_members_single_owner (organization_id, is_owner_virtual)`.
  5. Backfill existing legacy records upon `deliverops:install` by creating a default Organization assigned to the initial super-admin company and setting `organization_id` on all tables before enforcing NOT NULL.
- **Consequences**: Complete isolation of tenant data at the ORM layer; elimination of unscoped query risks during static analysis; mathematical guarantee of single-owner invariants per organization.

---

## ADR-031: Tiered Plan Guardrails, Member Role Governance, and Organization Switching Tokens
- **Status**: Approved
- **Context**: Phase 2 introduces tiered subscription plans (`free`, `pro`, `enterprise`), member management with last-owner protection, rate-limited invitations, and seamless organization switching.
- **Decision**:
  1. Introduce `PlanLimitService` enforcing tier limits: `free` plan is restricted to a maximum of 3 projects and 5 organization members. Violations return standard error `ORG_PLAN_LIMIT_EXCEEDED` (`422`).
  2. Organization member roles (`owner`, `admin`, `billing`, `member`) are maintained in `organization_members` and mapped to Spatie team roles (`admin`, `contributor`, `viewer`).
  3. Last owner protection is enforced in `OrganizationMemberController`: an owner cannot be deleted or demoted if they are the sole owner of the tenant (`ORG_CANNOT_REMOVE_OWNER`, `422`).
  4. Invitations are rate-limited to 50 invites/day per organization via Laravel's rate limiter (`org.invitations`), signed with 7-day cryptographic tokens. Accepting an invitation dynamically provisions an unauthenticated user if necessary and issues a scoped Sanctum bearer token.
  5. Switching organizations (`POST /api/v1/auth/switch-organization`) updates the user's active tenant and issues a dedicated personal access token with explicit ability `["org:{organization_id}"]`.
- **Consequences**: Deterministic resource governance for SaaS monetization, zero tenant privilege escalation, and seamless multi-organization user navigation.

---

## ADR-032: 15-Minute Task Comment Mutability & Tombstone Soft-Deletes
- **Status**: Approved
- **Context**: In collaborative project management, editing comments indefinitely causes audit discrepancies and disputes over agreed specifications. Hard-deleting parent comments breaks conversation lineage and renders nested replies orphaned.
- **Decision**: Comments can only be edited within 15 minutes of posting (`TaskCommentPolicy`). Deletions use `SoftDeletes` and render a `[deleted]` tombstone preserving thread structure and child replies.
- **Consequences**: Ensures contractual integrity and clear discussion lineage while honoring user right to redact mistakes quickly.

---

## ADR-033: Notification Pipeline Deduplication, Per-Org Scoping & Quiet Hours
- **Status**: Approved
- **Context**: Rapid comments flood recipient inboxes. Furthermore, multi-tenant users belong to multiple workspaces with differing working hours and communication channels.
- **Decision**: Notifications are deduplicated atomically using Redis (`Cache::add`, 60-second TTL) per `(user_id, event_type, task_id)`. Preferences are scoped per `(user_id, organization_id)` allowing distinct workspace notification rules. Phase 4 limits active event dispatch to `mention` and `comment_watched`.
- **Consequences**: Eliminates inbox spam; isolates notification rules by organization context.

---

## ADR-034: Attachment Security Pipeline: ClamAV Async Scanning & Infinite Forensic Retention
- **Status**: Approved
- **Context**: Uploaded project deliverables pose malware risk. Cascade deletes also conflict with database triggers on forensic logs.
- **Decision**: Uploaded files default to `scan_status = 'pending'`. `ScanAttachmentJob` (extending `GlobalJob`) streams files from disk/S3 and scans via ClamAV with 3 retries before setting `scan_status = 'error'`. Downloads enforce `Content-Disposition: attachment`. Activity events have infinite retention with foreign keys set to `RESTRICT`.
- **Consequences**: Zero-trust attachment security with quarantine enforcement and permanent tamper-proof audit trails.

---

## ADR-046: Multi-Provider AI Abstraction, Budget Caps, and PII De-identification Strategy
- **Status**: Approved
- **Context**: Project management workspaces contain confidential project descriptions, customer names, financial estimates, and email communications. Incorporating generative AI capabilities across task estimation, risk prediction, executive summarization, and interactive assistance requires strict tenant budget isolation, per-user rate limiting, multi-model vendor portability (OpenAI, Anthropic, Gemini, Ollama), and automatic redaction of Personally Identifiable Information (PII) before LLM egress.
- **Decision**:
  1. Implement `AIProviderInterface` with concrete adapters for OpenAI, Anthropic, Google Gemini, Ollama, and `MockAiProvider`. Providers are resolved dynamically via `AiManagerService::resolveProvider(string $tenantId)` using encrypted credentials stored in `organization_ai_credentials` (`VARCHAR(2048)`).
  2. Implement `PiiScrubberService` which intercepts all outbound prompts, detects and replaces email addresses, phone numbers, IP addresses, and credit cards with deterministic tokens (`__DELIVER_OPS_TOK_EMAIL_n__`), and rehydrates model completions before presenting output.
  3. Enforce monthly organization spending caps (`organizations.ai_monthly_budget_usd`) and per-user daily call limits (100 calls/day via sliding Redis TTL). When spending exceeds 80% and 100%, throttled alerts (6-hour debounce) dispatch to organization owners (`AiBudgetThresholdExceeded` -> `SendBudgetAlert`). Requests beyond 100% budget fail closed with `402 Payment Required`.
  4. All AI assistant actions that modify state (`create_task`, `update_task`) record reversible snapshots in `ai_action_logs` (`ON DELETE RESTRICT` for forensic permanence, storing `user_name_snapshot`), enabling one-click audit rollback (`POST /api/v1/ai/actions/{id}/rollback`).
- **Consequences**: Zero PII leakage to third-party model providers, complete fiscal protection against unmetered API costs, and full reversibility of AI-initiated state changes.

---

## ADR-047: No-Code Automation Architecture: Event Triggering, Idempotent Evaluation, and Cycle Prevention Guardrails
- **Status**: Approved
- **Context**: Enterprise workflow orchestration requires "When X occurs, If conditions Y hold, Do Z" automation rules configurable by organization admins without writing code. Because automated actions can trigger subsequent events, automation engines are vulnerable to infinite recursion loops and duplicate cascading execution.
- **Decision**:
  1. Store rules in `automation_rules` with JSON `trigger`, `conditions`, and `actions` columns, using `SoftDeletes` to preserve referential audit lineage. Execution logs are immutably captured in `automation_runs` with `rule_id ON DELETE RESTRICT`.
  2. Event dispatching through `AutomationEngineService` enforces atomic 60-second event deduplication (`Cache::add("automation_dedup:{$tenantId}:{$eventHash}", true, 60)`).
  3. All automation executions extend `TenantAwareJob` (`ExecuteAutomationRuleJob`) and enforce a hard recursion depth limit of `MAX_DEPTH = 5`. Any event chain exceeding depth 5 terminates immediately with a recorded `skipped` run log and warning alert.
  4. Implement `TemplateResolver` allowing flexible token substitution (e.g. `{{task.name}}`, `{{project.code}}`, `{{user.name}}`) within condition evaluation and action parameter dispatching.
- **Consequences**: Guarantees zero infinite execution loops, deterministic multi-tenant execution scoping, and tamper-proof run audit trails.

---

## ADR-048: Cryptographic Audit Log Hash Chain & Pessimistic Lock State
- **Status**: Approved
- **Context**: Enterprise SOC 2 Type II, ISO 27001, and HIPAA compliance require non-repudiable audit logs that cannot be altered, reordered, deleted, or inserted even by database superusers without immediate cryptographic detection.
- **Decision**:
  1. Add `previous_hash` (CHAR 64) and `row_hash` (CHAR 64) columns directly after `actor_id` to `audit_logs`.
  2. Implement `AuditHashChainService` that serializes writes per organization using a dedicated `audit_chain_state` table with pessimistic locking (`lockForUpdate()`).
  3. Formula: `row_hash = hash('sha256', "{$id}|{$organizationId}|{$entityType}|{$entityId}|{$action}|{$actorId}|{$previousHash}|{$createdAt}")`. Genesis block uses 64 zeros (`str_repeat('0', 64)`).
  4. Provide `GET /api/v1/audit/verify` supporting cursor-based verification (`since_id`, `limit`) that validates every chain link ($log->previous_hash === $expectedPrevHash) and re-computes row hashes.
- **Consequences**: Provides tamper-evident, provable integrity for all tenant operations with zero race conditions under concurrent writes.

---

## ADR-049: Enterprise Compliance: Legal Holds, GDPR DSAR, Right to Erasure & Data Residency
- **Status**: Approved
- **Context**: Corporate litigation and regulatory standards (GDPR, CCPA, HIPAA) require the ability to freeze records (Legal Holds), export personal data (DSAR), fulfill Right to Erasure, and strictly confine tenant processing to designated geographic regions.
- **Decision**:
  1. Legal Holds: Prevent deletion of `Project` and `Task` via Eloquent `booted()` deleting hooks backed by `LegalHoldService::isEntityHeld()`. Throw `DomainException` (HTTP 423) if held. Provide structured JSON e-discovery exports.
  2. GDPR DSAR: Asynchronously generate password-free portable JSON exports via `ProcessDsarExportJob` (extending `TenantAwareJob`), expiring in 24 hours with signed URLs.
  3. GDPR Erasure: Anonymize user records (`name = 'Anonymized User'`, `email = "erased_{$id}@deliverops.internal"`, status `'inactive'`), revoke all active sessions, and recursively sever OAuth refresh token chains (`oauth_refresh_tokens.rotated_to`).
  4. Data Residency: `Organization.region` is immutable once created (enforced in `Organization::booted()`). `EnforceDataResidency` middleware blocks cross-region cluster requests with HTTP 451 Unavailable For Legal Reasons based on `config('app.region')`.
- **Consequences**: Complete compliance with international data privacy laws and evidentiary preservation mandates without violating referential integrity.

---

## ADR-050: Mobile Authentication via OAuth 2.0 PKCE, Push Notification Architecture, and PWA Caching
- **Status**: Approved
- **Context**: Enterprise mobility requires secure native mobile apps (iOS & Android) and PWA support without relying on browser cookie stores. Furthermore, push notifications must reach APNs, FCM, and Web Push with high delivery reliability and zero credential leakage.
- **Decision**:
  1. Mobile Auth: Use RFC 7636 OAuth 2.0 with Proof Key for Code Exchange (PKCE) with SHA-256 code challenge (`code_challenge_method = 'S256'`). Mobile clients never store long-lived passwords and store tokens in platform-secure storage (Keychain/EncryptedSharedPreferences).
  2. Multi-Platform Push: Abstract push delivery behind `PushProviderInterface` (`ApnsProvider`, `FcmProvider`, `WebPushProvider`, `MockPushProvider`). Dispatch notifications asynchronously via `SendPushNotificationJob` extending `TenantAwareJob` implementing `protected function executeInTenantContext(): void`.
  3. Push Tokens: Store tokens in `push_tokens` with unique constraint `[organization_id, user_id, token_hash]`. Automatically mark inactive on 410 Gone / BadDeviceToken errors and prune weekly via `PruneInactivePushTokensJob`.
  4. Progressive Web App: Service worker implements offline-first caching for static assets and read routes (`/api/v1/projects`, `/api/v1/tasks`), queues offline mutations with Background Sync, and surfaces visual queue status banners.
- **Consequences**: Zero-cookie enterprise security posture for mobile clients, robust cross-platform push messaging, and reliable offline resilience.


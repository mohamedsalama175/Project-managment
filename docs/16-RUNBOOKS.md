# DeliverOps Incident Response & Operational Runbooks

> **Document ID:** `DOC-16-RUNBOOKS`  
> **Status:** Production-Ready / Implementation-Grade  
> **Version:** 2.2.0  
> **Audience:** Site Reliability Engineers (SRE), DevOps, Support Engineers, Lead Architects  
> **Harmonized With:** [03-CRUD](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/03-CRUD-SPECIFICATIONS.md), [05-BACKEND](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/05-BACKEND-ARCHITECTURE.md), [06-API](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/06-API-REFERENCE.md), [08-DEPLOYMENT](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/08-DEPLOYMENT-AND-OPERATIONS.md), [09-SECURITY](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/09-SECURITY-AND-COMPLIANCE.md), [14-ERROR-CODES](file:///d:/Sana%20Soft2/PRoject%20Code/Project%20managment/docs/14-ERROR-CODES.md)

---

## Index of Operational Runbooks

- [RUNBOOK-01: Circular Dependency Cycle Remediation (`CPM_CYCLE_DETECTED`)](#runbook-01-circular-dependency-cycle-remediation-cpm_cycle_detected)
- [RUNBOOK-02: High Frequency Concurrency Collisions (`CONCURRENCY_CONFLICT`)](#runbook-02-high-frequency-concurrency-collisions-concurrency_conflict)
- [RUNBOOK-03: Authentication Throttling Spikes & Credential Stuffing (`AUTH_RATE_LIMITED`)](#runbook-03-authentication-throttling-spikes--credential-stuffing-auth_rate_limited)
- [RUNBOOK-04: MySQL Primary Failover & Replica Promotion](#runbook-04-mysql-primary-failover--replica-promotion)
- [RUNBOOK-05: Redis Queue Jam & Worker Deadlock Recovery](#runbook-05-redis-queue-jam--worker-deadlock-recovery)
- [RUNBOOK-06: Forensic Audit Trail Verification & Tamper Inspection](#runbook-06-forensic-audit-trail-verification--tamper-inspection)
- [RUNBOOK-07: Reconciliation of Stalled Tasks with Orphaned Blocker Links](#runbook-07-reconciliation-of-stalled-tasks-with-orphaned-blocker-links)
- [RUNBOOK-08: User Account Lockout Unlock (`deliverops:unlock-user`)](#runbook-08-user-account-lockout-unlock-deliveropsunlock-user)
- [RUNBOOK-09: Disaster Recovery Re-installation & Spatie Teams Sync](#runbook-09-disaster-recovery-re-installation--spatie-teams-sync)
- [RUNBOOK-10: Cryptographic Audit Chain Integrity Verification](#runbook-10-cryptographic-audit-chain-integrity-verification)

---

## RUNBOOK-01: Circular Dependency Cycle Remediation (`CPM_CYCLE_DETECTED`)

### 1. Symptoms & Alert Triggers
- Client encounters HTTP `422 Unprocessable Content` with machine error code `CPM_CYCLE_DETECTED`.
- Banner appears on Planner View: *"Circular dependency detected among tasks: [TSK-12, TSK-15, TSK-22]. Schedule calculation aborted."*

### 2. Root Cause Analysis
A user or automated integration attempted to link task $A$ as a predecessor of task $B$ while an indirect dependency chain already linked $B \to \dots \to A$. Kahn's topological sort algorithm detected remaining in-degrees $> 0$.

### 3. Triage & Diagnostic Query
Run the following Artisan command or SQL query to trace the cyclic chain for project `01HZYX00000000000000000001`:

```sql
-- Trace all direct dependencies for the project
SELECT td.id, td.task_id, t1.name as task_name, td.predecessor_id, t2.name as predecessor_name
FROM task_dependencies td
JOIN tasks t1 ON td.task_id = t1.id
JOIN tasks t2 ON td.predecessor_id = t2.id
WHERE td.project_id = '01HZYX00000000000000000001';
```

### 4. Remediation Procedure
1. Execute the cycle diagnostics artisan tool:
   ```bash
   php artisan deliverops:diagnose-cycle {projectId}
   ```
2. Identify the newly inserted or conflicting link ID (e.g. `01HZYXDEP00000000000000005`).
3. Delete the offending edge via the REST API or database:
   ```bash
   curl -X DELETE "https://api.deliverops.internal/api/v1/projects/{projectId}/dependencies/{depId}" \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```
4. Re-trigger CPM calculation:
   ```bash
   curl -X POST "https://api.deliverops.internal/api/v1/projects/{projectId}/schedule/cpm" \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

---

## RUNBOOK-02: High Frequency Concurrency Collisions (`CONCURRENCY_CONFLICT`)

### 1. Symptoms & Alert Triggers
- Users experience frequent HTTP `409 Conflict` errors when saving tasks or resizing Gantt bars.
- Sentry / Datadog alerts on error code `CONCURRENCY_CONFLICT`.

### 2. Root Cause Analysis
Multiple project members are modifying the same WBS task simultaneously, or an automated background job (e.g. daily drift calculation) updated the task's `version` column while a user had a dirty client-side buffer.

### 3. Remediation Procedure
1. Verify if the client browser has an active Server-Sent Events (SSE) connection:
   - Check Nginx access logs for `/api/v1/projects/{id}/stream`.
   - If SSE connections are dropping, inspect proxy timeout settings (`proxy_read_timeout 3600s;`).
2. Advise the user to click the **"Rebase & Keep My Edits"** button in the DeliverOps UI.
3. If an automated script is looping, inspect running processes:
   ```bash
   php artisan queue:monitor redis:default,redis:cpm
   ```

---

## RUNBOOK-03: Authentication Throttling Spikes & Credential Stuffing (`AUTH_RATE_LIMITED`)

### 1. Symptoms & Alert Triggers
- Spike in HTTP `429 Too Many Requests` on `/api/v1/auth/login`.
- Error code `AUTH_RATE_LIMITED` returned to multiple endpoints.
- SRE alerts triggered for high failed authentication rates.

### 2. Root Cause Analysis
Brute-force password attack against user accounts, or a misconfigured third-party API integration in an infinite retry loop.

### 3. Remediation Procedure
1. Identify the offending IP address in Redis:
   ```bash
   redis-cli -h $REDIS_HOST keys "deliverops_cache:throttle:auth:*"
   ```
2. Inspect request volume by IP:
   ```bash
   awk '$7 ~ /auth\/login/ {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -n 10
   ```
3. If malicious, block the IP immediately at the Nginx edge or firewall:
   ```bash
   sudo iptables -A INPUT -s 198.51.100.42 -j DROP
   ```
4. If a legitimate corporate user was locked out, clear their rate limit key in Redis:
   ```bash
   redis-cli -h $REDIS_HOST del "deliverops_cache:throttle:auth:198.51.100.42"
   ```

---

## RUNBOOK-04: MySQL Primary Failover & Replica Promotion

### 1. Symptoms & Alert Triggers
- Application returns HTTP `500 Internal Server Error` with `PDOException: Connection refused` or `MySQL server has gone away`.
- Health check endpoint `/health` reports database connectivity failure.

### 2. Remediation Procedure (Emergency Primary Promotion)
1. **Verify Primary Node State**:
   ```bash
   systemctl status mysql || docker logs deliverops-mysql
   ```
2. **Promote Read Replica** (Node 2):
   ```bash
   # Log into Replica MySQL
   mysql -u root -p -e "STOP REPLICA; RESET REPLICA ALL; SET GLOBAL read_only = OFF;"
   ```
3. **Point Application to Promoted Primary**:
   Update `backend/.env` on all PHP-FPM app nodes:
   ```ini
   DB_HOST=10.0.1.102 # IP of promoted replica
   DB_WRITE_HOST=10.0.1.102
   ```
4. **Reload PHP-FPM & Flush Connection Pools**:
   ```bash
   sudo systemctl reload php8.2-fpm
   php artisan config:clear
   php artisan queue:restart
   ```
5. **Verify Database Health**:
   ```bash
   curl -I https://api.deliverops.internal/health
   # Expected: 200 OK {"status": "healthy", "database": "connected"}
   ```

---

## RUNBOOK-05: Redis Queue Jam & Worker Deadlock Recovery

### 1. Symptoms & Alert Triggers
- Asynchronous jobs in queue `cpm` or `notifications` are piling up (`llen > 500`).
- Users report that CPM recalculation or email delivery is delayed by minutes or hours.

### 2. Diagnostic Commands
```bash
# Check queue lengths
redis-cli -h $REDIS_HOST llen queues:cpm
redis-cli -h $REDIS_HOST llen queues:notifications

# Check Supervisord worker process status
sudo supervisorctl status
```

### 3. Remediation Procedure
1. If workers are stuck in a frozen state, restart all queue workers gracefully:
   ```bash
   php artisan queue:restart
   sudo supervisorctl restart all
   ```
2. If poison-pill jobs are causing worker crashes:
   ```bash
   # Inspect failed jobs
   php artisan queue:failed

   # Retry specific failed job after code fix
   php artisan queue:retry {jobId}

   # Or purge poisoned jobs if unrecoverable
   php artisan queue:forget {jobId}
   ```
3. Temporarily scale up worker threads in `/etc/supervisor/conf.d/supervisord.conf`:
   ```ini
   numprocs=6 # Increased from 2 to clear backlog
   ```
   ```bash
   sudo supervisorctl update
   sudo supervisorctl restart deliverops-worker-cpm:*
   ```

---

## RUNBOOK-06: Forensic Audit Trail Verification & Tamper Inspection

### 1. Symptoms & Alert Triggers
- Compliance auditor requests cryptographic verification of the audit trail.
- Security officer investigates an alleged unauthorized task status override.

### 2. Audit Verification Protocol
1. Query the complete change history for the target entity:
   ```sql
   SELECT id, actor_id, action, old_values, new_values, ip_address, created_at
   FROM audit_logs
   WHERE auditable_type = 'App\\Models\\Task'
     AND auditable_id = '01HZYXTASK0000000000000001'
   ORDER BY created_at ASC;
   ```
2. Verify that no records have been altered or deleted:
   ```sql
   -- Check if MySQL trigger is active
   SHOW TRIGGERS WHERE `Table` = 'audit_logs';
   -- Expected triggers: trg_audit_logs_immutable_update, trg_audit_logs_immutable_delete
   ```
3. Generate forensic JSON export for legal discovery:
   ```bash
   php artisan deliverops:export-audit --entity=Task --id=01HZYXTASK0000000000000001 --output=/tmp/audit_export.json
   ```

---

## RUNBOOK-07: Reconciliation of Stalled Tasks with Orphaned Blocker Links

### 1. Symptoms & Alert Triggers
- A task remains in status `Blocked` even though all associated risks in the Risk Register have status `resolved` or `closed`.
- Task `block_reason` shows stale blocker title.

### 2. Root Cause Analysis
An external database edit or unhandled exception during risk update failed to trigger the automated blocker unlinking routine in `ProjectRiskService`.

### 3. Diagnostic Query
```sql
SELECT t.id, t.name, t.status, t.block_reason,
       COUNT(CASE WHEN pr.status IN ('open', 'mitigating') THEN 1 END) as active_blockers_count
FROM tasks t
JOIN risk_task_blockers rtb ON t.id = rtb.task_id
JOIN project_risks pr ON rtb.risk_id = pr.id
WHERE t.status = 'Blocked'
GROUP BY t.id, t.name, t.status, t.block_reason
HAVING active_blockers_count = 0;
```

### 4. Remediation Procedure
Run the automated blocker reconciliation tool:
```bash
php artisan deliverops:reconcile-blockers {projectId}
```
This utility:
1. Inspects all tasks in status `Blocked`.
2. Evaluates the count of linked risks with status $\in \{\text{'open'}, \text{'mitigating'}\}$.
3. If active count $= 0$, automatically parses the pre-blocked state from `block_reason` (e.g. `In Progress` vs `Not Started`), clears `block_reason`, restores the previous status, and records an unblock event in `audit_logs`.

---

## RUNBOOK-08: User Account Lockout Unlock (`deliverops:unlock-user`)

### 1. Symptoms & Alert Triggers
- User reports inability to log in with message: `"Account locked due to consecutive failed attempts"` (HTTP 423 `AUTH_ACCOUNT_LOCKED`).
- Multiple failed login entries recorded in `audit_logs` with event `auth.login_failed`.

### 2. Root Cause Analysis
The user exceeded 5 consecutive invalid password attempts within a 15-minute window, causing the security subsystem to set `locked_until = Carbon::now()->addMinutes(15)` and log a security lockout event.

### 3. Remediation Procedure
Execute the administrative unlock command:
```bash
php artisan deliverops:unlock-user {email}
```
This utility:
1. Locates user by email in active tenant.
2. Clears `locked_until` and resets `failed_login_attempts = 0`.
3. Records an administrative `auth.account_unlocked` entry into `audit_logs`.
4. Prompts user to initiate a password reset if credentials were forgotten.

---

## RUNBOOK-09: Disaster Recovery Re-installation & Spatie Teams Sync

### 1. Symptoms & Alert Triggers
- Fresh staging, disaster recovery, or cold replica environment needs initialization.
- Log error: `"Table 'deliverops.organizations' doesn't exist"` or `"Spatie team context not set"`.

### 2. Remediation Procedure
1. Verify database credentials in `.env` or container environment variables.
2. Ensure Spatie Teams multi-tenancy configuration is active:
   ```bash
   php artisan deliverops:prepare-spatie-teams
   ```
3. Run the automated platform installer:
   ```bash
   php artisan deliverops:install --force
   ```
4. Confirm health check status:
   ```bash
   curl -s http://127.0.0.1:8000/api/v1/system/health | jq .
   ```

---

## RUNBOOK-10: Cryptographic Audit Chain Integrity Verification

### 1. Symptoms & Alert Triggers
- SOC 2 Type II or regulatory compliance audit request.
- Automated security telemetry flags a discrepancy in `audit_logs.hash`.

### 2. Diagnostic & Verification Procedure
Run the cryptographic verification routine via API:
```bash
curl -X GET "https://api.deliverops.internal/api/v1/audit/verify-chain" \
  -H "Authorization: Bearer $SECURITY_ADMIN_TOKEN" \
  -H "X-Organization-Id: $ORG_ID"
```

**Verification Algorithm**:
1. Iterates from genesis block (`prev_hash = '0000000000000000000000000000000000000000000000000000000000000000'`).
2. For each audit log entry $n$, recomputes:
   $$\text{Expected Hash} = \text{SHA-256}(\text{prev\_hash}_{n-1} + \text{Payload}_n)$$
3. If `Expected Hash` $\neq$ `Stored Hash`:
   - Verification halts immediately.
   - Returns compromised block ID, timestamp, and tampered fields.
4. If all hashes match:
   - Returns `{ "status": "VERIFIED", "total_blocks_checked": N, "chain_valid": true }`.


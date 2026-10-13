# DeliverOps SOC 2 Type II Security & Trust Services Criteria Mapping

## 1. Overview
This document specifies the implementation and operational verification of the American Institute of Certified Public Accountants (AICPA) Trust Services Criteria (Security, Availability, Processing Integrity, Confidentiality, and Privacy) for DeliverOps Enterprise.

---

## 2. Common Criteria (Security) Controls

### CC6.1 - Logical Access Controls & Identity Federation
- **Implementation**: DeliverOps mandates SAML 2.0 / OIDC Single Sign-On (SSO) with Okta, Azure AD, and Google Workspace. Just-in-Time (JIT) provisioning synchronizes corporate directory groups with tenant roles. SCIM 2.0 (`/scim/v2/Users`, `/scim/v2/Groups`) automatically deprovisions departed employees in real time.
- **Verification Evidence**: Automated tests in `Phase9EnterpriseComplianceTest::test_sso_and_scim_lifecycle`.

### CC6.6 & CC6.7 - Data in Transit & at Rest Encryption
- **Implementation**:
  - In Transit: TLS 1.3 enforced across all API endpoints, HSTS headers (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`).
  - At Rest: Database tables encrypted with AES-256-GCM. Sensitive tenant secrets (IdP certificates, client secrets, API tokens, webhook signing keys) are encrypted using Laravel's authenticated application envelope encryption (`Encrypted` Eloquent cast).

### CC7.1 - Cryptographic Non-Repudiation & Audit Trail Integrity
- **Implementation**: Every administrative action, task update, financial modification, and security event generates a cryptographically hashed row (`row_hash`) bound to the preceding event (`previous_hash`) in `audit_logs`.
- **Integrity Guarantee**: Row writes are serialized per tenant using an atomic pessimistic lock on `audit_chain_state`. Deleting or inserting arbitrary records invalidates the mathematical chain, detectable via `GET /api/v1/audit/verify`.

---

## 3. Availability Controls (A1.1 - A1.3)
- **High-Availability Clustering**: Microservices deployed in multi-AZ configurations.
- **SLA & Uptime Tracking**: Real-time response times and HTTP status codes recorded in `sla_metrics` (7-day rolling window) and rolled into `sla_metrics_hourly` permanent aggregates. Public uptime verified via `GET /api/v1/status/public`.
- **SLA Target**: 99.95% monthly uptime with automated alerting on p95 latency > 250ms or error rates > 0.1%.

---

## 4. Processing Integrity & Change Management (PI1.1 - PI1.5)
- **Legal Holds**: Deletion of projects and tasks subject to regulatory hold is blocked at the database and application model level (`DomainException`, HTTP 423 Locked).
- **Automated Workflow Governance**: Automation execution depth bounded to 5 hops with atomic deduplication.

---

## 5. Privacy & Data Protection (P1.1 - P8.1)
- **Data Residency**: Tenant regions (`MENA`, `EU`, `US`, `APAC`) are immutable upon tenant creation. Cross-cluster access blocked at edge with HTTP 451.
- **Data Subject Rights**: Automated DSAR export generator (`POST /api/v1/compliance/dsar/export`) and irreversible Right to Erasure anonymization (`POST /api/v1/compliance/erasure`).

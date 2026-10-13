# DeliverOps GDPR Record of Processing Activities (ROPA) & Data Processing Addendum (DPA)

## 1. Scope & Role
- **Data Processor**: DeliverOps acts as a Data Processor on behalf of the customer (Data Controller) regarding project management data, comments, files, and user collaboration records.
- **Data Controller**: DeliverOps acts as Data Controller only regarding account holder billing information and administrative contact details.

---

## 2. Record of Processing Activities (ROPA - Article 30)

| Processing Activity | Categories of Data | Data Subjects | Legal Basis (GDPR Art. 6) | Retention Period |
|---|---|---|---|---|
| Workspace Collaboration | Name, Email, Role, Avatar, Comments | Employees, Contractors | Performance of Contract (6(1)(b)) | Life of Tenant Workspace |
| Task Assignment & Timesheets | Hours logged, labor cost, productivity | Project Personnel | Legitimate Interest (6(1)(f)) | 7 years (statutory financial requirement) |
| System Auditing & Non-Repudiation | User ID, IP address, user-agent, action | All active users | Legal Obligation (6(1)(c)) & Security | Immutable Cryptographic Hash Chain |
| Multi-Platform Notifications | Device push token, platform, device model | Mobile/Web users | Consent / Contract | Pruned upon token invalidation / sign-out |

---

## 3. Data Subject Rights (Articles 15 - 22)

### Article 15 & 20 - Right of Access & Data Portability (DSAR)
- **Endpoint**: `POST /api/v1/compliance/dsar/export`
- **Execution**: Dispatches `ProcessDsarExportJob` (runs in tenant context).
- **Format**: Machine-readable JSON including user profile, authored tasks, comments, time entries, and audit actions.
- **Delivery**: Downloadable via signed, time-limited URL expiring in 24 hours.

### Article 17 - Right to Erasure ("Right to be Forgotten")
- **Endpoint**: `POST /api/v1/compliance/erasure`
- **Execution**:
  1. Verifies the user is not under an active Legal Hold.
  2. Anonymizes user record (`name = 'Anonymized User'`, `email = "erased_{$id}@deliverops.internal"`, `status = 'inactive'`).
  3. Revokes all active personal access tokens and sessions.
  4. Severely terminates OAuth refresh token chains (`rotated_to` chain traversal).
  5. Logs non-repudiable erasure record in audit hash chain.

---

## 4. International Data Transfers & Data Residency (Chapter V)
- Tenants designate geographic regions (`EU`, `MENA`, `US`, `APAC`) at workspace provisioning.
- `EnforceDataResidency` middleware blocks cross-regional request processing with HTTP 451.

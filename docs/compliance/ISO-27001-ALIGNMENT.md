# DeliverOps ISO/IEC 27001:2022 Control Alignment Matrix

## 1. Information Security Management System (ISMS)
DeliverOps operates under an Information Security Management System compliant with ISO/IEC 27001:2022 Annex A controls.

---

## 2. Annex A Control Cross-Walk

| ISO 27001:2022 Control | Control Title | DeliverOps Architectural Implementation |
|---|---|---|
| **A.5.15** | Access Control | Role-Based Access Control (RBAC), fine-grained Spatie permission matrix, multi-factor authentication (TOTP/WebAuthn), and SAML 2.0 / OIDC enterprise SSO. |
| **A.5.17** | Authentication Information | Passwords hashed using Argon2id (memory: 65536, time: 4, threads: 1). SCIM tokens stored as SHA-256 hashes (`token_hash`). |
| **A.5.33** | Protection of Records | Immutable cryptographic audit hash chain in `audit_logs` (`previous_hash` + `row_hash`), serialized via pessimistic lock on `audit_chain_state`. |
| **A.8.1** | User Endpoint Devices | Mobile authentication via RFC 7636 OAuth 2.0 PKCE. Tokens cached in biometric keychain. APNs/FCM push token revocation on device sign-out. |
| **A.8.7** | Protection Against Malware | ClamAV asynchronous scanning daemon inspecting all uploaded project attachments before release (`ScanAttachmentJob`). |
| **A.8.10** | Information Deletion | Automated GDPR Right to Erasure anonymizing user attributes and severing refresh token rotation chains. Legal hold locks preventing deletion during active investigations. |
| **A.8.12** | Data Leakage Prevention | Multi-tenant scoping via `TenantManager`, schema isolation, and real-time PII de-identification in generative AI pipelines (`PiiScrubberService`). |
| **A.8.24** | Use of Cryptography | AES-256 envelope encryption on client secrets and IdP certificates. TLS 1.3 in transit with strict cipher suites. |

---

## 3. Incident Management & Reporting
- Security vulnerabilities reported via RFC 9116 endpoint (`/.well-known/security.txt`).
- SLA and service status published in real-time (`/api/v1/status/public`).

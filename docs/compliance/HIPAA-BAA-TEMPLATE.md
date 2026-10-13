# DeliverOps Business Associate Agreement (BAA) Template

## Business Associate Agreement under HIPAA / HITECH

This Business Associate Agreement ("BAA") is entered into by and between **DeliverOps Inc.** ("Business Associate") and the subscribing enterprise customer ("Covered Entity").

---

## 1. Permitted Uses and Disclosures of Protected Health Information (PHI)
Except as otherwise limited in this Agreement, Business Associate may use or disclose PHI only to perform functions, activities, or services for, or on behalf of, Covered Entity as specified in the DeliverOps Enterprise Terms of Service, provided that such use or disclosure would not violate the Privacy Rule if done by Covered Entity.

---

## 2. Technical Safeguards (45 CFR § 164.312)
1. **Access Controls**: Unique user identification, emergency access procedures, multi-factor authentication (MFA), and automatic session timeouts.
2. **Audit Controls**: Tamper-proof cryptographic audit hash chain tracking all reads, updates, and exports of project metadata and attachments.
3. **Transmission Security**: All PHI transmitted over public networks is protected using TLS 1.3 encryption.
4. **Data at Rest Encryption**: Database volumes and cloud storage containers encrypted using FIPS 140-2 validated AES-256 cipher suites.
5. **Data Residency Guarantees**: Tenant data strictly isolated to designated national boundaries (e.g., US region) preventing cross-border replication.

---

## 3. Breach Notification Requirements (45 CFR § 164.410)
Business Associate shall notify Covered Entity without unreasonable delay and in no case later than twenty-four (24) hours after discovery of any confirmed Breach of Unsecured PHI.

---

## 4. Termination & Return/Destruction of PHI
Upon termination of the Services, Business Associate shall, if feasible, return or securely destroy all PHI received from Covered Entity, utilizing cryptographic erasure algorithms aligned with NIST SP 800-88 Rev. 1.

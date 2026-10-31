# Security Audit Report — Universal Password Bypass Removal

**Date**: 2026-10-31  
**Severity**: CRITICAL (CVSS 9.8 / CWE-798: Use of Hard-coded Credentials / CWE-287: Improper Authentication)  
**Status**: RESOLVED  

---

## 1. Executive Summary

During an internal security review of the NFVS CRM platform, a critical authentication bypass was identified in `src/services/auth.service.ts` and associated modules (`src/lib/offline-auth.ts`, `src/lib/employee-store.ts`, `src/app/api/employees/route.ts`). The system accepted a list of hard-coded master passwords (`Admin@123`, `admin@123`, `Enterprise@2026`, `password`, `123456`, `sayalikale@123`, `Nfventurestudio@123`, etc.) that completely bypassed bcrypt password hash verification for legitimate accounts, including Super Administrator and Executive accounts. Additionally, offline authentication fallbacks synthesized privileged personas and persisted plaintext passwords in employee records.

A comprehensive security overhaul was conducted:
- Universal password bypass logic was completely excised.
- Bcrypt verification against account-specific hashes is now strictly enforced.
- Missing/malformed hashes and inactive accounts are safely rejected.
- Offline persona escalation and plaintext credential persistence were removed.
- 13 automated security tests covering all attack vectors were executed and passed.

---

## 2. Vulnerability Details & Root Cause Analysis

### 2.1 Universal Password Bypass in AuthService
In `src/services/auth.service.ts`, the `verifyCredentials` method evaluated:
```typescript
if (
  passwordPlain === "password" ||
  passwordPlain === "Enterprise@2026" ||
  passwordPlain === "Admin@123" ||
  passwordPlain === "123456" ||
  passwordPlain === "sayalikale@123"
) {
  isValid = true;
} else {
  isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
}
```
**Impact**: An attacker providing any of these universal passwords could authenticate as any valid corporate user in the database (including Super Admin, CEO, CFO, HR) without knowing the user's actual password.

### 2.2 Offline Authentication Backdoor
In `src/lib/offline-auth.ts`, a `MASTER_PASSWORDS` set matched plain passwords and synthesized privileged persona sessions (`buildPersonaUser(ALL_PERSONAS[0], "NFVS")`) when database lookups failed or handles like `superadmin` or `admin` were submitted.
**Impact**: If the database was unavailable or timed out, attackers could authenticate offline with root permissions using default credentials.

### 2.3 Plaintext Password Storage and API Response Leaks
1. `src/data/employees.json` and `src/lib/employee-store.ts` stored plaintext passwords under `loginPassword`.
2. `src/app/api/employees/route.ts` defaulted employee credentials to `"Enterprise@2026"` and `"Admin@123"`, and stored `loginPassword` directly.
3. `src/app/api/settings/users/route.ts` returned full User records in GET and POST responses, leaking `passwordHash`.
4. `src/app/api/hr/password-resets/route.ts` returned `newPassword` in the response JSON payload.

---

## 3. Remediation & Implemented Security Fixes

| Component | File | Security Change |
| :--- | :--- | :--- |
| **AuthService** | `src/services/auth.service.ts` | Removed hard-coded master password branch. Enforced `isValidBcryptHash()` and `bcrypt.compare()` for every email/password login. Enforced safe rejection on missing/malformed hashes and inactive accounts. Banned offline master-password bypass when DB fails. |
| **Offline Auth** | `src/lib/offline-auth.ts` | Removed `MASTER_PASSWORDS` set. Banned offline fallback authentication in production (`NODE_ENV === "production"`). Removed plaintext `loginPassword` comparisons. Removed generic handle role synthesizers (`admin`, `superadmin`). |
| **Session Engine** | `src/lib/auth.ts` | Added `isValidBcryptHash()` and `generateSecureTemporaryPassword()`. Inactive database users are rejected immediately without offline fallback. Disabled offline session synthesis in production. |
| **Employee Store** | `src/lib/employee-store.ts` | Removed `loginPassword` field from `StoredEmployee` interface and `EmployeeStore.create()` / `update()`. Only bcrypt hashes are stored. |
| **Employee JSON Store** | `src/data/employees.json` | Scrubbed all `loginPassword` fields. |
| **Employees API** | `src/app/api/employees/route.ts` | Removed hardcoded default `"Admin@123"` and `"Enterprise@2026"`. Implemented `generateSecureTemporaryPassword()`. Added response sanitization to guarantee no password or password hash is returned. |
| **User Settings API** | `src/app/api/settings/users/route.ts` | Sanitized GET and POST user endpoints to exclude `passwordHash`. Replaced `"Enterprise@2026"` with secure high-entropy temporary passwords. |
| **HR Resets API** | `src/app/api/hr/password-resets/route.ts` | Removed `newPassword` plaintext leak from the response JSON body. |
| **Resend Credentials API** | `src/app/api/employees/[id]/resend-credentials/route.ts` | Removed `"Enterprise@2026"`. Generated cryptographically secure temporary passwords. |
| **Onboarding Service** | `src/services/employee-onboarding.service.ts` | Removed plaintext `loginPassword` assignments; only stores bcrypt hashes. Removed `"Enterprise@2026"` fallback. |
| **HR UI Dossier** | `src/app/app/hr/employees/page.tsx`, `src/modules/hr/employee-profile-dossier.tsx` | Updated UI placeholders to remove references to `"Enterprise@2026"`. |
| **Seed Scripts** | `scripts/seed-fresh-logins.mjs` | Removed universal password constants. Added production guard preventing seed script execution in production. |

---

## 4. Automated Security Test Results

Automated test suite: `scripts/verify-auth-security.ts` (executed via `npm test`):

| Test Case | Description | Result |
| :--- | :--- | :--- |
| **Test 1** | Correct password + correct email → login succeeds | **PASS** |
| **Test 2** | Incorrect password → rejected (returns null) | **PASS** |
| **Test 2 (HTTP)** | Incorrect password via HTTP route → HTTP 401 `INVALID_CREDENTIALS` | **PASS** |
| **Test 3** | Universal passwords (`Admin@123`, `Enterprise@2026`, etc.) + unrelated account → rejected (all 10 bypass attempts blocked) | **PASS** |
| **Test 4** | Universal passwords + Super Admin account → rejected (genuine password succeeds) | **PASS** |
| **Test 5** | Missing password hash → login rejected safely | **PASS** |
| **Test 6** | Malformed password hash → login rejected safely without unhandled exception | **PASS** |
| **Test 7** | Inactive account (`isActive: false`) → login rejected | **PASS** |
| **Test 8** | Unknown email → generic authentication failure without email enumeration | **PASS** |
| **Test 9** | Existing valid bcrypt account → login continues working with trusted DB permissions | **PASS** |
| **Test 10** | Database unavailable → login fails securely; no offline master-password bypass | **PASS** |
| **Test 11** | Production environment → no test credentials or default credentials accepted | **PASS** |
| **Test 12** | API responses → no plaintext password or password hash exposed | **PASS** |

**Summary**: 13 PASSED, 0 FAILED.


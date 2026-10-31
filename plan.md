# Security Plan & Future Authentication Hardening

## 1. Immediate Next Steps (Post-Deployment)

1. **Re-provision PostgreSQL Production Database**
   - The current `DATABASE_URL` in `.env` references an inactive Supabase project (`kzuwrnkheydxunlilhcy`).
   - Provision a fresh managed PostgreSQL instance (Supabase, Neon, AWS RDS, or Railway).
   - Run Prisma migrations (`npx prisma db push` or `npx prisma migrate deploy`).
   - Securely store connection credentials in production environment variables (`DATABASE_URL`, `DIRECT_URL`).

2. **Legacy Account Password Provisioning**
   - Accounts previously provisioned without bcrypt hashes (`passwordHash: null`) will have their logins rejected as intended by security policy.
   - Utilize the HR assisted reset flow (`/app/hr/password-resets`) or send one-time setup invitation links to provision valid bcrypt hashes for these employees.

---

## 2. Medium-Term Authentication Enhancements

1. **Multi-Factor Authentication (MFA / TOTP)**
   - Implement RFC 6238 TOTP (Google Authenticator, Microsoft Authenticator) for privileged roles (`SUPER_ADMIN`, `ADMIN`, `CEO`, `CFO`, `HR`).
   - Require MFA verification code before issuing the `nfvs_session` cookie for elevated accounts.
   - Provide emergency backup recovery codes during MFA enrollment.

2. **Login Rate Limiting & Account Lockout**
   - Implement IP-based and identifier-based rate limiting (e.g., via Upstash Redis or memory token bucket) on `/api/auth/login` and `/api/auth/forgot-password`.
   - Lock accounts temporarily after 5 consecutive failed login attempts within 15 minutes.

3. **Session Revocation & Centralized Token Store**
   - Currently, session tokens are base64-encoded payloads with expiry timestamps.
   - Introduce a database or Redis session store with unique session IDs to allow instantaneous server-side session revocation when an account is suspended or password is changed.

4. **Strict Password Complexity Policy**
   - Enforce minimum 12-character passwords containing uppercase, lowercase, numbers, and symbols.
   - Check proposed passwords against HaveIBeenPwned API or common breached password blocklists.

5. **Security Event Telemetry & Alerting**
   - Send automated webhook or email alerts to Security Administrators when brute-force activity, privilege escalation attempts, or multiple password resets are detected.


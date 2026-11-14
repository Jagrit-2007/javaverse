# JavaVerse Test & CI Coverage Map

> **Audit Target:** Comprehensive test suite mapping, automated assertions, CI pipeline fidelity, and test-data isolation  
> **Test Frameworks:** Vitest 5.0.5 (Unit & Integration), Playwright 1.64.1 (Browser E2E), @axe-core/playwright 4.14.0 (a11y)  
> **CI Pipeline:** GitHub Actions (`.github/workflows/ci.yml`)  

---

## 1. Executive Summary

JavaVerse possesses an extensive automated test suite comprising **53 Vitest test files** (189 web tests + package suites) and **8 Playwright E2E test suites**. During the audit and post-remediation verification:
- All 53 Vitest test files (including the newly added 24-test `repository-alignment.test.ts` suite) **passed 100%**.
- Isolated clean database verification (`pnpm test:clean-db`) **passed 100%**.
- Automated backup and restore disaster recovery drill (`pnpm test:backup-restore`) **passed 100%**.
- Deterministic static hash verification (`pnpm verify:static-hashes`) **passed 100%**.
- Strict database safety guard (`assertSafeTestDatabase`) was verified to intercept and block any destructive operations against `javaverse`.
- GitHub Actions CI (`.github/workflows/ci.yml`) was updated to close all previous coverage gaps.

---

## 2. Comprehensive Test Suite Inventory

### 2.1 Package-Level Unit & Integration Tests (25 Files)

| Package | Test File | Test Suite Focus | Test Count | DB Needed? |
| :--- | :--- | :--- | :--- | :--- |
| `@javaverse/schemas` | `test/auth.test.ts` | Passwords, display names, email normalization | 9 | No |
| `@javaverse/schemas` | `test/env.test.ts` | Environment validation rules, AI keys, ports | 7 | No |
| `@javaverse/schemas` | `test/curriculum.test.ts` | Track slugs, difficulty, content structure | 5 | No |
| `@javaverse/schemas` | `test/practice.test.ts` | Practice problem schemas and test cases | 4 | No |
| `@javaverse/schemas` | `test/ai.test.ts` | Pedagogical analysis schema, AST specs | 6 | No |
| `@javaverse/schemas` | `test/evals.test.ts` | Benchmark test case schemas and scoring | 3 | No |
| `@javaverse/security` | `test/tokens.test.ts` | Domain-separated token hashing, salt | 6 | No |
| `@javaverse/security` | `test/password.test.ts` | Argon2id hashing, whitespace policy, breach check | 8 | No |
| `@javaverse/security` | `test/csrf.test.ts` | Double-submit cookie verification, HMAC signing | 7 | No |
| `@javaverse/security` | `test/rateLimit.test.ts` | Redis sliding window, fail-closed semantics | 6 | Mock Redis |
| `@javaverse/security` | `test/totp.test.ts` | RFC 6238 TOTP validation, time drift, encryption | 9 | No |
| `@javaverse/security` | `test/recovery.test.ts` | 16-character alphanumeric backup codes | 5 | No |
| `@javaverse/security` | `test/piiScrubber.test.ts` | Regex redaction of emails, SSNs, credit cards | 8 | No |
| `@javaverse/security` | `test/redaction.test.ts` | Log payload redaction and sensitive fields | 6 | No |
| `@javaverse/security` | `test/redirects.test.ts` | Open redirect protection, returnUrl validation | 5 | No |
| `@javaverse/security` | `test/magicBytes.test.ts` | Header inspection for file uploads | 6 | No |
| `@javaverse/security` | `test/keys.test.ts` | Master key derivation, fallback keys | 4 | No |
| `@javaverse/security` | `test/email.test.ts` | Email canonicalization, punycode conversion | 6 | No |
| `@javaverse/security` | `test/audit.test.ts` | Security audit logging structure | 3 | No |
| `@javaverse/observability`| `test/context.test.ts` | AsyncLocalStorage correlation context propagation | 5 | No |
| `@javaverse/ai` | `test/mock.test.ts` | Deterministic mock provider generation | 4 | No |
| `@javaverse/ai` | `test/evals.test.ts` | Golden set pedagogical evaluation runner | 5 | No |
| `@javaverse/ai` | `test/providers-compliance.test.ts` | Anthropic and Gemini provider compliance | 6 | No |
| `@javaverse/sandbox` | `test/mock.test.ts` | Mock sandbox execution engine | 8 | No |
| `@javaverse/sandbox` | `test/containerRunner.test.ts` | Docker container runner validation | 8 | No |

### 2.2 Web Application Integration Tests (27 Files, 165 Tests)

| Test File | Focus Area | Assertions & Scenarios | Database Target |
| :--- | :--- | :--- | :--- |
| `signup.test.ts` | Signup Flow & 5-Account Limit | Atomic advisory lock, duplicate email, 5-account limit rejection | `javaverse_test` |
| `sessions.test.ts` | Session Lifecycle & Reauth | Idle timeout, session revocation, reauth window | `javaverse_test` |
| `csrf-ratelimit.test.ts` | CSRF & Rate Limiting | Double-submit CSRF, IP rate limit, Redis outage fail-closed | `javaverse_test` |
| `credentials-reliability.test.ts` | Password Policy & Sign-In | Whitespace rejection, Unicode, canonical email login | `javaverse_test` |
| `chat-jobs-sse.test.ts` | Ask-AI, BullMQ & SSE | Message posting, BullMQ queue, SSE stream events | `javaverse_test` |
| `chat-concurrency.test.ts` | Chat Concurrency Lock | Advisory lock preventing parallel jobs on same chat slot | `javaverse_test` |
| `sse-cleanup.test.ts` | SSE Abort & Redis Unsubscribe | Client disconnect cleanup, memory leak prevention | `javaverse_test` |
| `ai-limits.test.ts` | AI Usage Quotas & Limits | 50 req/day per user, 2 concurrent global, lock TTL | `javaverse_test` |
| `ai-providers.test.ts` | Provider Transparency | GET `/api/v1/ai/providers`, active provider metadata | `javaverse_test` |
| `dev-db-persistence.test.ts` | Installation Isolation | Disposable accounts invisible in primary database | `javaverse_test` |
| `db-safety-guard.test.ts` | Database Protection Guard | Rejection of `javaverse`, allowlist enforcement | In-Memory / URL |
| `lessons.test.ts` | Curriculum & Progress | Lesson retrieval, quiz submission, challenge completion | `javaverse_test` |
| `practice.test.ts` | Practice & Code Execution | Problem catalog, test runner execution, submissions | `javaverse_test` |
| `kb-evals.test.ts` | Knowledge Base & Consent | Learner consent gate, verification gate, PII purge | `javaverse_test` |
| `uploads.test.ts` | Attachment Security | MIME validation, size caps, quarantine/clean flow | `javaverse_test` |
| `mailpit.test.ts` | Transactional Email | SMTP delivery, fragment tokens, Mailpit API check | Mailpit API |
| `theme.test.ts` | Theme Preference & Storage | Theme cookies, dark/light persistence | `javaverse_test` |
| `production-hardening.test.ts` | CSP, Nonce & Headers | Dynamic nonces, static hash synchronization, HSTS | Web Server |
| `tokens.test.ts` | Design Token Integrity | CSS custom properties, color contrast standards | JSDOM |
| `ThemeScript.test.ts` | Theme Injection Script | Anti-flash inline script execution | JSDOM |
| `repository-alignment.test.ts` | Repository Integrity & Alignment | 24-test suite: package scripts, env vars, email copy, sandbox policy, static hashes, operations runbook, DB safety | `javaverse_test` |

### 2.3 Playwright Browser E2E Test Suites (8 Suites, 2 Projects: Chromium + Firefox)

| Spec File | Feature / Flow Tested | Scenarios Covered |
| :--- | :--- | :--- |
| `test/e2e/auth.spec.ts` | Authentication & Account Lifecycle | Public signup, login, remember-me, logout, returnUrl, legacy redirect `/auth/bootstrap` -> `/auth/signup`, assertion that Admin link is absent. |
| `test/e2e/ask-ai.spec.ts` | Ask-AI Workspace & Transparency | 27-scenario suite: composer mount, Send Question button, Local Mock banner, token usage (`Local Mock · No external token usage`), cross-user chat isolation, dark mode. |
| `test/e2e/curriculum.spec.ts` | Curriculum Catalog & Lessons | Track browsing, 3 content depth tabs, interactive quiz submission, challenge workspace. |
| `test/e2e/practice.spec.ts` | Practice Problems & Runner | Problem catalog, code editor, test execution, submission feedback. |
| `test/e2e/routes.spec.ts` | Route Navigation & Protection | Public pages, unauthenticated redirects (`/dashboard` -> `/auth/login`), navigation integrity. |
| `test/e2e/a11y.spec.ts` | WCAG 2.2 AA Accessibility | Automated `@axe-core/playwright` accessibility audit across public and authenticated dashboard views. |
| `test/e2e/screenshots.spec.ts` | Visual Regression Screenshots | Captures desktop/mobile light/dark dashboard states under `E2E_FIXTURES_ENABLED=true`. |
| `test/e2e/e2e-journey.spec.ts` | Complete Learner User Journey | Full end-to-end user story: signup -> lesson -> quiz -> practice -> ask question -> logout. |

---

## 3. Database Safety Guard & Test Isolation Audit

### 3.1 Safety Implementation (`packages/db/src/safety.ts`)
```ts
export const ALLOWED_TEST_DATABASES = [
  'javaverse_test',
  'javaverse_clean_verify',
  'javaverse_backup_verify_test',
] as const;

export const FORBIDDEN_TEST_DATABASES = [
  'javaverse',
  'postgres',
  'production',
  'prod',
  'template0',
  'template1',
] as const;
```
- Every destructive test helper calls `assertSafeTestDatabase(databaseUrl)`.
- If `databaseUrl` contains `javaverse` or is not in `ALLOWED_TEST_DATABASES`, it throws a critical data-safety violation error immediately.
- `apps/web/playwright.config.ts` calls `assertSafeTestDatabase(TEST_DATABASE_URL)` before launching the test web server.

---

## 4. GitHub Actions CI vs. Local Verification Alignment (Remediated)

| Verification Check | Local Command | Present in GitHub Actions CI? | Status |
| :--- | :--- | :--- | :--- |
| **Code Formatting** | `pnpm format:check` | **Yes** | Active |
| **Linting** | `pnpm lint` | **Yes** | Active |
| **Strict Typecheck** | `pnpm typecheck` | **Yes** | Active |
| **Unit & Integration Tests**| `pnpm test` | **Yes** (against `javaverse_test`) | Active |
| **Production Build** | `pnpm build` | **Yes** | Active |
| **Static Hash Verification** | `pnpm verify:static-hashes` | **Yes** | Active |
| **Lighthouse Audit** | `pnpm test:lighthouse` | **Yes** | Active |
| **Gitleaks Secret Scan** | Pinned `v8.30.1` | **Yes** | Active |
| **OSV-Scanner** | Pinned `v2.7.0` | **Yes** | Active |
| **Playwright Browser E2E** | `pnpm --filter @javaverse/web test:e2e` | **Yes** (Chromium / Firefox) | Added to CI |
| **Clean DB Re-Migration** | `pnpm test:clean-db` | **Yes** | Added to CI |
| **Backup & Restore Drill** | `pnpm test:backup-restore`| **Yes** | Added to CI |
| **MinIO S3 Service** | `docker compose up -d minio` | **Yes** | Added to CI |

---

## 5. Post-Remediation Verification Summary

1. **Email Helper Refactoring:** `apps/web/test/integration/mailpit.test.ts` was updated to test `sendVerificationEmail` with subject `'Verify your JavaVerse email'`, verifying neutral copy, fragment tokens (`#token=`), and absence of role terminology.
2. **CI Pipeline Alignment:** Added missing services (`minio`) and test steps (`test:clean-db`, `test:backup-restore`, `verify:static-hashes`, and Playwright E2E with browser installation) to `.github/workflows/ci.yml`.
3. **Dedicated Alignment Suite:** Added `apps/web/test/integration/repository-alignment.test.ts` validating all 24 authoritative repository integrity requirements.


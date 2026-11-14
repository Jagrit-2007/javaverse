# JavaVerse Stale and Contradictory Content Audit

> **Audit Target:** Comprehensive keyword scan and structural contradiction analysis  
> **Scope:** Entire repository on branch `fix/phases-4-11-owner-audit` (`HEAD: 5207257`)  
> **Standard Classifications:** Active current behavior, Current internal implementation detail, Current test-only data, Historical migration, Historical decision, Stale documentation, Stale code, Stale test, Stale screenshot, Unsafe claim, Acceptable occurrence.

---

## 1. Executive Summary

This audit systematically searches and classifies occurrences of superseded concepts, legacy role terminology, outdated architectural assumptions, and conflicting documentation claims across all 407 tracked files in JavaVerse.

While the database schema and active authentication pipelines have been successfully refactored to the single-learner-account model (where all accounts possess identical learner permissions and zero `role` columns exist), several acute contradictions, dead scripts, stale email helpers, and conflicting documentation statements remain. These must be remediated prior to merging into main.

---

## 2. Terminology Frequency & Classification Matrix

| Search Term | Total Matches | Dominant Classification | Key Locations & Risk |
| :--- | :--- | :--- | :--- |
| `OWNER` | 32 | Historical migration / decision | Migrations 1 & 6, `docs/DECISIONS.md`, `docs/PROGRESS.md` |
| `MEMBER` | 20 | Historical migration / decision | Migrations 1 & 6, `docs/DECISIONS.md`, `apps/web/src/lib/email.ts` |
| `owner` | 71 | Stale code / Dead script / Docs | Root `package.json` line 21, `apps/web/src/lib/email.ts` line 26, `DECISIONS.md` |
| `member` | 39 | Stale code / Tests / Docs | `apps/web/src/lib/email.ts` line 65, `mailpit.test.ts` line 50 |
| `admin` | 85 | Stale UI copy / MinIO config | `auth/suspended/page.tsx`, `.env.example` (minioadmin), `middleware.ts` redirects |
| `administrator` | 7 | Stale UI copy / Stale email | `apps/web/src/app/(public)/auth/suspended/page.tsx`, `email.ts` line 72 |
| `workspace owner` | 6 | Historical decisions / logs | `docs/DECISIONS.md`, `docs/PROGRESS.md` |
| `bootstrap` | 45 | Dead script / Historical | Root `package.json` line 21, `middleware.ts` redirects, `RISK_REGISTER.md` |
| `bootstrap token` | 12 | Historical decisions / risks | `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/RISK_REGISTER.md` |
| `invitation` | 50 | Stale code / Dead CSS / Tests | `email.ts` line 65, `SecuritySettings.module.css` line 48, `mailpit.test.ts` |
| `invite` | 37 | Stale env / redirects | `.env.example` (`REGISTRATION_MODE=invite_only`), `middleware.ts` |
| `seats` | 2 | Historical decisions | `docs/DECISIONS.md` line 389, 517 |
| `tenant` | 2 | Historical decisions | `docs/DECISIONS.md` line 389, 517 |
| `privileged` | 4 | Code comment / Decisions | `apps/web/src/lib/auth.ts` line 40, `docs/DECISIONS.md` line 517 |
| `first user` / `first account` | 1 | Historical decisions | `docs/DECISIONS.md` line 517 |
| `Verified in Sandbox` | 4 | Negative tests / Decisions | `apps/web/test/e2e/ask-ai.spec.ts` line 111 (verifies absence), `DECISIONS.md` |
| `container_runner` | 25 | Documentation contradiction | `docs/DECISIONS.md` line 213 vs 352, `OPERATIONS.md`, `ROADMAP_AUDIT` |
| `35%` | 2 | Test fixture data / CSS width | `apps/web/src/components/fixtures/dashboardData.ts`, `dashboard/page.tsx` |
| `70%` | 0 (in raw term) | Test fixture data | `apps/web/src/components/fixtures/dashboardData.ts` line 52 (`percentage: 70`) |
| `Completed 2 days ago` | 1 | Test fixture data | `apps/web/src/components/fixtures/dashboardData.ts` line 111 |
| `AI_MODEL_PRIMARY` | 1 | Historical report | `docs/PROGRESS.md` line 657 (not in active `EnvSchema`) |
| `E2E_FIXTURES_ENABLED` | 21 | Test harness gate | Gating fixture states in `apps/web/src/app/(dashboard)/dashboard/page.tsx` |
| `example.local` / `javaverse.local` | 64 | Acceptable test domains | `apps/web/test/`, `packages/security/test/`, `.env.example` |
| `mock provider` | 3 | Acceptable documentation | `README.md` line 15, `about/page.tsx` line 61, `packages/schemas` test |
| `production ready` / `merge ready` | 0 | Prohibited claims | Not found in code; accurately avoided in current branch |

---

## 3. High-Severity Contradictions & Stale Items

### 3.1 Contradiction: Sandbox Runner Status (`container_runner`)
- **Severity:** CRITICAL / HIGH
- **Conflicting Files:**
  - `AGENTS.md` (lines 17–18): *"The container-based runner remains: REJECTED until a separate security feasibility review explicitly approves it. Use SANDBOX_PROVIDER=mock."*
  - `docs/DECISIONS.md` line 213: *"`container_runner` is ratified as the primary production sandbox execution provider for Java code (`eclipse-temurin:21-alpine` pinned), with `mock` retained for development, fast local testing, and offline fallback."*
  - `docs/DECISIONS.md` line 352: *"Note: `container_runner` remains REJECTED (`SANDBOX_PROVIDER=mock`)."*
  - `docs/runbooks/OPERATIONS.md` lines 38–42: Diagrams the Java 21 Sandbox Container (`eclipse-temurin:21`) as an active production architectural tier.
  - `docs/reviews/ROADMAP_AUDIT_PHASES_4_11.md` line 62: Lists `container_runner (Primary)`.
- **Why Stale:** Phase 6 feasibility spike never formally verified gVisor containment or rootless execution in a dedicated hardened VM. Product rules explicitly maintain `container_runner` as REJECTED.
- **Correct Current State:** `SANDBOX_PROVIDER=mock` is the sole approved provider. `container_runner` code in `sandbox/src/containerRunner.ts` is an unapproved, unverified candidate.
- **Recommended Action:** Update `docs/DECISIONS.md`, `docs/runbooks/OPERATIONS.md`, and `docs/reviews/ROADMAP_AUDIT_PHASES_4_11.md` to remove claims that `container_runner` is ratified or primary.

### 3.2 Stale Code: Dead Script in `package.json`
- **Severity:** HIGH (Merge Blocker)
- **File Path:** `package.json#L21`
- **Current Text:** `"bootstrap:owner": "node scripts/bootstrap-owner.mjs"`
- **Why Stale:** `scripts/bootstrap-owner.mjs` was deleted during the single-learner-account migration. Running `pnpm bootstrap:owner` crashes immediately with `MODULE_NOT_FOUND`.
- **Correct Current State:** JavaVerse uses public local signup with a hard limit of 5 accounts. Bootstrap tokens and owner initialization are permanently removed.
- **Recommended Action:** Delete line 21 from root `package.json`.

### 3.3 Stale Code: Email Verification Helper Sending 'Owner' Subject
- **Severity:** HIGH (User-Facing Integrity Blocker)
- **File Path:** `apps/web/src/lib/email.ts#L26-L52` & `apps/web/src/app/api/v1/auth/email/resend-verification/route.ts#L1,L83`
- **Current Text:**
  ```ts
  // email.ts line 36:
  subject: 'Verify your JavaVerse Owner email',
  // email.ts line 50:
  <h2>Verify your JavaVerse Owner email</h2>
  ```
  Active route `resend-verification` invokes `sendOwnerVerificationEmail`: 
  ```ts
  sendOwnerVerificationEmail({ email: sessionCtx.user.email, token: rawToken })
  ```
- **Why Stale:** The account role `OWNER` was eradicated. Normal learner accounts requesting verification receive an email claiming they are an 'Owner'.
- **Correct Current State:** The function should be `sendVerificationEmail`, subject should be `Verify your JavaVerse account email`, and the heading should say `Verify your JavaVerse account`.
- **Recommended Action:** Refactor `sendOwnerVerificationEmail` to `sendVerificationEmail`, update subject/body copy, and update references in `resend-verification/route.ts` and `mailpit.test.ts`.

### 3.4 Stale Code: Dead Invitation Email Helper in `apps/web/src/lib/email.ts`
- **Severity:** MEDIUM
- **File Path:** `apps/web/src/lib/email.ts#L65-L102`
- **Current Text:** Defines `export async function sendMemberInvitationEmail(...)` referencing `inviter || 'The workspace administrator'` and `Accept Invitation`.
- **Why Stale:** Invitation onboarding was permanently removed in migration `20261109210000_single_learner_account_model`. No product route calls this function.
- **Correct Current State:** Invitations do not exist in JavaVerse.
- **Recommended Action:** Remove `sendMemberInvitationEmail` from `apps/web/src/lib/email.ts` and update `apps/web/test/integration/mailpit.test.ts` to test only active transactional email flows (verification, password reset).

### 3.5 Stale Configuration: Inactive `REGISTRATION_MODE`
- **Severity:** MEDIUM (Config Drift)
- **File Paths:**
  - `.env.example#L27`: `REGISTRATION_MODE=invite_only`
  - `scripts/generate-env-local.mjs#L29`: `REGISTRATION_MODE=invite_only`
  - `packages/schemas/src/env.ts#L34`: `REGISTRATION_MODE: z.enum(['invite_only', 'open', 'closed']).default('open'),`
  - `turbo.json#L28`: `"REGISTRATION_MODE",`
- **Why Stale:** The `registration_mode` column was dropped from `deployment_limits` in PostgreSQL. Neither `apps/web` nor `apps/worker` reads `REGISTRATION_MODE`. Signup is always open until the 5-account limit is reached.
- **Correct Current State:** JavaVerse registration mode is non-configurable; it is always public local signup up to 5 accounts.
- **Recommended Action:** Remove `REGISTRATION_MODE` from `.env.example`, `scripts/generate-env-local.mjs`, `packages/schemas/src/env.ts`, and `turbo.json`.

### 3.6 Stale UI Copy: Suspended Account Page
- **Severity:** LOW / MEDIUM
- **File Path:** `apps/web/src/app/(public)/auth/suspended/page.tsx#L36,L42`
- **Current Text:**
  - Line 36: *"Your JavaVerse account has been temporarily suspended by the administrator."*
  - Line 42: *"If you believe this is in error, please contact your workspace administrator or support."*
- **Why Stale:** Uses superseded administrative hierarchy terminology (*"the administrator"*, *"workspace administrator"*).
- **Correct Current State:** In a local-first platform without administrators, account suspension is either a local operator intervention or disabled status. Copy should read: *"Your JavaVerse account has been suspended by the platform operator. If you believe this is in error, contact support or inspect your local installation configuration."*
- **Recommended Action:** Update copy in `suspended/page.tsx`.

### 3.7 Stale Dead CSS: `.invitationList` in Security Settings
- **Severity:** LOW (Dead CSS)
- **File Path:** `apps/web/src/app/(dashboard)/dashboard/settings/security/SecuritySettings.module.css#L47-L48`
- **Current Text:** `.sessionList, .invitationList {`
- **Why Stale:** The invitation UI was eradicated. `.invitationList` is unused.
- **Correct Current State:** Only `.sessionList` is used.
- **Recommended Action:** Remove `.invitationList` selector.

### 3.8 Stale Route Badge: `/dashboard/notes` Shell Preview
- **Severity:** MEDIUM (UI Polish)
- **File Path:** `apps/web/src/app/(dashboard)/dashboard/notes/page.tsx#L16`
- **Current Text:** `phaseBadge="Phase 2 Shell Preview · Notebook features activate in Phase 8"`
- **Why Stale:** Phase 8 is completed, but notes functionality remains an unpopulated preview shell.
- **Correct Current State:** Badge should accurately state: *"Feature Preview · Study notebook is scheduled for a future milestone"*.
- **Recommended Action:** Update badge text.

### 3.9 Documentation Drift: Operational Runbooks Claiming Production Deployment
- **Severity:** HIGH (Unsafe Operational Claim)
- **File Path:** `docs/runbooks/OPERATIONS.md#L1,L38-L42`
- **Current Text:** Claims to be *"Production Operations & Runbooks"* for *"operating a production JavaVerse deployment"* and diagrams the Java 21 Sandbox Container.
- **Why Stale:** JavaVerse is explicitly NOT approved for public production deployment; sandbox container execution is REJECTED.
- **Correct Current State:** `OPERATIONS.md` is an operator runbook for local-first and self-hosted non-production instances.
- **Recommended Action:** Retitle `OPERATIONS.md` to *"JavaVerse Self-Hosting & Local Operations Guide"* and add an explicit banner noting that public multi-tenant production hosting is outside v1.

---

## 4. Analysis of Acceptable Term Occurrences

The following occurrences of sensitive keywords were audited and verified as **ACCEPTABLE**: 

1. **Historical Applied Migrations:**
   - `packages/db/prisma/migrations/20261026164311_foundation/migration.sql` lines 17, 28, 32 contain `"role" TEXT NOT NULL DEFAULT 'MEMBER'`, `"invitations"`. These are immutable historical schema migrations. They must NOT be edited.
   - `packages/db/prisma/migrations/20261109210000_single_learner_account_model/migration.sql` lines 9, 14, 18, 21 reference `role`, `OWNER`, `MEMBER`, and `invitations` to safely drop them. This is correct forward-only migration design.
2. **Historical Decision & Progress Records:**
   - `docs/DECISIONS.md` (lines 510–553) and `docs/PROGRESS.md` (lines 580, 652, 758) document the historical decision to eradicate OWNER, MEMBER, and bootstrap tokens. Preserving this in decision records is necessary for historical transparency.
3. **Negative E2E Test Assertions:**
   - `apps/web/test/e2e/auth.spec.ts` line 192: `expect(page.locator('text=Workspace Learner Invitations')).not.toBeVisible()`
   - `apps/web/test/e2e/auth.spec.ts` line 360: `expect(page.locator('aside a:has-text("Admin")')).not.toBeVisible()`
   - `apps/web/test/e2e/ask-ai.spec.ts` line 111: `expect(page.locator('text=Verified in Sandbox')).not.toBeVisible()`
   These tests assert that superseded UI elements are NOT visible.
4. **35%, 70%, and 'Completed 2 days ago' in Deterministic Fixture:**
   - `apps/web/src/components/fixtures/dashboardData.ts` (lines 50, 52, 111): These hardcoded values are part of `DETERMINISTIC_DASHBOARD_DATA`, strictly gated behind `E2E_FIXTURES_ENABLED=true` for automated visual regression tests (Phase 2 screenshots). Real dashboard requests fetch live user progress from PostgreSQL.
5. **Middleware Redirects:**
   - `apps/web/src/middleware.ts` (lines 14–19): Neutral redirects for legacy URLs (`/auth/bootstrap` -> `/auth/signup`, `/admin` -> `/dashboard`) prevent 404 errors for bookmark users while ensuring no admin UI can be mounted.
6. **MinIO Default Credentials (`minioadmin`):**
   - `.env.example`, `infra/docker-compose.yml`, `packages/schemas/src/env.ts` use `minioadmin` for local private S3 storage. This is standard local development convention and distinct from application administrative roles.
7. **Synthetic Test Data (`admin@secretcorp.com`):**
   - `apps/web/test/integration/kb-evals.test.ts` (line 59): Synthetic test payload used to verify that the PII scrubber redacts corporate email addresses.

---

## 5. Summary Contradiction & Remediation Matrix

| Item # | Surface A | Surface B | Nature of Contradiction | Severity | Post-Remediation Status | Resolution Detail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **C-1** | `AGENTS.md` (Sandbox container runner REJECTED) | `DECISIONS.md`, `OPERATIONS.md` (Ratified/Production container runner) | Architecture contradiction | **CRITICAL** | **RESOLVED** | Harmonized `DECISIONS.md`, `RISK_REGISTER.md`, `OPERATIONS.md`, and `sandbox/src/factory.ts` (`mock` active, `container_runner` REJECTED). |
| **C-2** | Root `package.json#L21` (`bootstrap:owner` script) | Filesystem (`scripts/bootstrap-owner.mjs` deleted) | Dead script pointing to missing file | **HIGH** | **RESOLVED** | Deleted line 21 from root `package.json`. |
| **C-3** | `email.ts#L26` (Subject: Verify Owner email) | `schema.prisma` & Single-account architecture | Normal learners receive 'Owner' email | **HIGH** | **RESOLVED** | Refactored to `sendVerificationEmail` with neutral subject `'Verify your JavaVerse email'`. |
| **C-4** | `.env.example`, `env.ts` (`REGISTRATION_MODE=invite_only`) | DB Migration 6 & `signup/route.ts` (open public signup up to 5) | Dead configuration in active schemas | **MEDIUM** | **RESOLVED** | Removed `REGISTRATION_MODE` from `.env.example`, `scripts/generate-env-local.mjs`, `packages/schemas/src/env.ts`, `turbo.json`. |
| **C-5** | `email.ts#L65` (`sendMemberInvitationEmail`) | Entire application (zero invitation routes) | Dead product helper | **MEDIUM** | **RESOLVED** | Deleted `sendMemberInvitationEmail` from `apps/web/src/lib/email.ts` and updated `mailpit.test.ts`. |
| **C-6** | `suspended/page.tsx` (references workspace administrator) | Single-account local-first architecture | Stale UI copy | **LOW** | **RESOLVED** | Updated copy to neutral non-administrative language with "Return to Sign in" action. |
| **C-7** | `dashboard/notes/page.tsx` (notes activate in Phase 8) | Git commit history (Phase 8 completed) | Stale feature preview badge | **MEDIUM** | **RESOLVED** | Updated to Outcome B (intentional future-feature preview shell) with neutral copy. |
| **C-8** | `OPERATIONS.md` (claims Production operations) | Product definition (NOT approved for public production) | Unsafe documentation claim | **HIGH** | **RESOLVED** | Completely rewritten as *JavaVerse Self-Hosting & Local Operations Guide* with non-production warnings. |

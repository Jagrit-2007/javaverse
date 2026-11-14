# JavaVerse Remediation Backlog

> **Audit Target:** Prioritized action items identified during the authoritative repository audit  
> **Target Branch:** `fix/phases-4-11-owner-audit`  
> **Status:** Post-Remediation Truth Ledger — REM-02 through REM-14 are fully RESOLVED in this working tree; REM-01 remains pending project maintainer license selection (P0 blocker for open-source release, non-blocking for internal merge); REM-15 and REM-16 are deferred future roadmap items.

---

## 1. Backlog Summary Matrix

| ID | Priority | Scope | Title | Resolution Status | Resolution Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REM-01** | **P0** | S | Commit Authoritative Open-Source `LICENSE` File | **PENDING MAINTAINER CHOICE** | Documented in `README.md`, `OPEN_SOURCE_READINESS_AUDIT.md`, `RISK_REGISTER.md` (RSK-39). P0 blocker for open-source release; non-blocking for internal technical merge. |
| **REM-02** | **P1** | XS | Remove Dead `bootstrap:owner` Script from `package.json` | **RESOLVED** | Removed line from root `package.json`. Verified by `repository-alignment.test.ts`. |
| **REM-03** | **P1** | S | Refactor `sendOwnerVerificationEmail` & Purge Dead Invitation Helper | **RESOLVED** | Refactored `apps/web/src/lib/email.ts` to `sendVerificationEmail` with neutral copy. Purged `sendMemberInvitationEmail`. Updated route and `mailpit.test.ts`. |
| **REM-04** | **P1** | S | Purge Inactive `REGISTRATION_MODE` from Config & Schemas | **RESOLVED** | Removed from `.env.example`, `scripts/generate-env-local.mjs`, `packages/schemas/src/env.ts`, `turbo.json`. |
| **REM-05** | **P1** | M | Resolve Sandbox `container_runner` Contradictions in Documentation | **RESOLVED** | Harmonized `docs/DECISIONS.md`, `docs/RISK_REGISTER.md`, `docs/runbooks/OPERATIONS.md`, `sandbox/src/factory.ts` (`SANDBOX_PROVIDER=mock` active, `container_runner` REJECTED). |
| **REM-06** | **P1** | XS | Update Stale Administrator Copy on Suspended Account Page | **RESOLVED** | Updated `apps/web/src/app/(public)/auth/suspended/page.tsx` with neutral platform operator copy. |
| **REM-07** | **P1** | S | Prevent `pnpm build` from Dirtying `static-hashes.ts` in Git | **RESOLVED** | Sorted traversal in `scripts/extract-static-hashes.mjs`, added no-op equality check, deleted duplicate `static-hashes.json`, added `pnpm verify:static-hashes`. |
| **REM-08** | **P2** | M | Expand GitHub Actions CI (Playwright, Clean DB, Backup/Restore) | **RESOLVED** | Updated `.github/workflows/ci.yml` with `test:clean-db`, `test:backup-restore`, `verify:static-hashes`, MinIO container, and focused Playwright E2E. |
| **REM-09** | **P2** | S | Update Stale `/dashboard/notes` Preview Shell Copy | **RESOLVED** | Updated `apps/web/src/app/(dashboard)/dashboard/notes/page.tsx` to Outcome B intentional feature preview shell with neutral messaging. |
| **REM-10** | **P2** | S | Scope `OPERATIONS.md` to Local Self-Hosting & Add Disclaimers | **RESOLVED** | Completely rewrote `docs/runbooks/OPERATIONS.md` as *JavaVerse Self-Hosting & Local Operations Guide* with non-production warnings. |
| **REM-11** | **P2** | M | Add Open-Source Governance Suite (`SECURITY.md`, `CONTRIBUTING.md`, etc.) | **DEFERRED (OUT OF SCOPE)** | Governance documents should accompany the maintainer's chosen root `LICENSE`. |
| **REM-12** | **P3** | S | Add Missing Env Vars (`GEMINI_MODEL`, etc.) to `turbo.json` | **RESOLVED** | Added `ANTHROPIC_MODEL`, `EXTERNAL_AI_ENABLED`, `EXTERNAL_AI_DAILY_REQUEST_LIMIT_PER_USER`, `EXTERNAL_AI_MAX_CONCURRENCY`, `GEMINI_MODEL` to `turbo.json`. |
| **REM-13** | **P3** | XS | Clean Dead `.invitationList` Selector from `SecuritySettings.module.css` | **RESOLVED** | Removed `.invitationList` from `apps/web/src/app/(dashboard)/dashboard/settings/security/SecuritySettings.module.css`. |
| **REM-14** | **P3** | M | Author Comprehensive `PROJECT_SPEC.md` from Decisions & Architecture | **RESOLVED** | Transformed `PROJECT_SPEC.md` into an authoritative navigation index directing readers to `JAVAVERSE_PROJECT_DOSSIER.md` and `docs/DECISIONS.md`. |
| **REM-15** | **P4** | L | Implement Phase 6 Sandbox Security Feasibility Spike | **DEFERRED** | Future architectural roadmap item requiring dedicated Linux VM with gVisor. |
| **REM-16** | **P4** | L | Implement Full Interactive Learner Study Notes Interface | **DEFERRED** | Future product roadmap item. |

---

## 2. Detailed Remediation Action Cards

### `REM-01`: Commit Authoritative Open-Source `LICENSE` File
- **Priority:** **P0** (Legal & Open-Source Blocker)
- **Status:** **PENDING MAINTAINER CHOICE** (Documented; non-blocking for internal technical merge)
- **Scope:** S
- **Evidence:** The repository lacks a root `LICENSE` file. `LICENSES.md` lists third-party licenses only. Without a root license, third-party users and contributors have no legal rights to use or modify JavaVerse.
- **Affected Files:**
  - `LICENSE` (new file)
  - `README.md`
- **Recommended Correction:** The project maintainer must select and commit an authoritative open-source license (e.g. Apache-2.0 or MIT) at the root of the repository, and reference it in `README.md`.
- **Resolution Summary:** Documented extensively in `README.md`, `OPEN_SOURCE_READINESS_AUDIT.md`, and `docs/RISK_REGISTER.md` (RSK-39). The platform is clearly designated as "source-visible and preparing for open-source release" until the maintainer chooses the license.
- **Dependencies:** Maintainer decision on project license.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-02`: Remove Dead `bootstrap:owner` Script from `package.json`
- **Priority:** **P1** (Merge Blocker)
- **Status:** **RESOLVED**
- **Scope:** XS
- **Evidence:** Root `package.json` line 21 contained `"bootstrap:owner": "node scripts/bootstrap-owner.mjs"`. File `scripts/bootstrap-owner.mjs` was deleted in migration 6. Invoking `pnpm bootstrap:owner` crashed with `MODULE_NOT_FOUND`.
- **Affected Files:**
  - `package.json`
- **Resolution Summary:** Removed `"bootstrap:owner"` from root `package.json`. Verified by comprehensive integration test `repository-alignment.test.ts`.
- **Dependencies:** None.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-03`: Refactor `sendOwnerVerificationEmail` & Purge Dead Invitation Helper
- **Priority:** **P1** (User-Facing Integrity Blocker)
- **Status:** **RESOLVED**
- **Scope:** S
- **Evidence:**
  - `apps/web/src/lib/email.ts` defined `sendOwnerVerificationEmail` with subject `"Verify your JavaVerse Owner email"`.
  - `apps/web/src/app/api/v1/auth/email/resend-verification/route.ts` called `sendOwnerVerificationEmail`.
  - `apps/web/src/lib/email.ts` defined unused `sendMemberInvitationEmail`.
  - `apps/web/test/integration/mailpit.test.ts` asserted owner and invitation email subjects.
- **Affected Files:**
  - `apps/web/src/lib/email.ts`
  - `apps/web/src/app/api/v1/auth/email/resend-verification/route.ts`
  - `apps/web/test/integration/mailpit.test.ts`
- **Resolution Summary:** Renamed `sendOwnerVerificationEmail` to `sendVerificationEmail` with subject `'Verify your JavaVerse email'`, neutral body, and fragment `#token=` URLs. Deleted `sendMemberInvitationEmail`. Updated route and integration tests.
- **Dependencies:** None.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-04`: Purge Inactive `REGISTRATION_MODE` from Config & Schemas
- **Priority:** **P1** (Merge Blocker / Config Drift)
- **Status:** **RESOLVED**
- **Scope:** S
- **Evidence:**
  - `.env.example`: `REGISTRATION_MODE=invite_only`
  - `scripts/generate-env-local.mjs`: `REGISTRATION_MODE=invite_only`
  - `packages/schemas/src/env.ts`: `REGISTRATION_MODE: z.enum(...)`
  - `turbo.json`: `"REGISTRATION_MODE"`
- **Affected Files:**
  - `.env.example`
  - `scripts/generate-env-local.mjs`
  - `packages/schemas/src/env.ts`
  - `turbo.json`
- **Resolution Summary:** Purged `REGISTRATION_MODE` from `.env.example`, `scripts/generate-env-local.mjs`, `packages/schemas/src/env.ts`, and `turbo.json`. Registration is always open local signup up to 5 accounts.
- **Dependencies:** None.
- **Breaking-Change Risk:** Low.
- **Migration Risk:** None.

---

### `REM-05`: Resolve Sandbox `container_runner` Contradictions in Documentation
- **Priority:** **P1** (Architectural Truth Blocker)
- **Status:** **RESOLVED**
- **Scope:** M
- **Evidence:** Contradictory statements across `docs/DECISIONS.md`, `docs/runbooks/OPERATIONS.md`, and `docs/RISK_REGISTER.md` regarding container runner ratification.
- **Affected Files:**
  - `docs/DECISIONS.md`
  - `docs/RISK_REGISTER.md`
  - `docs/runbooks/OPERATIONS.md`
  - `sandbox/src/factory.ts`
  - `apps/web/src/app/api/v1/sandbox/execute/route.ts`
- **Resolution Summary:** Harmonized all documents: `SANDBOX_PROVIDER=mock` is the approved active provider; `container_runner` is REJECTED pending a future feasibility spike. Hardened `sandbox/src/factory.ts` to fail closed with descriptive error on invalid providers.
- **Dependencies:** None.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-06`: Update Stale Administrator Copy on Suspended Account Page
- **Priority:** **P1** (Terminology Integrity)
- **Status:** **RESOLVED**
- **Scope:** XS
- **Evidence:** `apps/web/src/app/(public)/auth/suspended/page.tsx` referenced suspension by "the administrator" and contacting "workspace administrator".
- **Affected Files:**
  - `apps/web/src/app/(public)/auth/suspended/page.tsx`
- **Resolution Summary:** Updated copy to neutral non-administrative language ("This account is currently unavailable. Account recovery is not yet supported in the JavaVerse interface.") and added "Return to Sign in" navigation button.
- **Dependencies:** None.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-07`: Prevent `pnpm build` from Dirtying `static-hashes.ts` in Git
- **Priority:** **P1** (Build Hygiene / CI Blocker)
- **Status:** **RESOLVED**
- **Scope:** S
- **Evidence:** Running `pnpm build` modified `packages/security/src/static-hashes.ts` on every run, dirtying git status. Duplicate `static-hashes.json` was unconsumed.
- **Affected Files:**
  - `scripts/extract-static-hashes.mjs`
  - `scripts/verify-static-hashes.mjs`
  - `package.json`
  - `packages/security/src/static-hashes.json` (deleted)
- **Resolution Summary:** Sorted traversal in `scripts/extract-static-hashes.mjs`, added no-op equality check to prevent touching unchanged files, deleted redundant `static-hashes.json`, and introduced `pnpm verify:static-hashes`.
- **Dependencies:** None.
- **Breaking-Change Risk:** Low.
- **Migration Risk:** None.

---

### `REM-08`: Expand GitHub Actions CI (Playwright, Clean DB, Backup/Restore)
- **Priority:** **P2** (Release Blocker)
- **Status:** **RESOLVED**
- **Scope:** M
- **Evidence:** `.github/workflows/ci.yml` lacked clean DB tests, backup/restore drills, static-hash verification, MinIO service, and browser tests.
- **Affected Files:**
  - `.github/workflows/ci.yml`
- **Resolution Summary:** Added MinIO service container, `pnpm test:clean-db`, `pnpm test:backup-restore`, `pnpm verify:static-hashes`, and Playwright E2E browser tests with browser installation step.
- **Dependencies:** None.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-09`: Update Stale `/dashboard/notes` Preview Shell Copy
- **Priority:** **P2** (UI Polish)
- **Status:** **RESOLVED**
- **Scope:** S
- **Evidence:** `/dashboard/notes/page.tsx` stated: `phaseBadge="Phase 2 Shell Preview · Notebook features activate in Phase 8"`.
- **Affected Files:**
  - `apps/web/src/app/(dashboard)/dashboard/notes/page.tsx`
- **Resolution Summary:** Implemented Outcome B (intentional future-feature preview shell) with badge `phaseBadge="Feature Preview · Scheduled for future release"` and neutral copy without Phase 2/8 references.
- **Dependencies:** None.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-10`: Scope `OPERATIONS.md` to Local Self-Hosting & Add Disclaimers
- **Priority:** **P2** (Operational Safety)
- **Status:** **RESOLVED**
- **Scope:** S
- **Evidence:** `docs/runbooks/OPERATIONS.md` claimed production readiness and diagrammed container runner sandboxes.
- **Affected Files:**
  - `docs/runbooks/OPERATIONS.md`
- **Resolution Summary:** Completely rewritten as *JavaVerse Self-Hosting & Local Operations Guide* with non-production warnings, single-installation account limits, Local Mock default, and disaster recovery procedures.
- **Dependencies:** None.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-11`: Add Open-Source Governance Suite
- **Priority:** **P2** (Release Blocker)
- **Status:** **DEFERRED (OUT OF SCOPE)**
- **Scope:** M
- **Evidence:** `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` are missing.
- **Affected Files:**
  - `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
- **Resolution Summary:** Out of scope for current alignment prompt; governance documents must be created alongside the maintainer's chosen root `LICENSE`.
- **Dependencies:** `REM-01`.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-12`: Add Missing Env Vars (`GEMINI_MODEL`, etc.) to `turbo.json`
- **Priority:** **P3** (Important Improvement)
- **Status:** **RESOLVED**
- **Scope:** S
- **Evidence:** `GEMINI_MODEL`, `ANTHROPIC_MODEL`, `EXTERNAL_AI_ENABLED`, `EXTERNAL_AI_DAILY_REQUEST_LIMIT_PER_USER`, `EXTERNAL_AI_MAX_CONCURRENCY` were missing from `turbo.json`.
- **Affected Files:**
  - `turbo.json`
- **Resolution Summary:** Added all five missing AI environment variables to the `env` list in `turbo.json`.
- **Dependencies:** None.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-13`: Clean Dead `.invitationList` Selector from `SecuritySettings.module.css`
- **Priority:** **P3** (Hygiene)
- **Status:** **RESOLVED**
- **Scope:** XS
- **Evidence:** `SecuritySettings.module.css` line 48 contained dead `.invitationList` selector.
- **Affected Files:**
  - `apps/web/src/app/(dashboard)/dashboard/settings/security/SecuritySettings.module.css`
- **Resolution Summary:** Removed `.invitationList` selector cleanly.
- **Dependencies:** None.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-14`: Author Comprehensive `PROJECT_SPEC.md`
- **Priority:** **P3** (Documentation Truth)
- **Status:** **RESOLVED**
- **Scope:** M
- **Evidence:** `PROJECT_SPEC.md` contained 13 skeletal lines without technical content.
- **Affected Files:**
  - `PROJECT_SPEC.md`
- **Resolution Summary:** Transformed `PROJECT_SPEC.md` into an authoritative navigation index mapping Parts B through S to `JAVAVERSE_PROJECT_DOSSIER.md` and `docs/DECISIONS.md`.
- **Dependencies:** None.
- **Breaking-Change Risk:** None.
- **Migration Risk:** None.

---

### `REM-15`: Implement Phase 6 Sandbox Security Feasibility Spike
- **Priority:** **P4** (Future Architectural Work)
- **Scope:** L
- **Evidence:** Container runner execution remains REJECTED until a security feasibility review approves it.
- **Affected Files:**
  - `sandbox/src/containerRunner.ts`
  - `sandbox/test/containerRunner.test.ts`
  - Dedicated spike runner script
- **Recommended Correction:** Execute a dedicated feasibility spike on an isolated Linux VM with rootless Docker + gVisor, evaluating cgroup v2 resource containment, seccomp profiles, and drop-all capabilities before ratifying container execution.
- **Required Tests:** Kernel isolation and breakout fuzzing tests.
- **Dependencies:** Dedicated Linux VM with gVisor.
- **Breaking-Change Risk:** High (changes execution backend).
- **Migration Risk:** None.

---

### `REM-16`: Implement Full Interactive Learner Study Notes Interface
- **Priority:** **P4** (Future Feature Work)
- **Scope:** L
- **Evidence:** `/dashboard/notes` is currently a placeholder preview shell.
- **Affected Files:**
  - `apps/web/src/app/(dashboard)/dashboard/notes/page.tsx`
  - Schema additions for learner notes / annotations
- **Recommended Correction:** Build the full notebook interface allowing learners to create, edit, tag, and export personal Java code annotations.
- **Required Tests:** Vitest integration tests + Playwright E2E tests.
- **Dependencies:** Product roadmap prioritization.
- **Breaking-Change Risk:** Low.
- **Migration Risk:** Low.


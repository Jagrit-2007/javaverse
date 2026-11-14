# JavaVerse Repository File Inventory

> **Audit Target:** Complete 407-file inventory on branch `fix/phases-4-11-owner-audit`  
> **Standard Categories:** Root configuration, Web application, Worker, Database, Migrations, Security, AI, Schemas, Observability, Sandbox, Infrastructure, Scripts, Tests, GitHub Actions, Documentation, Screenshots / media, Generated file, Local-only file, Obsolete candidate, Unexplained.

---

## 1. Inventory Summary

| Primary Category | File Count | Primary Owner Package | Primary Runtime Role |
| :--- | :--- | :--- | :--- |
| **web application** | 204 | Varies (see detailed catalog) | Mixed |
| **tests** | 62 | Varies (see detailed catalog) | Mixed |
| **root configuration** | 23 | Varies (see detailed catalog) | Mixed |
| **security** | 20 | Varies (see detailed catalog) | Mixed |
| **documentation** | 16 | Varies (see detailed catalog) | Mixed |
| **AI** | 12 | Varies (see detailed catalog) | Mixed |
| **schemas** | 11 | Varies (see detailed catalog) | Mixed |
| **screenshots or media** | 10 | Varies (see detailed catalog) | Mixed |
| **scripts** | 10 | Varies (see detailed catalog) | Mixed |
| **migrations** | 7 | Varies (see detailed catalog) | Mixed |
| **sandbox** | 7 | Varies (see detailed catalog) | Mixed |
| **worker** | 7 | Varies (see detailed catalog) | Mixed |
| **database** | 6 | Varies (see detailed catalog) | Mixed |
| **observability** | 6 | Varies (see detailed catalog) | Mixed |
| **infrastructure** | 3 | Varies (see detailed catalog) | Mixed |
| **generated file** | 2 | Varies (see detailed catalog) | Mixed |
| **GitHub Actions** | 1 | Varies (see detailed catalog) | Mixed |

### Recommendation Totals
| Recommendation | Count | Meaning |
| :--- | :--- | :--- |
| `KEEP` | 370 | Active, verified, authoritative file conforming to current product architecture |
| `HISTORICAL ONLY` | 21 | Applied migration or historical review artifact preserved for immutable audit |
| `UPDATE` | 13 | Requires code, copy, or config remediation prior to merge |
| `REVIEW` | 3 | Requires architectural decision or security feasibility review |
| `DELETE` | 0 | Superseded or dead code recommended for removal |

---

## 2. Specialized Anomaly & Hygiene Audit (Remediated)

### 2.1 Unreferenced Source Files & Dead Routes (Resolved)
- **Dead Script in Root `package.json`**: `"bootstrap:owner"` was removed from root `package.json`.
- **Dead Helper in `apps/web/src/lib/email.ts`**: `sendMemberInvitationEmail` was deleted.
- **Stale Helper in `apps/web/src/lib/email.ts`**: `sendOwnerVerificationEmail` was refactored to `sendVerificationEmail` with subject `'Verify your JavaVerse email'` and neutral copy.
- **Static Shell Route `/dashboard/notes`**: `apps/web/src/app/(dashboard)/dashboard/notes/page.tsx` was updated to Outcome B (intentional future-feature preview shell) with neutral copy.

### 2.2 Unused CSS Rules (Resolved)
- **Dead CSS Rule in `SecuritySettings.module.css`**: `.invitationList` selector was cleanly removed.

### 2.3 Inactive Environment Variables in Active Schemas & Scripts (Resolved)
- **`REGISTRATION_MODE`**: Purged from `packages/schemas/src/env.ts`, `.env.example`, `scripts/generate-env-local.mjs`, and `turbo.json`.

### 2.4 Generated Files Committed or Modified on Build (Resolved)
- **`packages/security/src/static-hashes.ts`**: `scripts/extract-static-hashes.mjs` was updated with alphabetical sorting and equality checking to prevent dirtying git status on rebuilds.
- **`packages/security/src/static-hashes.json`**: Redundant, unconsumed JSON artifact was deleted.
- **`scripts/verify-static-hashes.mjs`**: Added dedicated deterministic verification script invoked via `pnpm verify:static-hashes`.

### 2.5 Overly Broad `.gitignore` Patterns & Local Missing Files
- **`/backups/`**: Ignored in `.gitignore` (line 37). Local disaster recovery drills place backup files here.
- **`*.tsbuildinfo`**: Ignored in `.gitignore` (line 43). Correctly prevents incremental build cache leakage.

---

## 3. Complete File Catalog (All 407 Tracked Files)

| Path | Category | Purpose | Owner Package | Runtime/Build | Stale? | Rec |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `packages/ai/package.json` | AI | AI gateway / provider component: package.json | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/src/evals/goldenSet.ts` | AI | AI gateway / provider component: goldenSet | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/src/evals/harness.ts` | AI | AI gateway / provider component: harness | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/src/evals/runner.ts` | AI | AI gateway / provider component: runner | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/src/factory.ts` | AI | AI gateway / provider component: factory | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/src/index.ts` | AI | AI gateway / provider component: index | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/src/prompts/delimiters.ts` | AI | AI gateway / provider component: delimiters | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/src/providers/anthropic.ts` | AI | AI gateway / provider component: anthropic | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/src/providers/gemini.ts` | AI | AI gateway / provider component: gemini | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/src/providers/mock.ts` | AI | AI gateway / provider component: mock | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/src/types.ts` | AI | AI gateway / provider component: types | `@javaverse/ai` | runtime | No | **KEEP** |
| `packages/ai/tsconfig.json` | AI | AI gateway / provider component: tsconfig.json | `@javaverse/ai` | runtime | No | **KEEP** |
| `.github/workflows/ci.yml` | GitHub Actions | GitHub Actions CI pipeline workflow | `.github` | CI / build-time | No | **UPDATE** |
| `packages/db/prisma/schema.prisma` | database | Authoritative active Prisma database schema | `@javaverse/db` | build-time / schema | No | **KEEP** |
| `packages/db/src/data/lessons.ts` | database | Curriculum lessons or practice problems seed data definitions | `@javaverse/db` | runtime / seed | No | **KEEP** |
| `packages/db/src/data/problems.ts` | database | Curriculum lessons or practice problems seed data definitions | `@javaverse/db` | runtime / seed | No | **KEEP** |
| `packages/db/src/index.ts` | database | Database client and connection management | `@javaverse/db` | runtime | No | **KEEP** |
| `packages/db/src/seed.js` | database | Deterministic database seeder | `@javaverse/db` | runtime / seed | No | **KEEP** |
| `packages/db/src/seed.ts` | database | Deterministic database seeder | `@javaverse/db` | runtime / seed | No | **KEEP** |
| `AGENTS.md` | documentation | Authoritative root project documentation (AGENTS.md) | `root` | documentation | No | **KEEP** |
| `LICENSES.md` | documentation | Authoritative root project documentation (LICENSES.md) | `root` | documentation | No | **KEEP** |
| `PROJECT_SPEC.md` | documentation | Root project specification (currently only 13 lines of Part headings; incomplete) | `root` | documentation | Yes | **UPDATE** |
| `README.md` | documentation | Root README (missing open-source guidance, license details, start-dev.sh documentation) | `root` | documentation | No | **UPDATE** |
| `apps/web/AGENTS.md` | documentation | Web package AI coding agent instructions | `@javaverse/web` | documentation | No | **KEEP** |
| `docs/BLUEPRINT.docx` | documentation | Project documentation: BLUEPRINT.docx | `docs` | documentation | No | **KEEP** |
| `docs/DECISIONS.md` | documentation | Living project tracking ledger (DECISIONS.md) | `docs` | documentation | No | **UPDATE** |
| `docs/PHASE3_VERIFICATION_ADDENDUM.md` | documentation | Historical phase milestone or audit report (PHASE3_VERIFICATION_ADDENDUM.md) | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/PROGRESS.md` | documentation | Living project tracking ledger (PROGRESS.md) | `docs` | documentation | No | **UPDATE** |
| `docs/RISK_REGISTER.md` | documentation | Living project tracking ledger (RISK_REGISTER.md) | `docs` | documentation | No | **UPDATE** |
| `docs/design/javaverse-approved-ui-direction.jpeg` | documentation | Project documentation: javaverse-approved-ui-direction.jpeg | `docs` | documentation | No | **KEEP** |
| `docs/reviews/PHASES_4_11_CHECKPOINT_LEDGER.md` | documentation | Historical phase milestone or audit report (PHASES_4_11_CHECKPOINT_LEDGER.md) | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/PHASE_0_REPORT.md` | documentation | Historical phase milestone or audit report (PHASE_0_REPORT.md) | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/PHASE_2_VISUAL_REVIEW.md` | documentation | Historical phase milestone or audit report (PHASE_2_VISUAL_REVIEW.md) | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/ROADMAP_AUDIT_PHASES_4_11.md` | documentation | Historical phase milestone or audit report (ROADMAP_AUDIT_PHASES_4_11.md) | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/runbooks/OPERATIONS.md` | documentation | Operational runbooks (contains stale production & container runner claims) | `docs` | documentation | Yes | **UPDATE** |
| `packages/security/src/static-hashes.json` | generated file | Generated CSP inline script hashes | `@javaverse/security` | runtime | No | **REVIEW** |
| `packages/security/src/static-hashes.ts` | generated file | Generated CSP inline script hashes | `@javaverse/security` | runtime | No | **REVIEW** |
| `infra/docker-compose.prod.yml` | infrastructure | Container infrastructure definition (docker-compose.prod.yml) | `infra` | infrastructure | No | **KEEP** |
| `infra/docker-compose.yml` | infrastructure | Container infrastructure definition (docker-compose.yml) | `infra` | infrastructure | No | **KEEP** |
| `infra/docker/postgres/init-extensions.sql` | infrastructure | Container infrastructure definition (init-extensions.sql) | `infra` | infrastructure | No | **KEEP** |
| `packages/db/prisma/migrations/20261026164311_foundation/migration.sql` | migrations | Immutable historical database migration | `@javaverse/db` | runtime / migration | No | **HISTORICAL ONLY** |
| `packages/db/prisma/migrations/20261030151351_auth_hardening/migration.sql` | migrations | Immutable historical database migration | `@javaverse/db` | runtime / migration | No | **HISTORICAL ONLY** |
| `packages/db/prisma/migrations/20261106000000_curriculum_lessons/migration.sql` | migrations | Immutable historical database migration | `@javaverse/db` | runtime / migration | No | **HISTORICAL ONLY** |
| `packages/db/prisma/migrations/20261106010000_practice_progress_mastery/migration.sql` | migrations | Immutable historical database migration | `@javaverse/db` | runtime / migration | No | **HISTORICAL ONLY** |
| `packages/db/prisma/migrations/20261106020000_evaluation_quality_kb/migration.sql` | migrations | Immutable historical database migration | `@javaverse/db` | runtime / migration | No | **HISTORICAL ONLY** |
| `packages/db/prisma/migrations/20261109210000_single_learner_account_model/migration.sql` | migrations | Authoritative forward-only migration removing role column, invitations, and bootstrap structures | `@javaverse/db` | runtime / migration | No | **KEEP** |
| `packages/db/prisma/migrations/migration_lock.toml` | migrations | Immutable historical database migration | `@javaverse/db` | runtime / migration | No | **HISTORICAL ONLY** |
| `packages/observability/package.json` | observability | Observability logger / tracing: package.json | `@javaverse/observability` | runtime | No | **KEEP** |
| `packages/observability/src/context.ts` | observability | Observability logger / tracing: context | `@javaverse/observability` | runtime | No | **KEEP** |
| `packages/observability/src/index.ts` | observability | Observability logger / tracing: index | `@javaverse/observability` | runtime | No | **KEEP** |
| `packages/observability/src/logger.ts` | observability | Observability logger / tracing: logger | `@javaverse/observability` | runtime | No | **KEEP** |
| `packages/observability/src/serializers.ts` | observability | Observability logger / tracing: serializers | `@javaverse/observability` | runtime | No | **KEEP** |
| `packages/observability/tsconfig.json` | observability | Observability logger / tracing: tsconfig.json | `@javaverse/observability` | runtime | No | **KEEP** |
| `.env.example` | root configuration | Environment variable template for operators (retains stale REGISTRATION_MODE=invite_only) | `root` | configuration | Yes | **UPDATE** |
| `.gitignore` | root configuration | Root monorepo configuration (.gitignore) | `root` | build-time | No | **KEEP** |
| `.gitleaks.toml` | root configuration | Root monorepo configuration (.gitleaks.toml) | `root` | build-time | No | **KEEP** |
| `.npmrc` | root configuration | Root monorepo configuration (.npmrc) | `root` | build-time | No | **KEEP** |
| `.prettierignore` | root configuration | Root monorepo configuration (.prettierignore) | `root` | build-time | No | **KEEP** |
| `.prettierrc` | root configuration | Root monorepo configuration (.prettierrc) | `root` | build-time | No | **KEEP** |
| `apps/web/lighthouserc.json` | root configuration | Configuration file for lighthouserc.json | `@javaverse/web` | build-time | No | **KEEP** |
| `apps/web/next.config.ts` | root configuration | Configuration file for next.config.ts | `@javaverse/web` | build-time | No | **KEEP** |
| `apps/web/package.json` | root configuration | @javaverse/web package manifest | `@javaverse/web` | build-time | No | **KEEP** |
| `apps/web/playwright.config.ts` | root configuration | Configuration file for playwright.config.ts | `@javaverse/web` | build-time | No | **KEEP** |
| `apps/web/tsconfig.json` | root configuration | Configuration file for tsconfig.json | `@javaverse/web` | build-time | No | **KEEP** |
| `apps/web/vitest.config.ts` | root configuration | Configuration file for vitest.config.ts | `@javaverse/web` | build-time | No | **KEEP** |
| `apps/worker/package.json` | root configuration | @javaverse/worker package manifest | `@javaverse/worker` | build-time | No | **KEEP** |
| `apps/worker/tsconfig.json` | root configuration | TypeScript configuration for worker | `@javaverse/worker` | build-time | No | **KEEP** |
| `eslint.config.mjs` | root configuration | Root monorepo configuration (eslint.config.mjs) | `root` | build-time | No | **KEEP** |
| `osv-scanner.toml` | root configuration | Root monorepo configuration (osv-scanner.toml) | `root` | build-time | No | **KEEP** |
| `package.json` | root configuration | Root workspace package.json (contains stale bootstrap:owner script pointing to missing file) | `root` | build-time | Yes | **UPDATE** |
| `packages/db/package.json` | root configuration | DB package manifest or TS config | `@javaverse/db` | build-time | No | **KEEP** |
| `packages/db/tsconfig.json` | root configuration | DB package manifest or TS config | `@javaverse/db` | build-time | No | **KEEP** |
| `pnpm-lock.yaml` | root configuration | Root monorepo configuration (pnpm-lock.yaml) | `root` | build-time | No | **KEEP** |
| `pnpm-workspace.yaml` | root configuration | Root monorepo configuration (pnpm-workspace.yaml) | `root` | build-time | No | **KEEP** |
| `tsconfig.base.json` | root configuration | Root monorepo configuration (tsconfig.base.json) | `root` | build-time | No | **KEEP** |
| `turbo.json` | root configuration | Turborepo pipeline configuration (retains stale REGISTRATION_MODE env var) | `root` | build-time | Yes | **UPDATE** |
| `sandbox/package.json` | sandbox | Sandbox interface / mock runner: package.json | `@javaverse/sandbox` | runtime | No | **KEEP** |
| `sandbox/src/containerRunner.ts` | sandbox | Container sandbox implementation (currently REJECTED by product rules; retained for spike/testing) | `@javaverse/sandbox` | runtime | Yes | **REVIEW** |
| `sandbox/src/factory.ts` | sandbox | Sandbox interface / mock runner: factory | `@javaverse/sandbox` | runtime | No | **KEEP** |
| `sandbox/src/index.ts` | sandbox | Sandbox interface / mock runner: index | `@javaverse/sandbox` | runtime | No | **KEEP** |
| `sandbox/src/mock.ts` | sandbox | Sandbox interface / mock runner: mock | `@javaverse/sandbox` | runtime | No | **KEEP** |
| `sandbox/src/types.ts` | sandbox | Sandbox interface / mock runner: types | `@javaverse/sandbox` | runtime | No | **KEEP** |
| `sandbox/tsconfig.json` | sandbox | Sandbox interface / mock runner: tsconfig.json | `@javaverse/sandbox` | runtime | No | **KEEP** |
| `packages/schemas/package.json` | schemas | Zod validation schema: package.json | `@javaverse/schemas` | runtime | No | **KEEP** |
| `packages/schemas/src/ai.ts` | schemas | Zod validation schema: ai | `@javaverse/schemas` | runtime | No | **KEEP** |
| `packages/schemas/src/auth.ts` | schemas | Zod validation schema: auth | `@javaverse/schemas` | runtime | No | **KEEP** |
| `packages/schemas/src/correlation.ts` | schemas | Zod validation schema: correlation | `@javaverse/schemas` | runtime | No | **KEEP** |
| `packages/schemas/src/curriculum.ts` | schemas | Zod validation schema: curriculum | `@javaverse/schemas` | runtime | No | **KEEP** |
| `packages/schemas/src/env.ts` | schemas | Zod environment variable schema (retains stale REGISTRATION_MODE) | `@javaverse/schemas` | runtime | Yes | **UPDATE** |
| `packages/schemas/src/evals.ts` | schemas | Zod validation schema: evals | `@javaverse/schemas` | runtime | No | **KEEP** |
| `packages/schemas/src/health.ts` | schemas | Zod validation schema: health | `@javaverse/schemas` | runtime | No | **KEEP** |
| `packages/schemas/src/index.ts` | schemas | Zod validation schema: index | `@javaverse/schemas` | runtime | No | **KEEP** |
| `packages/schemas/src/practice.ts` | schemas | Zod validation schema: practice | `@javaverse/schemas` | runtime | No | **KEEP** |
| `packages/schemas/tsconfig.json` | schemas | Zod validation schema: tsconfig.json | `@javaverse/schemas` | runtime | No | **KEEP** |
| `docs/reviews/screenshots/phase-2/dashboard-empty-state.png` | screenshots or media | Visual review screenshot: dashboard-empty-state.png | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/screenshots/phase-2/dashboard-error-state.png` | screenshots or media | Visual review screenshot: dashboard-error-state.png | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/screenshots/phase-2/dashboard-keyboard-focus.png` | screenshots or media | Visual review screenshot: dashboard-keyboard-focus.png | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/screenshots/phase-2/dashboard-loading-skeleton.png` | screenshots or media | Visual review screenshot: dashboard-loading-skeleton.png | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/screenshots/phase-2/dashboard-reduced-motion.png` | screenshots or media | Visual review screenshot: dashboard-reduced-motion.png | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/screenshots/phase-2/desktop-dark-dashboard.png` | screenshots or media | Visual review screenshot: desktop-dark-dashboard.png | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/screenshots/phase-2/desktop-light-dashboard.png` | screenshots or media | Visual review screenshot: desktop-light-dashboard.png | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/screenshots/phase-2/mobile-dark-dashboard.png` | screenshots or media | Visual review screenshot: mobile-dark-dashboard.png | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/screenshots/phase-2/mobile-light-dashboard.png` | screenshots or media | Visual review screenshot: mobile-light-dashboard.png | `docs` | documentation | No | **HISTORICAL ONLY** |
| `docs/reviews/screenshots/phase-2/public-landing-desktop.png` | screenshots or media | Visual review screenshot: public-landing-desktop.png | `docs` | documentation | No | **HISTORICAL ONLY** |
| `scripts/audit-lighthouse.mjs` | scripts | Repository operational or audit script (audit-lighthouse.mjs) | `scripts` | build-time / operational | No | **KEEP** |
| `scripts/backup-db.sh` | scripts | Repository operational or audit script (backup-db.sh) | `scripts` | build-time / operational | No | **KEEP** |
| `scripts/extract-static-hashes.mjs` | scripts | Repository operational or audit script (extract-static-hashes.mjs) | `scripts` | build-time / operational | No | **KEEP** |
| `scripts/generate-env-local.mjs` | scripts | Local secret generator (retains stale REGISTRATION_MODE=invite_only) | `scripts` | build-time / operational | Yes | **UPDATE** |
| `scripts/restore-db.sh` | scripts | Repository operational or audit script (restore-db.sh) | `scripts` | build-time / operational | No | **KEEP** |
| `scripts/verify-backup-restore.mjs` | scripts | Repository operational or audit script (verify-backup-restore.mjs) | `scripts` | build-time / operational | No | **KEEP** |
| `scripts/verify-clean-db.mjs` | scripts | Repository operational or audit script (verify-clean-db.mjs) | `scripts` | build-time / operational | No | **KEEP** |
| `scripts/verify-lessons-compile.mjs` | scripts | Repository operational or audit script (verify-lessons-compile.mjs) | `scripts` | build-time / operational | No | **KEEP** |
| `scripts/verify-problems-compile.mjs` | scripts | Repository operational or audit script (verify-problems-compile.mjs) | `scripts` | build-time / operational | No | **KEEP** |
| `start-dev.sh` | scripts | Safe local development startup script orchestrating Docker and processes | `root` | operational | No | **KEEP** |
| `packages/db/src/safety.ts` | security | Strict database isolation safety guard protecting javaverse from destructive test actions | `@javaverse/db` | runtime | No | **KEEP** |
| `packages/security/package.json` | security | Security service: package.json | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/audit.ts` | security | Security service: audit | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/csp.ts` | security | Security service: csp | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/csrf.ts` | security | Security service: csrf | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/data/common-passwords.ts` | security | Security service: common-passwords | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/email.ts` | security | Security service: email | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/errors.ts` | security | Security service: errors | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/index.ts` | security | Security service: index | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/keys.ts` | security | Security service: keys | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/magicBytes.ts` | security | Security service: magicBytes | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/password.ts` | security | Security service: password | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/piiScrubber.ts` | security | Security service: piiScrubber | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/rateLimit.ts` | security | Security service: rateLimit | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/recovery.ts` | security | Security service: recovery | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/redaction.ts` | security | Security service: redaction | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/redirects.ts` | security | Security service: redirects | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/tokens.ts` | security | Security service: tokens | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/src/totp.ts` | security | Security service: totp | `@javaverse/security` | runtime | No | **KEEP** |
| `packages/security/tsconfig.json` | security | Security service: tsconfig.json | `@javaverse/security` | runtime | No | **KEEP** |
| `apps/web/test/components/Button.test.tsx` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/components/ConceptVisualizer.test.tsx` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/components/Dialog.test.tsx` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/components/JvmMemoryScene3D.test.tsx` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/components/Logo.test.tsx` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/components/ProgressBar.test.tsx` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/components/ThemeScript.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/components/ThemeSelector.test.tsx` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/components/tokens.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/e2e/a11y.spec.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/e2e/ask-ai.spec.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/e2e/auth.spec.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/e2e/curriculum.spec.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/e2e/e2e-journey.spec.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/e2e/helpers/auth.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/e2e/practice.spec.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/e2e/routes.spec.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/e2e/screenshots.spec.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/ai-limits.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/ai-providers.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/chat-concurrency.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/chat-jobs-sse.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/credentials-reliability.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/csrf-ratelimit.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/db-safety-guard.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/dev-db-persistence.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/kb-evals.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/lessons.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/mailpit.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/practice.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/production-hardening.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/sessions.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/signup.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/sse-cleanup.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/theme.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/integration/uploads.test.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `apps/web/test/setup.ts` | tests | Web application unit/integration/E2E test | `@javaverse/web` | test-time | No | **KEEP** |
| `packages/ai/test/evals.test.ts` | tests | AI package unit tests | `@javaverse/ai` | test-time | No | **KEEP** |
| `packages/ai/test/mock.test.ts` | tests | AI package unit tests | `@javaverse/ai` | test-time | No | **KEEP** |
| `packages/ai/test/providers-compliance.test.ts` | tests | AI package unit tests | `@javaverse/ai` | test-time | No | **KEEP** |
| `packages/observability/test/context.test.ts` | tests | Observability package unit tests | `@javaverse/observability` | test-time | No | **KEEP** |
| `packages/schemas/test/ai.test.ts` | tests | Schema package unit tests | `@javaverse/schemas` | test-time | No | **KEEP** |
| `packages/schemas/test/auth.test.ts` | tests | Schema package unit tests | `@javaverse/schemas` | test-time | No | **KEEP** |
| `packages/schemas/test/curriculum.test.ts` | tests | Schema package unit tests | `@javaverse/schemas` | test-time | No | **KEEP** |
| `packages/schemas/test/env.test.ts` | tests | Schema package unit tests | `@javaverse/schemas` | test-time | No | **KEEP** |
| `packages/schemas/test/evals.test.ts` | tests | Schema package unit tests | `@javaverse/schemas` | test-time | No | **KEEP** |
| `packages/schemas/test/practice.test.ts` | tests | Schema package unit tests | `@javaverse/schemas` | test-time | No | **KEEP** |
| `packages/security/test/audit.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/csrf.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/email.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/keys.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/magicBytes.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/password.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/piiScrubber.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/rateLimit.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/recovery.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/redaction.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/redirects.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/tokens.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `packages/security/test/totp.test.ts` | tests | Security package unit tests | `@javaverse/security` | test-time | No | **KEEP** |
| `sandbox/test/containerRunner.test.ts` | tests | Sandbox unit tests | `@javaverse/sandbox` | test-time | No | **KEEP** |
| `sandbox/test/mock.test.ts` | tests | Sandbox unit tests | `@javaverse/sandbox` | test-time | No | **KEEP** |
| `apps/web/src/app/(dashboard)/DashboardLayout.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/DashboardPage.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/ask/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/learn/CurriculumCatalog.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/learn/LearnDashboard.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/learn/[slug]/LessonView.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/learn/[slug]/LessonView.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/learn/[slug]/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/learn/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/library/LibraryView.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/library/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/notes/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/practice/Practice.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/practice/PracticeCatalog.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/practice/[slug]/PracticeWorkspace.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/practice/[slug]/PracticeWorkspace.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/practice/[slug]/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/practice/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/progress/ProgressDashboard.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/progress/ProgressDashboard.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/progress/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/settings/SettingsView.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/settings/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/settings/security/SecuritySettings.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/dashboard/settings/security/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(dashboard)/layout.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/LandingPage.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/PublicLayout.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/about/AboutPage.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/about/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/auth/Auth.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/auth/forgot-password/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/auth/login/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/auth/mfa/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/auth/recovery/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/auth/reset-password/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/auth/signup/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/auth/suspended/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/auth/verify-email/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/contact/ContactPage.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/contact/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/layout.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/learn/LearnPage.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/learn/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/privacy/LegalPage.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/privacy/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/terms/LegalPage.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/(public)/terms/page.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/Error.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/NotFound.module.css` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/ai/providers/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/csrf/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/email/resend-verification/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/email/verify/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/login/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/logout-all/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/logout/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/mfa/challenge/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/mfa/recovery/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/password/change/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/password/forgot/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/password/reset/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/reauth/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/session/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/sessions/[publicId]/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/sessions/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/auth/signup/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/chats/[id]/cancel/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/chats/[id]/events/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/chats/[id]/messages/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/chats/[id]/retry/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/chats/[id]/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/chats/[id]/state/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/chats/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/events/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/feedback/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/flashcards/[id]/review/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/flashcards/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/health/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/kb/candidates/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/kb/search/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/lessons/[slug]/challenge/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/lessons/[slug]/quiz/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/lessons/[slug]/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/lessons/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/library/[id]/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/library/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/practice/[slug]/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/practice/[slug]/run/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/practice/[slug]/submit/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/practice/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/progress/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/readiness/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/sandbox/execute/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/settings/export/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/settings/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/uploads/[id]/content/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/uploads/[id]/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/api/v1/uploads/route.ts` | web application | Next.js App Router API route handler | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/error.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/global-error.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/icon.svg` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/layout.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/app/not-found.tsx` | web application | Next.js App Router UI page, layout, or CSS module | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/brand/Logo.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/brand/Logo.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/chat/AskWorkspace.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/chat/AskWorkspace.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/chat/ChatConversation.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/chat/ChatConversation.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/chat/ChatLimitDialog.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/chat/ChatSlotCards.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/chat/ChatSlotCards.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/chat/WorkspacePanel.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/chat/WorkspacePanel.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/DailyChallenge.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/DailyChallenge.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/EmptyState.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/EmptyState.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/FeaturedPaths.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/FeaturedPaths.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/HeroBanner.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/HeroBanner.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/MotivationCard.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/MotivationCard.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/PreviewShell.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/PreviewShell.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/ProgressOverview.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/ProgressOverview.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/QuickActions.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/QuickActions.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/RecentLessons.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/RecentLessons.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/VisualConceptPreview.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/dashboard/VisualConceptPreview.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/fixtures/dashboardData.ts` | web application | Deterministic fixture data for screenshot testing (gated by E2E_FIXTURES_ENABLED) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/navigation/MobileDrawer.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/navigation/MobileDrawer.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/navigation/MobileNav.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/navigation/MobileNav.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/navigation/Sidebar.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/navigation/Sidebar.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/navigation/TopBar.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/navigation/TopBar.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/theme/ThemeProvider.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/theme/ThemeScript.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/theme/ThemeSelector.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/theme/ThemeSelector.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Badge.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Badge.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Button.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Button.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Card.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Card.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Dialog.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Dialog.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Input.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Input.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/ProgressBar.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/ProgressBar.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Skeleton.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/Skeleton.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/SkipLink.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/SkipLink.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/ui/VisuallyHidden.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/AccessibleTableFallback.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/ConceptVisualizer.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/Visualizer.module.css` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/renderers/ArrayVisualizer.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/renderers/GraphVisualizer.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/renderers/HashTableVisualizer.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/renderers/JvmMemoryScene3D.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/renderers/JvmMemoryVisualizer2D.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/renderers/LinkedListVisualizer.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/renderers/RecursionVisualizer.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/renderers/StackQueueVisualizer.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/components/visualizations/renderers/TreeHeapVisualizer.tsx` | web application | React visual component or fixture | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/env.ts` | web application | Web application resource | `@javaverse/web` | build-time | No | **KEEP** |
| `apps/web/src/lib/aiLimits.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/apiResponse.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/audit.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/auth.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/chats.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/csrf.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/email.ts` | web application | Email delivery service containing stale owner/invitation helpers | `@javaverse/web` | runtime | Yes | **UPDATE** |
| `apps/web/src/lib/events.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/feedback.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/kb.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/keys.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/lessons.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/library.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/practice.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/progress.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/queue.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/rateLimiter.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/redis.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/settings.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/storage.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/lib/uploads.ts` | web application | Web server-side helper library (auth, csrf, sessions, chats, sse, etc.) | `@javaverse/web` | runtime | No | **KEEP** |
| `apps/web/src/middleware.ts` | web application | Web application resource | `@javaverse/web` | build-time | No | **KEEP** |
| `apps/web/src/styles/globals.css` | web application | Web application resource | `@javaverse/web` | build-time | No | **KEEP** |
| `apps/web/src/styles/tokens.css` | web application | Web application resource | `@javaverse/web` | build-time | No | **KEEP** |
| `apps/worker/src/env.ts` | worker | Worker entry point, queue connection, reaper, or storage adapter | `@javaverse/worker` | runtime | No | **KEEP** |
| `apps/worker/src/index.ts` | worker | Worker entry point, queue connection, reaper, or storage adapter | `@javaverse/worker` | runtime | No | **KEEP** |
| `apps/worker/src/processors/analysisProcessor.ts` | worker | BullMQ queue background processor (analysis or media scan) | `@javaverse/worker` | runtime | No | **KEEP** |
| `apps/worker/src/processors/mediaProcessor.ts` | worker | BullMQ queue background processor (analysis or media scan) | `@javaverse/worker` | runtime | No | **KEEP** |
| `apps/worker/src/queues.ts` | worker | Worker entry point, queue connection, reaper, or storage adapter | `@javaverse/worker` | runtime | No | **KEEP** |
| `apps/worker/src/reaper.ts` | worker | Worker entry point, queue connection, reaper, or storage adapter | `@javaverse/worker` | runtime | No | **KEEP** |
| `apps/worker/src/storage.ts` | worker | Worker entry point, queue connection, reaper, or storage adapter | `@javaverse/worker` | runtime | No | **KEEP** |

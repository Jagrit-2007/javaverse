# JavaVerse Progress

## Current Phase

Phase 3 — Authentication & Account Security (Complete, awaiting review)

## Phase 0 Status

PASS — reviewed and approved

## Phase 0 Evidence

The complete Phase 0 report is stored at:
`docs/reviews/PHASE_0_REPORT.md`

## Phase 1 Status

PASS — all criteria verified and passing

## Phase 1 Evidence & Verification Summary

1. **Monorepo & Toolchain**:
   - Package manager: `pnpm@12.15.0` (pinned in `package.json#packageManager`).
   - Workspace: Turborepo monorepo with 8 packages (`apps/web`, `apps/worker`, `@javaverse/schemas`, `@javaverse/security`, `@javaverse/observability`, `@javaverse/db`, `@javaverse/ai`, `@javaverse/sandbox`).
   - Strict TypeScript: `tsconfig.base.json` in strict mode with `exactOptionalPropertyTypes: true`, `noImplicitAny: true`.
   - Frozen Lockfile: `pnpm install --frozen-lockfile` verified.

2. **Database & Schema**:
   - PostgreSQL 17 with `pgvector` (0.8.7) and `citext` (1.6) extensions enabled.
   - Initial reviewed migration: `20261026164311_foundation` applied and verified.
   - All 18 foundation tables defined (`deployment_limits`, `users`, `invitations`, `email_tokens`, `sessions`, `mfa_totp`, `recovery_codes`, `chats`, `chat_state`, `messages`, `attachments`, `analyses`, `executions`, `feedback`, `durable_jobs`, `user_stream_events`, `idempotency_records`, `audit_logs`).
   - Zero speculative feature tables (no lessons, practice problems, evaluation datasets, vector embeddings).
   - Database invariants verified via `scripts/verify-clean-db.mjs`.

3. **Infrastructure & Services**:
   - `infra/docker-compose.yml` runs 5 healthy baseline services: `javaverse-postgres` (Postgres 17), `javaverse-redis-queue` (AOF + `noeviction`), `javaverse-redis-cache` (`allkeys-lru`), `javaverse-minio`, and `javaverse-mailpit`.
   - ClamAV container configured under optional profile `uploads`.

4. **Health, Readiness & Failure Recovery**:
   - Liveness probe `GET /api/v1/health` returns HTTP 200 with zero external I/O.
   - Readiness probe `GET /api/v1/readiness` returns HTTP 200 when dependencies are healthy.
   - Dependency failure behavior verified: Stopping Postgres immediately causes `/api/v1/readiness` to return HTTP 503 (`status: "unhealthy"`), while `/api/v1/health` remains HTTP 200 (uncoupled). Upon restarting Postgres, `/api/v1/readiness` self-heals to HTTP 200 (`status: "ready"`).

5. **Security & Code Quality**:
   - `pnpm format:check`: 100% compliant with Prettier.
   - `pnpm lint`: 8/8 packages passing ESLint 9 with TypeScript rules, zero errors, zero warnings.
   - `pnpm typecheck`: 8/8 packages passing strict TypeScript type check.
   - `pnpm test`: 5 test suites (16 unit tests) passing with 100% success rate across schemas, security, observability, AI mock, and sandbox mock.
   - `pnpm audit --prod`: No known vulnerabilities found.
   - Licence audit: All direct and transitive dependencies verified under permissive OSS licenses.

## Phase 2 Status

PASS — all criteria verified and passing

## Phase 2 Evidence & Verification Summary

1. **Semantic Design Tokens & Theme Engine**:
   - `tokens.css` & `globals.css`: Full palette of semantic tokens for light and dark modes exceeding WCAG 2.2 AA contrast requirements.
   - Primary CTA uses dark ink (`#111827`) on warm amber (`#f59e0b`) providing 8.2:1 contrast. Secondary link colors use `#b45309` (4.6:1) and `#0369a1` (7.3:1).
   - Theme behavior: Default resolves to Light if no stored preference exists; stored light resolves to Light; stored dark resolves to Dark; stored system tracks OS scheme dynamically via listener attached only while System is selected.
   - Zero first-paint flash achieved through synchronous inline initialization script verified by static sha256 hash.
   - Natural 320 CSS pixel reflow verified with zero horizontal scrollbar (`scrollWidth <= clientWidth`), avoiding global `overflow-x: hidden`.

2. **Original Geometric Branding**:
   - Faceted crystal mark with warm amber spark core implemented in `apps/web/src/components/brand/Logo.tsx` and public `/icon.svg`.
   - Verified across 16px, 24px, 32px, and 40px dimensions without coffee-cup or Oracle/Duke iconography.
   - Accessible markup avoids duplicate announcements when the wordmark is visible.

3. **Accessible UI Primitives & Gated Fixture Harness**:
   - Component primitives: `Button`, `Card`, `Badge`, `ProgressBar`, `Input`, `Dialog`, `Skeleton`, `SkipLink`, and `VisuallyHidden`.
   - Native `<dialog>` modal primitives implement `showModal`, backdrop dismissal, Escape key handling, initial focus, focus containment, and focus return upon closure.
   - Screenshot state fixture harness (`apps/web/src/lib/dashboardData.ts`) strictly gated behind `E2E_FIXTURES_ENABLED=true` to prevent production backdoor leakage.

4. **Segregated Routes & Demo Shell Architecture**:
   - Public marketing & informational routes: `/`, `/learn`, `/about`, `/privacy`, `/terms`, `/contact`, and `/not-found`.
   - Dashboard demo shell routes: `/dashboard`, `/dashboard/learn`, `/dashboard/practice`, `/dashboard/ask`, `/dashboard/library`, `/dashboard/progress`, `/dashboard/notes`, `/dashboard/settings`.
   - All navigation links resolve without 404s. Future phase destinations render honest static previews.
   - Deterministic copy: "Welcome back, learner. Let's make Java click today." (no personal names, no time-of-day bindings).
   - Public Privacy and Terms pages prominently display template legal review notice badges.
   - Sidebar contains all 8 expected navigation items and omits premature sign-out or session controls.

5. **Route-Specific Content Security Policy (CSP)**:
   - Public static routes enforce strict static sha256 hash-based script CSP, preserving Turbopack static page pre-rendering.
   - Dashboard demo shell routes enforce dynamic per-request cryptographic nonces with `Cache-Control: no-store`.
   - Automated build-time hash extraction script (`scripts/extract-static-hashes.mjs`) synchronizes static inline script hashes to ensure zero browser CSP violations.

6. **Comprehensive Automated & Browser Verification**:
   - Unit testing: 6/6 test suites passing (20 web unit tests in `@javaverse/web`, 36 total unit tests across monorepo).
   - Playwright E2E: 52/52 browser tests passing (`pnpm --filter @javaverse/web test:e2e`), verifying route navigation, landmark structure, skip link focus, modal dialogs, mobile navigation drawer, theme switching, and screenshot generation.
   - Automated Axe-Core Audits: 15 routes scanned with `@axe-core/playwright`, resulting in **0 violations**.
   - Lighthouse CI (Mobile Preset, 3 runs, median):
     - Public (`/`): Performance 92, Accessibility 100, Best Practices 100, SEO 100.
     - Dashboard (`/dashboard`): Performance 95, Accessibility 96, Best Practices 100, SEO 100.
   - Visual review documentation: 10 screenshots captured in `docs/reviews/screenshots/phase-2/` and reviewed in `docs/reviews/PHASE_2_VISUAL_REVIEW.md`.

7. **Final Visual and Copy Polish Pass**:
   - Replaced "Free Plan Demo" with "Preview Workspace" across sidebar and profiles.
   - Replaced motivation quotation with original JavaVerse copy: "Small progress, practiced consistently, builds real understanding."
   - Removed shortcut description truncation, displaying complete 2-line text.
   - Un-truncated featured path primary titles.
   - Enhanced mobile density below 640px (compact hero padding, 27% illustration height reduction, tighter gaps) while maintaining >=44px touch targets.
   - Added fixed mobile bottom navigation clearance (`calc(84px + env(safe-area-inset-bottom, 0px))`).
   - Updated empty state to "Begin with Java Foundations" with subtle solid border.
   - Updated error state copy ("Learning metrics are temporarily unavailable") with compact padding and preserved alert semantics.
   - Aligned public CTAs consistently to "View Demo Dashboard" and refined public copy.
   - Added semantic accessible description for class hierarchy visualization.
   - Preserved all Phase 1 foundations, database schemas, worker, and security policies.

## Phase 3 Status

PASS — all criteria verified and passing

## Phase 3 Evidence & Verification Summary

1. **Approved Dependencies & Lockfile**:
   - Installed `@node-rs/argon2` (2.2.2), `otpauth` (9.5.2), and `nodemailer` (10.3.1) in accordance with Phase 3 specification.
   - Verified `pnpm install --frozen-lockfile` runs cleanly with zero discrepancies.
   - Documented all third-party licences in `LICENSES.md`.

2. **Database Hardening Migration (`auth_hardening`)**:
   - Migration `20261030151351_auth_hardening` safely introduces `users.display_name`, `sessions.public_id` (backfilled before NOT NULL with unique index), and `sessions.last_seen_at` (with active session and cleanup indexes).
   - Clean scratch database deployment verified via `node scripts/verify-clean-db.mjs` with idempotent re-seeding and invariant checks.

3. **Owner CLI Bootstrap State Machine**:
   - CLI command `pnpm bootstrap:owner` generates single-use 64-character token with 15-minute TTL delivered exclusively to terminal stdout.
   - Multi-step interruption-safe ceremony at `/auth/bootstrap`:
     - Step 1: Validates token against purpose `OWNER_BOOTSTRAP` and delivery channel `TERMINAL`, issuing short-lived encrypted ticket.
     - Step 2: Enrolls credentials, displays Base32 TOTP secret, and validates TOTP code before database account creation.
     - Step 3: Atomic database transaction creates single active OWNER, encrypted TOTP record, last-used timestep, 10 single-use recovery code hashes, session, and audit records.
     - Step 4: Displays 10 plaintext recovery codes exactly once with mandatory confirmation checkbox.

4. **Member Invitation & Concurrency Controls**:
   - Single shared invitation service (`apps/web/src/lib/invitations.ts`) enforces workspace seat limits under transaction-scoped PostgreSQL advisory locks (`pg_advisory_xact_lock(74619283)`), completely serializing capacity checks across concurrent requests.
   - Segregated invitation creation (`PENDING_EXISTS` on duplicate active invite) and resend (revokes stale token and re-issues fresh token under lock, preserving seat count).
   - Ephemeral in-memory token generation; transactional email delivery via Mailpit is deferred until after database commit, with token confined to URL hash fragment (`#token=...`).

5. **Session Management & Defense in Depth**:
   - Opaque sessions: 256-bit raw token in cookie, HMAC-SHA256 digest in database, UUIDv4 public ID in JSON APIs.
   - Fixed 7-day absolute expiration; 24-hour idle expiration updated at 5-minute threshold without extending absolute expiry.
   - Revoking other sessions requires recent reauthentication (within 15 minutes); revoking current session behaves as logout.
   - CSRF protection: signed session-bound and flow-bound tokens.
   - Fail-closed token-bucket rate limiting via Redis Cache during outages on sensitive endpoints.
   - Audit logging with non-reversible HMAC-SHA-256 pseudonyms and UUID-validated metadata allowlist (`revoked_session_public_id`, `previous_invitation_id`, `new_invitation_id`).
   - RFC 6265bis cookie policy: `__Host-` prefix with `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure`.

6. **Comprehensive Automated Verification & Supply-Chain Remediation**:
   - Phase 3 Security Repairs verified: Advisory-locked seat-cap race resolved; Prettier format check passed; Audit metadata allowlist UUID validation added; Synthetic Gitleaks test fixture replaced.
   - Supply-Chain Hardening: `@lhci/cli` removed from workspace dependencies, eradicating all 5 High transitive vulnerabilities; Lighthouse audits containerized via pinned image `patrickhulce/lhci-client:0.15.1@sha256:558210c5e422a7babaaa09c285b7469da3f00fac1a9880c37883c65d666a7fc9` (`pnpm test:lighthouse`) with 100% pass across all mobile budgets for `/` and `/dashboard`.
   - Gitleaks Policy Hardened: Broad directory allowlists (`^apps/web/test/.*`, `^packages/schemas/test/.*`) eliminated in favor of exact file paths (`setup.ts`, `auth.spec.ts`, `env.test.ts`). All scans clean.
   - Unit & integration tests: 12/12 suites passing in `@javaverse/web` (38 tests), 100% across all 8 packages.
   - Concurrency tests: OWNER partial index uniqueness, 10-caller invitation seat cap lock race, 5-caller same-email race, and resend token lifecycle passing against real PostgreSQL.
   - Playwright E2E & Accessibility: 66/66 tests passing, including complete browser auth flows and 0 axe-core WCAG 2.2 AA violations across all 15 public and authenticated routes.
   - Production build: `pnpm build` completed with automatic static script hash extraction for all static and auth routes.
   - Security scanning: Zero Critical, Zero High findings across full `pnpm audit` and unfiltered OSV-Scanner; 0 issues on filtered OSV-Scanner; 0 leaks across history, protect, and `--no-git` on pinned Gitleaks v8.30.1.

## Current Objective

Await owner review and authorization before proceeding to Phase 4 (Chat, Streaming & Core Learning Experience).

## Blockers

None. Supply-chain remediation and Phase 3 security repairs verified.

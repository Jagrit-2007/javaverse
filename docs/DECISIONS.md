# JavaVerse Architectural Decisions & Amendments

## Phase 0 Amendments

Status: Approved for Phase 1

1. The initial pnpm installation is non-frozen because no lockfile exists.
2. Generate and commit pnpm-lock.yaml, then verify: `pnpm install --frozen-lockfile`.
3. Keep `.github/workflows` at the repository root.
4. Avoid speculative future packages and database tables.
5. Defer `argon2` and `otplib` to Phase 3.
6. Defer `sharp` to Phase 5.
7. Generate and inspect the initial Prisma migration.
8. Test `migrate:deploy` against a clean database.
9. Establish Pino structured logging, redaction and correlation IDs in Phase 1.
10. Defer full OpenTelemetry exporters and collectors until the required application boundaries exist.
11. Begin dependency and container-image licence inventory in Phase 1.
12. Do not create a fixed `VECTOR(1536)` field.
13. Implement separate health and readiness endpoints.
14. Treat `container_runner` as a preferred candidate only until the Phase 6 Sandbox Feasibility Spike passes.
15. Treat `gitleaks` and `OSV-Scanner` as pinned external tools, not application runtime dependencies.
16. Distinguish local CI validation from remote GitHub Actions success.

## Phase 1 Ratified Decisions

Status: Approved & Implemented

1. **Package Management & Tooling**:
   - Pinned `pnpm@12.15.0` via Corepack and `package.json#packageManager`.
   - Used Turborepo for monorepo pipeline orchestration.
   - Pinned dependencies with verified supply-chain policies and zero unmitigated vulnerabilities.

2. **Database Architecture & Initial Migration**:
   - Pinned PostgreSQL 17 with `citext` 1.6 and `pgvector` 0.8.7 extensions.
   - Initial reviewed migration named `foundation` (`20261026164311_foundation`).
   - Enforced database constraints in SQL DDL:
     - `idx_users_single_active_owner`: partial unique index on `(role)` WHERE `role = 'OWNER' AND status = 'ACTIVE'`.
     - `slot BETWEEN 1 AND 3` CHECK constraint on `chats`.
     - `singleton_check` CHECK constraint on `deployment_limits` ensuring `id = 1`.
     - `chk_invitations_member_only` ensuring invited role is `MEMBER`.
     - Check constraints on durable job status and progress (0–100).
   - Seed script configured with deterministic idempotency (`max_users=5`, `registration_mode=invite_only`).

3. **Dual Redis Architecture**:
   - `redis-queue`: Configured with append-only file (AOF) persistence and `maxmemory-policy noeviction` on port 6379 for reliable BullMQ job processing.
   - `redis-cache`: Configured with `maxmemory-policy allkeys-lru` on port 6380 for disposable ephemeral cache.

4. **Security & Cryptographic Foundations**:
   - Domain-separated HMAC-SHA-256 utility with timing-safe comparison implemented in `@javaverse/security` for future token validation. Raw SHA-256 token hashing rejected.
   - Passwords and TOTP authentication implementation deferred to Phase 3.
   - Zero hardcoded secrets; fail-fast validation in `@javaverse/schemas` rejects placeholder secrets and localhost URLs in production unless explicitly overridden.

5. **Observability & Health Model**:
   - Correlation IDs generated via standard UUIDv4 and propagated through `AsyncLocalStorage` and HTTP request/response headers (`x-correlation-id`).
   - Liveness endpoint (`/api/v1/health`) completely uncoupled from external databases and queues.
   - Readiness endpoint (`/api/v1/readiness`) monitors PostgreSQL (critical), Redis Queue (critical), and Redis Cache (non-critical), returning HTTP 503 on critical dependency failure.

## Phase 2 Ratified Decisions

Status: Approved & Implemented

1. **Design Tokens & Strict Contrast Floor**:
   - Primary action CTA button uses dark ink (`#111827`) on warm amber (`#f59e0b`) background to achieve 8.2:1 contrast ratio, surpassing both WCAG 2.2 AA (4.5:1) and AAA (7:1).
   - Secondary link colors use `#b45309` (4.6:1) and `#0369a1` (7.3:1) on white surfaces to eliminate low-contrast amber text failures.
   - Literal breakpoints (`768px`, `1024px`, `1280px`) used in CSS media queries because CSS custom properties are not evaluated inside `@media` declarations.
   - Natural 320 CSS pixel reflow achieved using responsive flex/grid layouts, `min-width: 0`, and `overflow-wrap: anywhere` without global `overflow-x: hidden`.

2. **Deterministic Theme Resolution & Flash Prevention**:
   - Default theme resolves to Light if no user preference is stored.
   - Explicit stored `light` resolves to Light; explicit stored `dark` resolves to Dark; explicit stored `system` follows `prefers-color-scheme`.
   - The OS `prefers-color-scheme` `change` event listener is active only when `system` is selected and is dismantled when an explicit theme is chosen.
   - First-paint theme flash is eliminated via a synchronous inline `<script>` whose sha256 hash is verified in CSP headers.

3. **Original Geometric Branding**:
   - Replaced coffee-cup and Oracle/Duke branding with an original faceted geometric crystal mark featuring an embedded amber energy spark core.
   - Implemented natively in React (`Logo.tsx`) and static SVG (`/icon.svg`) with verified visual clarity at 16, 24, 32, and 40px dimensions.

4. **Segregated Content Security Policy (CSP)**:
   - Public marketing routes enforce static hash-based script CSP, enabling Next.js Turbopack to pre-render static HTML without `'unsafe-inline'`.
   - Dashboard preview routes enforce dynamic per-request cryptographic nonces and send `Cache-Control: no-store`.
   - Build-time hash extractor script (`scripts/extract-static-hashes.mjs`) automatically keeps static hashes synchronized across package boundaries with zero console violations.

5. **Gated Fixture State Harness**:
   - The screenshot and preview state mechanism (loading skeletons, empty states, error cards) is strictly gated behind `E2E_FIXTURES_ENABLED=true`.
   - Production builds and public deployments reject or ignore fixture query parameters to prevent diagnostic/debug backdoors.

6. **Native Accessibility Primitives**:
   - Native `<dialog>` used for mobile navigation drawer and hint modals, implementing `showModal`, backdrop dismissal, Escape key handling, and focus restoration.
   - Native `<select>` used for theme selection to ensure bulletproof screen reader and keyboard interoperability.
   - Strictly semantic controls: navigation uses `<Link>` and actions use `<button>`, with zero fake disabled links or non-semantic anchor buttons.

7. **Deterministic Fixtures & Demo Shell Boundary**:
   - `/dashboard` and `/dashboard/*` operate honestly as static/fixture preview shells without fabricated sessions, dummy account menus, or fake sign-out buttons.
   - Copy uses deterministic generic text: `“Welcome back, learner. Let’s make Java click today.”` without personal names or time-of-day bindings.

8. **Visual & Copy Polish Refinements**:
   - Replaced "Free Plan Demo" with "Preview Workspace" to clearly reflect demo workspace context without premature plan assumptions.
   - Replaced motivation quote attribution with original JavaVerse product copy presented as an active learning note badge.
   - Shortcut descriptions and featured path primary titles display completely with multi-line clamping and zero ellipsis truncation.
   - Improved mobile density below 640px (compact hero padding, 27% illustration height reduction) and accounted for fixed mobile bottom navigation clearance via `env(safe-area-inset-bottom)`.
   - Used "View Demo Dashboard" consistently across header and hero CTAs, verified public curriculum navigation to `/learn`, and added semantic screen-reader descriptions for visual concept inheritance diagrams.

## Phase 3 Ratified Decisions

Status: Approved & Implemented

1. **Database Schema Hardening & Clean Migration (`auth_hardening`)**:
   - Added `users.display_name VARCHAR(64)` with generic fallback ("Owner" or "Learner"); never derived from email local part.
   - Added `sessions.public_id UUID UNIQUE NOT NULL` safely backfilled before NOT NULL constraint; newly created sessions generate public IDs via application-level `crypto.randomUUID()`.
   - Added `sessions.last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` with dedicated index for idle session tracking.
   - Enforced 24-hour idle timeout with 5-minute update threshold (`SESSION_TOUCH_THRESHOLD_MS`) without extending the fixed 7-day absolute `expires_at`.
   - Added partial index `idx_sessions_user_active` (`WHERE revoked_at IS NULL`) for performant active session queries.
   - Clean `migrate:deploy` verified against an isolated scratch database.

2. **Cryptographic Key Hierarchy & Separation**:
   - HKDF key hierarchy derivation from master secret (`SESSION_SECRET` / `APP_MASTER_KEY`) deriving dedicated purpose keys: `sessionHmacKey`, `authTokenHmacKey`, `mfaEncryptionKey`, `csrfSigningKey`, `auditHmacKey`.
   - Versioned AES-256-GCM TOTP secret encryption with authenticated additional data bound to user ID (`v1:aes-256-gcm:...`).
   - Constant-time HMAC-SHA256 digests for session tokens, email tokens, and recovery codes; raw values are never persisted in the database or logged.

3. **Owner CLI Bootstrap State Machine**:
   - Terminal-initiated bootstrap command (`pnpm bootstrap:owner`) prints single-use token with 15-minute TTL delivered to terminal only.
   - Multi-step interruption-safe browser ceremony (`/auth/bootstrap`):
     - Step 1: Validates token and issues short-lived encrypted ticket stored in Redis cache.
     - Step 2: Collects owner credentials, displays Base32 TOTP secret, and verifies TOTP proof before account creation.
     - Step 3: Atomic database transaction creates OWNER user, TOTP record, last-used timestep, 10 single-use recovery code hashes, session, and audit records.
     - Step 4: Displays 10 plaintext recovery codes exactly once with confirmation barrier before entering dashboard.
     - Final token consumption permanently disables subsequent bootstrap.

4. **Member Invitation & Seat Reservation**:
   - Extracted shared service `apps/web/src/lib/invitations.ts` (`createMemberInvitation`, `resendMemberInvitation`) used by both route handlers (`/api/v1/invitations`, `/api/v1/invitations/resend`) and integration tests.
   - Strictly enforced deployment limit `MAX_USERS=5` under PostgreSQL transaction-scoped advisory lock:
     ```sql
     SELECT pg_advisory_xact_lock(74619283);
     ```
     Checking `active_users + pending_invitations < max_users`.
   - Separate create and resend endpoints; active pending invitation returns `PENDING_EXISTS` on create, while resend revokes previous token and issues a fresh one.
   - Raw token material is generated ephemerally in application memory; transactional SMTP delivery via Mailpit is deferred until _after_ database transaction commit.
   - Invitations delivered via transactional email with token in URL hash fragment (`#token=...`) preventing token leakage to referrer headers or server access logs.

5. **Session Management, Rotation & Reauthentication**:
   - Dual-token session design: 256-bit raw token in cookie, HMAC-SHA256 digest in DB, UUIDv4 public ID in URLs and JSON APIs.
   - Session revocation requires recent reauthentication (within 15 minutes) when revoking other sessions. Current session revocation behaves as immediate logout.
   - Absolute session expiry remains strictly unextended; touching `last_seen_at` never extends `expires_at`.

6. **Defense in Depth, Fail-Closed Rate Limiting & Audit Logging**:
   - CSRF protection: signed session-bound and flow-bound tokens verified across all state-changing endpoints.
   - Token-bucket rate limiting via Redis Cache with fail-closed behavior on sensitive authentication endpoints in the event of a Redis outage.
   - Audit logging with non-reversible HMAC-SHA-256 pseudonyms for IP addresses and user IDs.
   - Strict audit metadata allowlist (`ALLOWED_AUDIT_METADATA_KEYS`) permitting `revoked_session_public_id`, `previous_invitation_id`, and `new_invitation_id` validated strictly as UUIDs (`UUID_METADATA_KEYS`), rejecting PII, raw emails, tokens, or IP addresses.
   - RFC 6265bis cookie policy: `__Host-` prefix in production with `Path=/`, `HttpOnly`, `SameSite=Lax`, and `Secure`.
   - Static route script hash extraction recursively captures all `/auth/*` prerendered pages to guarantee strict CSP compliance.
   - Vulnerability scanning baseline pinned to `zricethezav/gitleaks:v8.30.1` and `ghcr.io/google/osv-scanner:v2.7.0`. Broad Gitleaks allowlists removed in favor of exact file paths (`setup.ts`, `auth.spec.ts`, `env.test.ts`).
   - Supply-chain hardening: Removed `@lhci/cli` from workspace dependencies to eliminate transitive High findings (`basic-ftp`, `extract-zip`, `tmp`, `zod`); containerized Lighthouse audits via pinned image `patrickhulce/lhci-client:0.15.1@sha256:558210c5e422a7babaaa09c285b7469da3f00fac1a9880c37883c65d666a7fc9` executed via `scripts/audit-lighthouse.mjs` (`pnpm test:lighthouse`). Only `minimatch` in `typescript-eslint` documented with `ignoreUntil = 2026-12-31` in `osv-scanner.toml`. Zero High/Critical findings in full audit or OSV-Scanner.

7. **Turborepo Environment Contract for Production Builds**:
   - Explicitly configured `globalEnv: ["NODE_ENV"]` in `turbo.json` for repository-wide environment context.
   - Forwarded all schema-validated build pipeline environment variables via task-level `tasks.build.env` (including `DATABASE_URL`, `REDIS_*`, `SESSION_SECRET`, `CURSOR_SIGNING_SECRET`, `SANDBOX_SHARED_SECRET`, `ALLOW_LOCAL_SERVICES_IN_PRODUCTION`, `AI_PROVIDER_PRIMARY`, `SANDBOX_PROVIDER`, `SMTP_*`, `APP_URL`, `E2E_FIXTURES_ENABLED`, `STATIC_SCRIPT_HASHES`, etc.).
   - Prevents Turborepo 2.11 environment filtering from stripping job-level CI environment variables during Next.js page prerendering while preserving strict cache hashing, zero secret persistence in repository config, and fail-fast validation when required variables are missing.

8. **Lighthouse CI Container Non-Root Runtime Isolation**:
   - Pinned Lighthouse CI execution to `patrickhulce/lhci-client:0.15.1@sha256:558210c5e422a7babaaa09c285b7469da3f00fac1a9880c37883c65d666a7fc9`.
   - Configured non-root runner execution with `--user ${uid}:${gid}` and explicit isolated writable temporary directories: `HOME=/tmp/lhci-home`, `XDG_CONFIG_HOME=/tmp/lhci-home/.config`, `XDG_CACHE_HOME=/tmp/lhci-home/.cache`, and `--shm-size=1g`.
   - Executed through a safe shell entrypoint that creates and validates writability of `$HOME`, `$XDG_CONFIG_HOME`, and `$XDG_CACHE_HOME` under `/tmp` before execing `lhci`.
   - Eliminates `//.local` permission denied and crashpad database errors on unmapped runner UIDs (such as GitHub Actions UID 1001) without granting `--privileged` or root permissions.

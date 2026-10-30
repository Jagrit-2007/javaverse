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

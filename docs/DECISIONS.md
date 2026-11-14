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

## Phase 4 Ratified Decisions

Status: Approved & Implemented

1. **Deterministic 3-Slot User Concurrency Model**:
   - Enforced 3 concurrent question slots per user strictly through PostgreSQL transaction-level advisory locking (`pg_advisory_xact_lock(hashtext('chat_slot:' || user_id))`) combined with database UNIQUE constraint `(user_id, slot)` where `slot BETWEEN 1 AND 3`.
   - Prevented race conditions and excessive slot consumption under high concurrent load.
   - When all 3 slots are occupied, returning HTTP 409 `CHAT_LIMIT_REACHED` with active chat slot summaries, requiring explicit user delete-and-replace confirmation via accessible modal dialog.

2. **Durable Asynchronous Job Processing & Worker Crash Recovery**:
   - Asynchronous job execution orchestrated via BullMQ on Redis Queue (`analysis-queue`), backed by durable database state machine in `durable_jobs`.
   - Active worker heartbeat renewals (`leaseExpiresAt = now() + 30s`) and background reaper sweeper recovering stalled jobs whose leases expired without progress.
   - Graceful cancellation semantics: cancelling a job marks `durable_jobs.status = CANCELLED`, and the worker terminates execution without overwriting cancelled state.

3. **Resilient SSE Streaming & Multiplexed Pub/Sub Fanout**:
   - Event multiplexing via `user_stream_events` with `stream_seq BIGSERIAL` primary key and Redis Pub/Sub channel `events:user:${userId}`.
   - Client reconnections replaying missed events seamlessly via `Last-Event-ID` cursor headers.
   - Enforced max 3 concurrent active SSE connections per user, returning HTTP 429 `SSE_CONNECTION_LIMIT_REACHED` on excess.
   - 15-second heartbeat comments (`: ping\n\n`) preventing proxy connection timeouts.

## Phase 5 Ratified Decisions

Status: Approved & Implemented

1. **Provider-Neutral AI Architecture & Prompt Injection Boundary**:
   - Unified `AIProvider` contract with pluggable adapters (`MockProvider`, `AnthropicProvider`, `GeminiProvider`) and structured pedagogical output validated against Zod schemas.
   - Cryptographically random per-request delimiter wrapping (`<untrusted_learner_content_token>`) strictly isolating learner questions and code snippets from system reasoning instructions.
   - Model outputs constrained to pure structured JSON data with zero executable script injection.

2. **Upload Quarantine & Media Sanitization Pipeline**:
   - File uploads immediately placed in `quarantine/` storage in `PENDING` state; access via `/api/v1/uploads/[id]/content` strictly blocked with HTTP 423 `FILE_QUARANTINED` prior to scan completion.
   - Strict SVG rejection enforced at byte signature inspection level, defeating stored XSS attack vectors.
   - Sharp worker re-encoding strips all metadata/EXIF tags, limits maximum dimensions to 2048x2048, and outputs clean WebP images to `clean/` storage.
   - Downloads served with `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment`, and MIME sanitization.

## Phase 6 Ratified Decisions

Status: Approved & Implemented

1. **Sandbox Feasibility Spike & Provider Decision**:
   - Conducted Linux host feasibility spike with cgroup v2 verification (`docker info --format '{{.CgroupVersion}}'` = 2).
   - Validated kernel namespace and cgroup containment across all 5 mandatory security vectors:
     1. Network egress attempt: blocked immediately with `java.net.SocketException: Network unreachable` (`--network none`).
     2. Filesystem write attempt outside `/tmp`: blocked with `Read-only file system` (`--read-only`).
     3. Fork bomb / PID exhaustion: contained at 51 threads without affecting host stability (`--pids-limit=64`).
     4. Memory exhaustion / heap overflow: contained cleanly with `java.lang.OutOfMemoryError: Java heap space` (`--memory=256m --memory-swap=256m`).
     5. Infinite CPU loop: terminated reliably by runner timeout within 2000ms.
   - **Sandbox Policy**: `container_runner` remains **REJECTED** pending dedicated security containment review. `SANDBOX_PROVIDER=mock` (Local Mock) is the sole approved provider for development, testing, and runtime execution. Experimental container runner implementation in `sandbox/src/containerRunner.ts` is preserved strictly as security-feasibility research material.
   - Integrated sandbox verification into the worker analysis pipeline, recording deterministic execution metrics in the `executions` table.

## Phase 7 Ratified Decisions

Status: Approved & Implemented

1. **WCAG 2.2 AA Accessible Java Concept Visualizations**:
   - Implemented all 12 canonical Java concept visualizer modes (`array`, `stack`, `queue`, `linked_list`, `binary_tree`, `heap`, `graph`, `hash_table`, `recursion`, `jvm_memory` (2D & 3D), `two_pointer`, `string_manipulation`).
   - Unified `ConceptVisualizer` orchestration supporting step scrubber, playback controls (play/pause/step), variable speed control (0.5x, 1x, 2x), and `aria-live="polite"` step narrations.
   - Every visualization couples a visual canvas/SVG representation with an accessible semantic HTML table fallback (`AccessibleTableFallback`) exposing complete variable states, step-by-step changes, and pointer highlights with `aria-current="step"`.
   - Contrast ratios exceed WCAG 2.2 AA requirements (>= 4.5:1 text, >= 3:1 graphical elements).
   - `prefers-reduced-motion: reduce` media query support implemented in `Visualizer.module.css` disabling animations and transitions for sensitive learners.

2. **Three.js WebGL Graceful Fallback & Context Management**:
   - `JvmMemoryScene3D` dynamically checks WebGL context availability (`isWebGLAvailable()`). If unavailable, unsupported, or if an exception is thrown, it renders the 2D SVG JVM Memory visualization with an accessible alert banner.
   - Strict resource lifecycle cleanup: meshes, geometries, materials, and WebGL renderer instances are explicitly traversed and disposed on component unmount, preventing browser memory leaks or WebGL context limits.

## Phase 8 Ratified Decisions

Status: Approved & Implemented

1. **12 Core Curriculum Lessons & Database Schema**:
   - Implemented `curriculum_lessons` schema with migration `20261106000000_curriculum_lessons`.
   - Seeded all 12 launch lessons idempotently across 4 canonical tracks:
     - **Foundations**: `primitive-types`, `control-flow`, `methods-exceptions`
     - **OOP**: `classes-objects`, `inheritance-polymorphism`, `interfaces-abstract`
     - **DSA**: `arrays-arraylist`, `stacks-queues`, `binary-search`
     - **Advanced Java**: `generics-wildcards`, `streams-lambdas`, `jvm-memory-model`
   - Verified that all 12 starter codes and challenge harnesses compile and pass execution against the isolated Java 21 container (`eclipse-temurin:21-alpine`).

2. **Three-Depth Conceptual Pedagogy & Lesson-to-Chat Handoff**:
   - Every lesson provides a real-world analogy hook, three distinct conceptual depths (`simple`, `standard`, `deep dive`), interactive algorithm visualization, in-lesson code runner, common mistakes cards, a 5-question quiz, and a mini coding challenge.
   - "Ask AI About This Lesson" seamlessly routes into the persistent chat workspace (`/dashboard/ask?prompt=...&lesson=...`), pre-populating learner question context.
   - Dynamic Java test assembly helper (`assembleJavaSource`) hoists imports to the file header and configures top-level execution classes cleanly.

---

## Phase 9: Practice, Progress, Mastery and Rewards Decisions

1. **Original Practice Problem Bank Architecture**:
   - Seeded 12 original, production-grade Java problems across Core Java, OOP, DSA, and Advanced Java.
   - Hidden test harnesses and reference solutions are strictly kept server-side and omitted from student API responses (`GET /api/v1/practice/:slug`).
   - Progressive 3-tier hint system allows learners to reveal guidance without spoiling solutions.

2. **Idempotent Rewards, Streak Calculation & Non-Coercive Gamification**:
   - Server-authoritative reward calculation: challenge completion idempotency enforced via unique constraint on `(user_id, item_type, item_id)`.
   - UTC-aligned daily streak counter increments on consecutive active days and gracefully resets on missed days without timezone drift or client manipulation.
   - Learners can disable gamification (XP, streaks, badges) at any time in Settings for a focused, pressure-free learning experience.

3. **Spaced Repetition & Privacy-Compliant Data Portability**:
   - Implemented SuperMemo SM-2 spaced repetition flashcards for automated mistake recovery.
   - Self-hosted data export (`POST /api/v1/settings/export`) compiles full user history while scrubbing sensitive credentials, tokens, and hashed passwords.

---

## Phase 10: Evaluation, Quality and Privacy-Safe Analytics Decisions

1. **Golden Evaluation Benchmark Suite**:
   - Authored 50 original, standalone Java 21 evaluation test cases (15 Core Java, 12 OOP, 15 DSA, 8 Concurrency).
   - Automated evaluation runner executes test cases against AI providers and verifies syntax, compilation, test assertions, and step visualizers.

2. **Strict Privacy, PII Scrubbing & Consent Invariants**:
   - Regex-based PII scrubber anonymizes emails, IP addresses, URLs, phone numbers, home directory paths, and API keys before any user question enters the Knowledge Base candidate pipeline.
   - Candidate creation strictly requires explicit user opt-in (`consentImprove: true`) and verified correct verification status.
   - Immediate privacy withdrawal propagation: toggling off `consentImprove` purges pending candidates.

3. **Owner Administration Console RBAC**:
   - Owner console located at `/dashboard/admin` and guarded by `requireOwnerAuth`. Non-owners receive HTTP 403 Forbidden.
   - Dashboard strictly displays aggregated metrics, anonymized candidates, and feedback reports without exposing raw user credentials or private chat histories.

---

## Phase 11: Production Hardening and Release Readiness Decisions

1. **Disaster Recovery & Automated Backup Drill**:
   - Implemented standard PostgreSQL backup (`scripts/backup-db.sh`) and restore (`scripts/restore-db.sh`) routines using gzip compression and SHA-256 checksums.
   - Automated disaster recovery test (`scripts/verify-backup-restore.mjs`) validates full snapshot restoration and asserts 100% data consistency across all database tables.

2. **Edge Runtime Compatible CSP Nonce Generation**:
   - Standardized CSP nonce generation on Web Crypto API (`globalThis.crypto.getRandomValues`) to ensure compatibility with Edge Runtime, Node.js, and browser environments.

3. **Concurrency Safety & High-Volume Idempotency**:
   - Refactored reward calculation in `progress.ts` to use atomic database operations, ensuring zero duplicate XP awards under simultaneous burst traffic.
   - Validated session revocation under concurrency: deleting sessions by `userId` revokes 20 concurrent sessions immediately without affecting other active users.

---

## Phases 4–11 Owner-Audit Remediation Decisions

1. **AI Provider Gateway & Worker Normalization (MEDIUM 1 & MEDIUM 4)**:
   - Wired the worker's analysis processor (`analysisProcessor.ts`) to `@javaverse/ai`'s `getAIProvider` factory instead of hardcoded mock functions, preserving `mock` as default.
   - External providers (Anthropic, Gemini) are chosen strictly through validated server environment configuration, never client parameters.
   - Removed Gemini API keys from URLs, standardizing on the `x-goog-api-key` header with automated key sanitization in error messages.
   - Standardized timeout handling and normalized error responses for schema/JSON validation failures.

2. **3D Visualization Reduced-Motion Adherence (MEDIUM 2)**:
   - Embedded `prefers-reduced-motion: reduce` detection in `JvmMemoryScene3D.tsx`.
   - Automatic rotation loop is disabled when reduced-motion is preferred, rendering the 3D scene statically.
   - Manual pointer-drag interaction is preserved to permit accessible user exploration without forced motion.
   - Added live media query change listeners that start/stop animation on preference toggle, with cleanup on unmount.

3. **SSE Connection Teardown & Limit Restitution (MEDIUM 3)**:
   - Bound HTTP `request.signal` abort directly to stream cleanup in `handleUserEventStream`.
   - Guaranteed single-execution decrement of per-user active SSE counter in Redis under any race condition between client abort, stream cancel, and heartbeat failure.

4. **Owner Evals Provider Factory Resolution (MEDIUM 5)**:
   - Resolved AI provider via `getAIProvider` in `/api/v1/admin/evals`, maintaining `mock` as default.
   - Ignored client-supplied provider/key parameters in request payloads to prevent credential overrides or internal configuration leakage.

5. **Idempotent Chat Retry Without Message Duplication (MEDIUM 6)**:
   - Updated `retryChatJob` in `chats.ts` to retry existing failed assistant jobs without inserting duplicate user messages.
   - Blocked retry attempts on actively running or completed jobs.
   - Serialized concurrent retries via row-level locking (`FOR UPDATE`) to ensure idempotency and prevent duplicate BullMQ jobs or messages.

6. **Raw Expression GIN Index Documentation & Schema-Drift Defense (LOW 1)**:
   - Confirmed Prisma schema DSL limitations regarding expression-based functional indexes (`to_tsvector` with concatenation).
   - Documented intentional raw SQL index `kb_items_search_idx` in `schema.prisma`.
   - Added automated drift verification to `scripts/verify-clean-db.mjs`.

7. **Daily Practice Streak Advance on Next Day (LOW 2)**:
   - Ensured repeat practice completions update daily activity and advance streaks on subsequent eligible calendar days while preserving single-award XP rules.

8. **Hardened Backup File Permissions (LOW 3)**:
   - Enforced `umask 077` and `chmod 600` on database backups and checksums in `scripts/backup-db.sh`, verifying permissions independently of operator shell configuration.

## Local-First Five-Account Model & Theme Remediation Decisions

Status: Approved & Implemented

1. **Local-First Five-Account Model (Owner Decision)**:
   - JavaVerse is an offline/local-first application intended for up to 5 local users (`LOCAL_ACCOUNT_LIMIT = 5`).
   - Normal public local signup enabled: any visitor can create an account directly from `/auth/signup`, accessible via prominent "Create account" actions on both the landing page (`/`) and login page (`/auth/login`).
   - Accounts are created with role `MEMBER` and `emailVerifiedAt: new Date()` (immediate verification) because local mode requires no external mail delivery service.
   - Successful registration immediately establishes a valid authenticated session, sets the approved secure session cookie (`javaverse_session`), and redirects safely to `/dashboard`.
   - Hard capacity limit of exactly 5 active accounts enforced transactionally in PostgreSQL via advisory lock `pg_advisory_xact_lock(74619284)` (`ACCOUNT_CREATION_ADVISORY_LOCK_ID`), counting non-deleted users (`status != 'DELETED'`).
   - When capacity is reached, returns HTTP 409 Conflict with the exact user-friendly message: `"This JavaVerse installation has reached its limit of 5 accounts."`.
   - Existing user login, password recovery, and logout continue operating normally when the account limit is reached.
   - Docker volumes (`postgres_data`) preserve local PostgreSQL accounts across normal container restarts; note caution that `docker compose down -v` permanently deletes local accounts.
   - Note: `container_runner` remains REJECTED (`SANDBOX_PROVIDER=mock`).

2. **Deprecation & Inactivation of Legacy OWNER Bootstrap**:
   - The workspace owner bootstrap screen (`/auth/bootstrap`) redirects to `/auth/signup`.
   - Legacy bootstrap endpoints (`/api/v1/auth/bootstrap/validate` and `/api/v1/auth/bootstrap/finalize`) are permanently deactivated, returning HTTP 403 `BOOTSTRAP_DISABLED`.
   - No terminal command, bootstrap token, invitation code, owner approval, or seeded credentials are required for fresh setup.
   - No browser or client can create or elevate an OWNER account.
   - Legacy OWNER database role and constraints are preserved in PostgreSQL to prevent destructive schema migrations; legacy OWNER support is documented as inactive.

3. **Admin Surface Inactivation**:
   - `MEMBER` accounts cannot access `/dashboard/admin` or `/api/v1/admin/*` (HTTP 403 `FORBIDDEN` enforced server-side).
   - Admin navigation items are hidden from normal member UI.
   - Existing admin route authorization and database models are retained without deletion; admin features are treated as inactive until a future administrative model is approved.

4. **Deterministic Theme Resolution & Dark Mode Fix**:
   - `SettingsView.tsx` refactored to consume the centralized `useTheme()` hook directly rather than maintaining disconnected local React state.
   - Immediate client-side application sets `document.documentElement.setAttribute('data-theme', theme)` and stores preference in `localStorage`.
   - Asynchronous background synchronization to `PATCH /api/v1/settings` persists preferences to PostgreSQL for authenticated sessions.
   - `tokens.css` augmented with semantic surface tokens (`--bg-surface-raised`, `--surface-raised`, `--surface-base`, `--card-bg`, `--card-border`, `--brand-contrast`) across light and dark themes to eradicate hardcoded white backgrounds in dark mode.
   - CSS modules in dashboard (`Practice.module.css`, `ProgressDashboard.module.css`, `PracticeWorkspace.module.css`, `LibraryView.tsx`) refactored to use semantic theme tokens.
   - Inline `ThemeScript.tsx` resolves unstored/system preference dynamically using `matchMedia('(prefers-color-scheme: dark)')` to eliminate white flash. Static sha256 hash synchronized in CSP headers (`packages/security/src/static-hashes.ts` and `scripts/extract-static-hashes.mjs`).

5. **Development CSP & Client-Side Form Hydration**:
   - In Next.js development mode (`NODE_ENV=development`), Turbopack/Next.js injects dynamic inline scripts and HMR websockets. Strict static hash CSP previously caused Firefox to block script execution, preventing React hydration and event listener attachment on `/auth/login` and `/auth/signup`.
   - Middleware now supplies dynamic nonce CSP (`buildDynamicNonceCsp`) during development (`isDev`), allowing React event listeners to hydrate and attach reliably.
   - Production builds (`NODE_ENV=production`) strictly retain immutable static script hashes without weakening CSP.
   - Forms on `/auth/login` and `/auth/signup` updated with explicit `method="POST"` and resilient on-demand CSRF token fetching in `handleSubmit` to prevent submission race conditions.

6. **Worker Development Script & Environment Loading**:
   - Worker package `apps/worker` dev script was invoking missing `src/index.js` while the codebase is TypeScript. Updated `package.json` to `"dev": "tsx watch src/index.ts"`.
   - `apps/worker/src/env.ts` updated to load environment files via `dotenv` (`.env.local`, `../../.env.local`, `.env`) before `validateEnv(process.env)`, allowing standalone worker execution during `pnpm dev`.

## Final Product-Alignment Remediation (Open-Source, Local-First Architecture)

1. **One User-Facing Account Model**:
   - JavaVerse operates strictly with one active account model: the learner account.
   - All accounts have identical product permissions; account #1 and account #5 behave identically.
   - Removed active owner, admin, bootstrap token, invitation, tenant, and seat concepts from landing, login, signup, dashboard navigation, and account settings.
   - Inactive admin routes remain server-protected with HTTP 403. Retained database role enums (`OWNER`, `MEMBER`) as inactive compatibility debt to avoid destructive database migrations.
   - Display names default to "Learner", never deriving from email local parts or exposing role names.

2. **Public Local Signup & 5-Account Capacity**:
   - Public signup at `/auth/signup` is the sole promoted onboarding path, returning HTTP 201 with secure session cookie.
   - Database advisory lock serializes concurrent registrations against the hard limit `LOCAL_ACCOUNT_LIMIT = 5`.
   - Clear capacity response: `"This local JavaVerse installation has reached its limit of 5 accounts. Existing users can still sign in."`.
   - Role names are omitted from signup and login client responses.

3. **Real User-Specific Progress**:
   - Replaced static fixture progress (`DETERMINISTIC_DASHBOARD_DATA`) with real, authenticated queries via `getUserProgressOverview(userId)` and `prisma.userProgress`.
   - New accounts start at exactly 0% overall progress, 0% track progress, 0 XP, 0 streak, and empty recent lessons list (`[]`).
   - Hero banner dynamically shows "Start Learning" (href: `/dashboard/learn`) and "Welcome, <displayName>!" for zero completions; "Continue Learning" for accounts with progress.
   - Recent lessons renders honest copy when empty: `"No lessons completed yet. Start your Java learning journey to begin tracking progress."`.

4. **Transparent AI Provider & Usage Architecture**:
   - Maintained `mock` as primary AI provider (`AI_PROVIDER_PRIMARY=mock`) returning `providerId: 'mock'`, `modelId: 'mock-analyzer-v1'`, and zero token usage (`inputTokens: 0, outputTokens: 0, totalTokens: 0`).
   - Allowed providers (`mock`, `gemini`, `anthropic`) and model allowlists (`gemini-2.5-flash`, `claude-3-5-sonnet-20241022`) strictly enforced in factory.
   - In Ask JavaVerse workspace, rendered visible AI mode banner indicating active provider, active model, and usage note.
   - Implemented External AI Consent modal for Gemini/Anthropic before first external request, allowing Continue, Cancel, and session-scoped opt-out.
   - Pre-prompt local PII scrubbing enforced via `@javaverse/security` `scrubPii` before sending code or prompts to AI providers.
   - Replaced unapproved sandbox verification claims (`Verified in Sandbox`) with accurate execution mode (`Execution mode: Local Mock`).

5. **Deterministic Worker Environment Resolution**:
   - `apps/worker/src/env.ts` implements `findRepoRoot()` by searching upward for `pnpm-workspace.yaml`.
   - Loads `.env.local` and `.env` strictly from the repository root; eliminates any resolution of `apps/.env.local`.
   - Preserves parent-process environment variables and avoids secret logging.

6. **Dev-Tools Overlay Isolation & CSP Correctness**:
   - Confirmed "Route Info" and "Clear Segment Overrides" originate from Next.js 15 dev-mode Turbopack internal DevTools (`next-devtools/dev-overlay`), which are automatically omitted from production builds (`next build`).
   - Production CSP enforces strict script nonces/hashes with zero `'unsafe-eval'` and zero wildcards. Development CSP permits dynamic nonce CSP for fast refresh and hydration.

7. **start-dev.sh Safety & Persistence Contract**:
   - Augmented `start-dev.sh` with prerequisite verification (`docker`, `pnpm`), status reporting, and safety documentation.
   - Explicitly clarified that Ctrl+C terminates Node processes while preserving Docker containers and the `javaverse_postgres_data` volume.
   - Added explicit warnings against `docker compose down -v` to prevent accidental loss of local accounts.

## Closure Audit & Alignment Remediation

1. **Original Manual Login Failure Explained**:
   - Both root `.env.local` and `apps/web/.env.local` configure the identical PostgreSQL database (`postgresql://postgres:postgres@127.0.0.1:5432/javaverse`).
   - Automated integration and E2E test suites (`signup.test.ts`, `auth.spec.ts`) execute `prisma.user.deleteMany()` in `beforeEach()` hooks to ensure clean test state.
   - When manual testing occurred, an account was successfully created and hashed with Argon2id in `javaverse`. Running any automated test suite or `test:clean-db` subsequently purged all rows in the `users` table.
   - On returning to log in, `prisma.user.findUnique({ where: { email } })` returned null, causing the endpoint to return HTTP 401 `"Invalid email or password"`. Returning to `/auth/signup` succeeded because the email address was no longer taken.
   - Architecture resolution: Separate development and test database URLs or preserve local state by running tests against isolated test databases.

2. **Neutral User-Facing Role Terminology**:
   - Eradicated all instances of `"403 Forbidden - Owner Access Required"` and `"Only workspace owners can..."`.
   - Replaced with neutral copy: `"This feature is not available in the current JavaVerse version."` and `"Administrative features are inactive in this installation."`.
   - Renamed E2E test from `"Member Login Flow"` to `"Learner Login Flow"`.
   - Verified that no learner account can access inactive admin pages or APIs.

3. **V1 Provider-Selection Policy**:
   - Installation-wide provider selection only: The local installation operator determines the active provider (`AI_PROVIDER_PRIMARY`) and model (`GEMINI_MODEL`, `ANTHROPIC_MODEL`) via server-side environment variables.
   - Learners can view active provider, active model, local/external status, and usage metadata.
   - Learners cannot modify installation API keys, select unconfigured providers, or submit arbitrary model identifiers.

4. **AI Consent Wording and Browser Session Persistence**:
   - Consent dialog checkbox updated to accurate wording: `"Remember for this browser session"`.
   - Stored in `sessionStorage` under `external_ai_consent`.
   - TopBar `handleLogout` explicitly clears `sessionStorage.removeItem('external_ai_consent')` so subsequent users on the same machine/browser do not inherit consent.
   - Clicking "Cancel" on the consent modal closes the modal, retains the draft prompt in the composer textarea, creates zero durable jobs, and initiates zero network requests.

5. **AI Limits & Safe Defaults**:
   - Implemented configurable defaults in `packages/schemas/src/env.ts` and `apps/web/src/lib/aiLimits.ts`:
     - `EXTERNAL_AI_DAILY_REQUEST_LIMIT_PER_USER = 50` (prevents runaway API costs while accommodating extensive study).
     - `EXTERNAL_AI_MAX_CONCURRENCY = 2` (prevents exhausting provider RPM tiers and local connection pools).
   - Enforced Redis keys:
     - Duplicate submission lock: `ai:submit:lock:<userId>` (3s TTL).
     - Per-user daily request count: `ai:limit:daily:<userId>:<YYYY-MM-DD>` (24h TTL).
     - Global installation concurrency: `ai:concurrency:global`.
   - Local Mock mode (`AI_PROVIDER_PRIMARY=mock`) bypasses all external AI limits by default.

6. **Token-Usage Metadata Durability**:
   - Usage metadata is durably stored in PostgreSQL inside `Analysis.result.usageMetadata` (linked to `Message`).
   - Page refreshes and reopening past chats retrieve the persisted `analysis.result.usageMetadata`.
   - Nullable fields (`inputTokens`, `outputTokens`, `totalTokens`, `fallbackReason`) handled gracefully; missing tokens format as `"Token usage not reported by provider"`.
   - Local mock mode explicitly reports `"Local Mock · No external token usage"`, never fabricating synthetic token metrics.

## Final Data-Safety & AI-Verification Closure

1. **Test-Database Isolation Architecture**:
   - Normal development database: `javaverse` (remains untouched by automated test runs).
   - Test execution database: `javaverse_test` (used by Vitest and Playwright test suites).
   - Migration deployment verification database: `javaverse_clean_verify` (used by `test:clean-db`).
   - Disaster recovery verification database: `javaverse_backup_verify_test` (used by `test:backup-restore`).
   - Central safety guard `assertSafeTestDatabase(databaseUrl, { requireTestEnv?: boolean })` implemented in `@javaverse/db`:
     - Strictly allowlists: `javaverse_test`, `javaverse_clean_verify`, `javaverse_backup_verify_test`.
     - Strictly rejects: `javaverse`, `postgres`, `production`, `prod`, `template0`, `template1`, malformed URLs, and missing database names.
     - Enforces `NODE_ENV=test` before permitting destructive actions (`deleteMany`, `delete`, `truncate`, `drop`).
     - Invoked before all test cleanups across Vitest and Playwright.
     - Validated by end-to-end persistence safety test (`dev-db-persistence.test.ts`) proving development database marker accounts survive full test suite cleanups.

2. **Canonical AI Environment Configuration**:
   - Standardized on one canonical set of configuration variables:
     - `AI_PROVIDER_PRIMARY`: `mock` | `gemini` | `anthropic` (default: `mock`)
     - `EXTERNAL_AI_ENABLED`: `false` | `true` (default: `false`)
     - `GEMINI_API_KEY`: optional string
     - `GEMINI_MODEL`: default `gemini-2.5-flash`
     - `ANTHROPIC_API_KEY`: optional string
     - `ANTHROPIC_MODEL`: default `claude-3-5-sonnet-20241022`
     - `EXTERNAL_AI_DAILY_REQUEST_LIMIT_PER_USER`: default `50`
     - `EXTERNAL_AI_MAX_CONCURRENCY`: default `2`
   - Synchronized across Zod schemas, provider factory, worker, endpoints, and `.env.example`.

3. **Complete AI Limit Behavior & Concurrency Reclamation**:
   - Redis daily key format: `ai:limit:daily:<userId>:<YYYY-MM-DD>` with bounded TTL calculated from UTC midnight + 1h buffer.
   - Global concurrency key: `ai:concurrency:global` with safety TTL, completely separate from per-user quota keys.
   - Safe HTTP 429 response communicating retry timing (in hours until UTC midnight for daily limit; seconds for concurrency).
   - Quota refund helper (`refundAiDailyQuota`) ensures requests rejected before dispatch do not decrement learner daily limit.
   - Concurrency slots automatically reclaimed on completion, failure, cancellation, or error via `try...finally` in worker and API.

4. **Honest Privacy Copy & Logging Safeguards**:
   - Replaced claims that PII scrubbing stops all prompt injection with accurate copy:
     _"JavaVerse applies automated redaction and structured prompt boundaries. Automated detection may not identify every sensitive value. Do not submit passwords, API keys, confidential code, or private information."_
   - Verified worker and web logger output contain only job metadata IDs (`jobId`, `chatId`, `userId`, `messageId`), omitting full prompts and raw model responses.

5. **27-Scenario Browser E2E Verification**:
   - Playwright Ask-AI suite (`apps/web/test/e2e/ask-ai.spec.ts`) upgraded to cover all 27 required scenarios across Chromium and Firefox, including mock execution, external stubbing, session consent clearing, cross-user chat/usage isolation, and dark mode.

## Single-Account Model & Legacy Role Removal Decisions

Status: Approved & Implemented

1. **Definitive Single-Account Architecture (Learner Account Only)**:
   - JavaVerse has exactly one account type: **learner account**.
   - Every active account possesses identical capabilities and permissions.
   - The active concepts of OWNER, MEMBER, administrator, privileged first account, admin console, admin APIs, bootstrap flow, bootstrap tokens, invitation flows, invited accounts, seat reservations, and workspace ownership are permanently eradicated.
   - All role-based authorization checks, guards, and middleware barriers are removed.

2. **Forward-Only Database Migration (`20261109210000_single_learner_account_model`)**:
   - Prior to applying the migration, a non-destructive database backup was created and verified (`./backups/javaverse_backup_20261109_155417.sql.gz`).
   - Legacy OWNER accounts converted to uniform learner accounts before structural modifications.
   - User ids, emails, password hashes, sessions, chats, progress, streaks, bookmarks, and analysis histories are preserved 100%.
   - Dropped schema elements:
     - `users.role` column and associated `chk_users_role` constraint.
     - `idx_users_single_active_owner` partial unique index.
     - `invitations` table, its constraints, foreign keys, and indexes.
     - `deployment_limits.registration_mode` column.
     - `audit_logs.actor_role_at_time` column.
     - PostgreSQL enums `Role` and `UserRole`.
   - `packages/db/prisma/schema.prisma` synchronized: `model User` has zero role column; `model Invitation` completely deleted; `deployment_limits` has no registration mode.

3. **Complete Codebase Cleanse of Obsolete Surfaces**:
   - Deleted all legacy admin, bootstrap, and invitation routes and files:
     - `apps/web/src/app/(dashboard)/dashboard/admin`
     - `apps/web/src/app/admin`
     - `apps/web/src/app/api/v1/admin`
     - `apps/web/src/app/(public)/auth/bootstrap`
     - `apps/web/src/app/api/v1/auth/bootstrap`
     - `apps/web/src/app/(public)/auth/invite`
     - `apps/web/src/app/api/v1/invitations`
     - `apps/web/src/lib/adminAuth.ts`
     - `apps/web/src/lib/invitations.ts`
     - `scripts/bootstrap-owner.mjs`
     - Obsolete test suites: `admin-auth.test.ts`, `bootstrap.test.ts`, `concurrency.test.ts`, `admin.spec.ts`.
   - Neutral redirect handling in middleware: legacy `/auth/bootstrap` and `/auth/invite` redirect cleanly to `/auth/signup`; `/admin` and `/dashboard/admin` redirect to `/dashboard`.

4. **Session Cookie Protocol & Multi-Browser Compatibility**:
   - Implemented `getSessionTokenFromCookies` checking both `__Host-javaverse_session` and `javaverse_session`.
   - RFC 6265bis specifies that `__Host-` prefixed cookies require HTTPS. In local HTTP testing, browsers like Firefox reject `__Host-` cookies. Checking both names enables seamless local multi-browser testing (Chromium + Firefox) without sacrificing production security.
   - Synchronized `APP_MASTER_KEY` across Playwright test runner and Next.js server processes to guarantee identical session HMAC derivation.

## Ask-AI Token Usage Rendering & Composer Busy State Decisions

Status: Approved & Implemented

1. **Persistent Mock Provider Metadata & Honest Token Usage Display**:
   - In `apps/worker/src/processors/analysisProcessor.ts`, Mock analysis results persist:
     ```json
     {
       "providerId": "mock",
       "modelId": "mock-analyzer-v1",
       "usageMetadata": {
         "inputTokens": 0,
         "outputTokens": 0,
         "totalTokens": 0,
         "isSynthetic": true
       }
     }
     ```
   - In `apps/web/src/components/chat/ChatConversation.tsx`, `[data-testid="token-usage-display"]` reliably detects mock execution from `providerId === "mock"`, `modelId.startsWith("mock")`, or `usageMetadata.isSynthetic === true`, displaying:
     `Local Mock · No external token usage`
   - If usage metadata is missing or provider is unmetered mock, honest compatibility copy is rendered rather than fabricating external token counts.
   - Usage metadata remains persistent and visible across page reloads, chat reopening, and SSE reconnections.

2. **Persistent Composer Mount & Accessible Busy State**:
   - The Ask-AI composer and Send Question button remain mounted during submission and background job processing.
   - The button retains its stable accessible name `Send Question` at all times (`aria-label="Send Question"`) rather than swapping inner text to `Processing...`.
   - When busy (`isWorking || isSending`), the button is `disabled`, has `aria-disabled="true"`, and `aria-busy="true"`.
   - Processing progress is communicated to screen readers via adjacent status element: `<span role="status" aria-live="polite" data-testid="composer-processing-status">Processing question...</span>`.

3. **Multi-Layer Duplicate Submission Prevention**:
   - Client layer: Synchronous ref `isSubmittingRef.current = true` prevents multiple HTTP dispatches from rapid duplicate clicks within the same event loop frame.
   - API / DB layer: `postUserMessage` acquires a transaction-level PostgreSQL advisory lock `SELECT pg_advisory_xact_lock(hashtext('chat_post_' || $chatId))` and checks for any active `PENDING` or `RUNNING` job on the chat before creating a new job.
   - If an active job exists, `ActiveJobInProgressError` is thrown and returned as HTTP 409 Conflict.

## Credentials Freedom, Password Policy & Sign-In Reliability Decisions

Status: Approved & Implemented

1. **Credential Freedom & Canonical Normalization**:
   - Registration and login accept any syntactically valid email format (e.g. Gmail, Outlook, academic, or custom domains) without predefined domain allowlists or simulated inbox requirements.
   - Canonical email normalization (`canonicalizeEmail` in `@javaverse/security`) trims outer whitespace and converts local and domain parts to lowercase (with Punycode conversion for internationalized domain names).
   - Case-variant duplicate email registration is rejected with HTTP 409 `USER_EXISTS`.
   - Email lookup during login is case-insensitive and whitespace-safe via canonical normalization.

2. **Strict Password Whitespace Policy**:
   - Passwords must never be silently trimmed, transformed, or stored in plaintext.
   - Internal spaces are permitted when the password meets length requirements (12–128 characters).
   - Leading or trailing whitespace is strictly rejected during registration with the visible error:
     `Password cannot begin or end with whitespace.`
   - Policy is enforced synchronously across `packages/schemas/src/auth.ts` (`passwordSchema`, `signupSchema`, `resetPasswordSchema`, `changePasswordSchema`) and `packages/security/src/password.ts` (`validatePasswordPolicy`).
   - Login compares the exact submitted password against the stored Argon2id hash without modification. Case-variant passwords fail with generic 401 `INVALID_CREDENTIALS` (`Invalid email or password`).

3. **Playwright Web Server Isolation**:
   - In `apps/web/playwright.config.ts`, `reuseExistingServer` is set to `false` and guarded with `assertSafeTestDatabase(TEST_DATABASE_URL)`.
   - This prevents automated E2E tests from executing against a running local development server connected to `javaverse`, preventing test accounts or test wipes from polluting or destroying learner accounts.

4. **Installation & Database Ownership**:
   - Local-first architecture: Each independently cloned or deployed JavaVerse installation connects exclusively to its configured PostgreSQL instance.
   - Zero remote database connections or data transmission to the maintainer.
   - Capacity of 5 local accounts is isolated per installation.
   - Verified that accounts in a disposable database are completely invisible in the primary development database.

5. **Password Storage & Argon2id Verification**:
   - JavaVerse hashes passwords using Argon2id. Plaintext passwords are never stored. During sign-in, the exact submitted password is verified against the stored one-way Argon2id hash.
   - Argon2id password hashing is intentionally one-way and irreversible. Plaintext passwords are never decrypted or recovered.
   - Password hashes are strictly omitted from API responses, client payloads, logs, exports, and audit records.

6. **Logout, Cookie Expiration & Browser Storage Isolation**:
   - Logout revokes the server-side session and expires the HttpOnly `javaverse_session` cookie. Browser `sessionStorage` and `localStorage` are separate mechanisms. JavaVerse separately removes session-scoped external-AI consent while preserving the learner's local theme preference.
   - Logout does not execute indiscriminate `localStorage.clear()` or `sessionStorage.clear()`, preventing data loss of unrelated browser state.
   - Session-scoped external-AI consent is removed via `sessionStorage.removeItem('external_ai_consent')` so subsequent learners using the same browser session never inherit prior consent.
   - Logout responses return HTTP 200 without exposing raw session tokens or sensitive session identifiers.

## Final Repository Alignment & Remediation Decisions

Status: Approved & Implemented

1. **Dead Package Script Removal (`bootstrap:owner`)**:
   - The legacy root package script `"bootstrap:owner": "node scripts/bootstrap-owner.mjs"` was permanently removed from `package.json`.
   - JavaVerse uses public local signup up to 5 accounts with uniform learner capabilities; bootstrap tokens and owner onboarding scripts were deleted in migration 6.

2. **Transactional Verification Email Alignment (`sendVerificationEmail`)**:
   - Refactored `sendOwnerVerificationEmail` to `sendVerificationEmail` with neutral subject line: `"Verify your JavaVerse email"`.
   - Purged dead, unused `sendMemberInvitationEmail` helper and updated tests to verify transactional email delivery via Mailpit without legacy role or workspace terminology.

3. **Purge of Inactive `REGISTRATION_MODE` Configuration**:
   - Removed `REGISTRATION_MODE` from `EnvSchema`, `.env.example`, `scripts/generate-env-local.mjs`, and `turbo.json`.
   - JavaVerse registration mode is non-configurable: local registration is always open until the 5-account installation ceiling is reached.

4. **Neutral Suspended Account User Experience**:
   - Updated `apps/web/src/app/(public)/auth/suspended/page.tsx` to display neutral, truthful copy: `"This account is currently unavailable. Account recovery is not yet supported in the JavaVerse interface."`
   - Replaced administrator/workspace contact instructions with a learner-safe action: `"Return to Sign in"`.

5. **Study Notes Page Status Ratification (Outcome B)**:
   - Ratified Outcome B: `/dashboard/notes` is retained as an intentional future-feature placeholder shell with neutral wording: `"Feature Preview · Scheduled for future release"`.
   - Removed internal phase-development terminology (`Phase 2 Shell Preview`, `Phase 8`). Full interactive study notes interface is scheduled as future milestone `REM-16`.

6. **Sandbox Policy & Container Runner Status Alignment**:
   - Container-based code execution (`container_runner`) remains strictly **REJECTED** pending a dedicated security containment review.
   - `SANDBOX_PROVIDER=mock` (Local Mock) is the sole approved provider across web, worker, and practice pipelines.
   - Updated `sandbox/src/factory.ts` so invalid or unapproved provider requests fail closed immediately.
   - Prohibited unsupported execution verification claims in the learner UI (e.g. absence of "Verified in Sandbox").

7. **Deterministic Static Script Hash Verification (`verify:static-hashes`)**:
   - Added dedicated verification command: `pnpm verify:static-hashes` (`scripts/verify-static-hashes.mjs`), which extracts expected hashes deterministically from prerendered HTML and verifies equality with committed `packages/security/src/static-hashes.ts`.
   - Deleted redundant, unconsumed artifact `packages/security/src/static-hashes.json`.
   - Enforced alphabetical canonical sorting in `extract-static-hashes.mjs` and ensured stable builds without spurious diffs.

8. **PROJECT_SPEC.md Historical Index Ratification**:
   - Relabeled `PROJECT_SPEC.md` as a historical specification index describing early development phases, clearly stating that it is not the current product specification.
   - Formally established `docs/reviews/project-dossier/JAVAVERSE_PROJECT_DOSSIER.md` as the authoritative current technical specification.

9. **Self-Hosting Operations Guide Alignment**:
   - Retitled `docs/runbooks/OPERATIONS.md` to _"JavaVerse Self-Hosting & Local Operations Guide"_, adding prominent disclaimers that public multi-tenant production hosting is unapproved.
   - Removed diagrams depicting container runner execution as production-ready and purged all obsolete administrative and invitation procedures.

10. **Open-Source Status & Terminology Standardization**:
    - Standardized public documentation statement: _"JavaVerse is source-visible and preparing for open-source release."_
    - The missing root `LICENSE` file is documented as a P0 blocker for public open-source release, while not blocking internal technical merge readiness.
    - Repository maintenance terminology standardized to "project maintainer", "maintainer review", "manual smoke test", and "authenticated user-resource isolation".

11. **Pre-Authentication CSRF Architecture & Multi-Flow Governance**:
    - **Flow-Bound Token Priority:** In `GET /api/v1/auth/csrf`, explicit pre-auth flow queries (`?flow=signup`, `?flow=login`, `?flow=forgot_password`, `?flow=reset_password`, `?flow=mfa`) strictly take precedence over ambient session context. The endpoint returns a flow-bound 4-part token (`${nonce}.${flow}.${expiresAt}.${signature}`) rather than falling back to session CSRF tokens.
    - **Flow Cookie Binding & Cross-Tab Isolation:** Sets flow-specific cookies (`javaverse_csrf_<flow>` in development / `__Host-javaverse_csrf_<flow>` in production HTTPS) with `Path=/`, `HttpOnly`, and `SameSite=Lax`. Separate cookie namespaces guarantee that opening signup and login in concurrent tabs does not cause cross-flow token overwrite.
    - **Safe One-Time Automatic Retry:** Forms on `/auth/signup` and `/auth/login` manage tokens using React `useRef` to eliminate state update races. When the server returns a recognized `CSRF_ERROR`, the form automatically requests a fresh flow token and retries submission exactly once before displaying any error to the learner.
    - **Learner-Facing Session Expiry Copy:** Replaced internal security phrasing (`Invalid pre-auth CSRF token`) with friendly learner-facing messages: `"Your secure signup session expired. Please try again."` on signup and `"Your secure sign-in session expired. Please try again."` on sign-in.
    - **Replay Protection & Token Consumption:** Tokens are single-use for state-changing operations and marked consumed upon successful account creation or session issuance, preventing replay attacks. Tokens are tracked in shared Redis with a process-local in-memory cache fallback. The fallback supports the current single-process local runtime but does not provide cross-process or multi-instance replay tracking.
    - **Response Caching Controls:** All CSRF responses enforce `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` and `Pragma: no-cache` to ensure browsers and intermediaries never cache tokens.
    - **Host and Origin Consistency:** Enforces canonical origin `http://localhost:3000`. Forms automatically redirect requests originating from `127.0.0.1` to the canonical `localhost` origin before form submission. Sec-Fetch-Site blocks cross-site attacks.

12. **Password Creation, Password Manager Semantics & Breached-Password Screening Architecture**:
    - **Form Semantics & Password Manager Attributes:** All authentication surfaces (`/auth/signup`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/dashboard/settings/security`) strictly provide semantic HTML `<form>` wrappers and standard input attributes. All text inputs specify explicit `name` attributes (`name="displayName"`, `name="email"`, `name="password"`, `name="confirmPassword"`) and standard `autoComplete` attributes (`autocomplete="name"`, `autocomplete="username"`, `autocomplete="new-password"`, `autocomplete="current-password"`). The browser password manager contained an incorrect saved password for `learner1@gmail.com`. Earlier missing form names and autocomplete metadata may have contributed to incorrect credential classification, but the exact mechanism that stored the terminal command cannot be proven from available evidence. Explicit form and input semantics ensure password managers in Chromium and Firefox receive standard metadata.
    - **Learner-First Password Policy:** Requires a minimum of 12 characters and allows up to 128 characters. Permitted internal spaces enable strong, memorable multi-word passphrases (e.g., `correct horse battery staple`). Leading and trailing whitespace is strictly rejected with explicit copy: `"Password cannot begin or end with whitespace."` to prevent accidental whitespace mismatches across typing and autofill. Composition rules requiring arbitrary numbers, uppercase characters, or special symbols are omitted in alignment with NIST SP 800-63B guidelines. Passwords under 12 characters reject with `"Use at least 12 characters."`. Confirmation mismatches return `"Passwords do not match."`.
    - **Distinction Between Common and Breached Passwords:** Password screening distinguishes between locally detected predictable passwords and remote breach lists.
      - Predictable passwords in the local common blocklist return HTTP 400 `PASSWORD_COMMON` with friendly guidance: `"This password is too common. Choose a longer, less predictable password."`.
      - Passwords confirmed in HaveIBeenPwned (HIBP) breach databases via k-anonymity SHA-1 range queries return HTTP 400 `PASSWORD_BREACHED` with clear guidance: `"This password appears in a known breach list. Choose a different password or use a password manager to generate one."`.
      - Substrings matching common words inside longer, unique passphrases are not rejected.
    - **Degraded-Mode Non-Blocking Fallback:** In the event of network timeouts, HIBP service downtime, or upstream HTTP errors, JavaVerse falls back gracefully to local policy and blocklist verification, allowing registration, password change, and password reset to proceed without blocking the learner. A non-blocking audit event (`auth.breach_check_degraded`) is recorded with sanitized metadata (`{ provider: 'hibp', reason: 'unavailable', degraded: true }`). Plaintext passwords and learner emails are never logged in degraded events. Sign-in never contacts external breach services.
    - **Signup-to-Login Credential Consistency & One-Way Storage:** Email addresses are normalized (trimmed and lowercased) identically at registration and login. Plaintext passwords are never stored. JavaVerse stores the one-way Argon2id password hash and verifies the exact submitted password against that hash during sign-in. Password hashes are never exposed through API responses, user sessions, audit logs, or client interfaces.
    - **Development Account Audit & Recovery Verification:** Database inspection confirmed that `learner1@gmail.com` does not exist in the active development database `javaverse` (0 rows), whereas separate testing account `hello1@gmail.com` remains active with its valid Argon2id hash intact. Plaintext passwords cannot be decrypted from Argon2id hashes. Full browser password recovery was verified end-to-end via Mailpit fragment URLs (`#token=`) and new password creation.

### Decision 35: Evidence-Driven Signup Persistence, Database Isolation, and Sign-In Reliability

- **Context:**
  During manual testing, learners created accounts (e.g. `learner@gmail.com`, `learner1@gmail.com`, `hello1@gmail.com`) that appeared to successfully redirect to the dashboard, but subsequent sign-in with the exact same credentials returned HTTP 401 `Invalid email or password`. While a browser password manager entry contained an incorrect saved password, investigation proved that password managers are a separate secondary factor and cannot cause database rows to disappear or fail to persist.
- **Root Cause Analysis:**
  1. **Database Targeting Collision:** Playwright's `webServer` launches a production Next.js instance on port 3000 with `DATABASE_URL` overridden to `javaverse_test`. When manual browser testing occurred at `http://localhost:3000` while this server was running, user accounts were committed to `javaverse_test`. Subsequent automated test suites executed `prisma.user.deleteMany()` in `beforeEach`, wiping `javaverse_test`. When the developer subsequently started `./start-dev.sh` targeting the persistent development database `javaverse`, sign-in attempts queried `javaverse`, where the row had never been written, resulting in HTTP 401 `Invalid email or password`.
  2. **Dashboard Fixture Backdoors:** `DashboardLayout`, `middleware.ts`, `library/page.tsx`, `progress/page.tsx`, and `settings/page.tsx` contained conditional logic checking `E2E_FIXTURES_ENABLED === 'true'` that rendered a mock `Demo User` even when `sessionCtx` was null, creating the false appearance of an authenticated session without a committed database row.
- **Architectural Decision & Remediations:**
  1. **Strict Dashboard Authentication & Backdoor Removal:** Removed all `E2E_FIXTURES_ENABLED` fallbacks and demo user creation from `DashboardLayout`, `middleware.ts`, `library`, `progress`, and `settings`. Unauthenticated access to any `/dashboard` route strictly redirects to `/auth/login`.
  2. **Safe Database Startup Guards:** Implemented `verifyDatabaseStartupGuard` and `getSafeDatabaseDiagnostics` in `@javaverse/db`. At web and worker bootstrap, safe connection diagnostics (`component`, `dbHost`, `dbPort`, `dbName`, `mode`) are logged once without exposing usernames, passwords, query parameters, or full URLs. In `NODE_ENV=test`, startup immediately fails closed if `dbName` is not in `ALLOWED_TEST_DATABASES`. In `NODE_ENV=development`, a warning is logged if `dbName` ends with `_test`.
  3. **Playwright Pre-flight Safety Guard:** Configured Playwright runner and subshell command to assert safe test database and explicitly abort before starting the web server if `DATABASE_URL` targets `javaverse`.
  4. **Signup Transaction Atomicity:** Verified that `user.create`, `createSessionRow`, and `recordAuditEvent` execute atomically within `prisma.$transaction`. Cookies and HTTP 201 are only dispatched after transaction commit. Added regression tests proving complete rollback (zero users, zero sessions, no cookie) on user creation failure, session creation failure, and commit failure.
  5. **Account Truth Invariant:** Standardized documentation confirming that PostgreSQL is the sole system of record for account existence. Plaintext passwords are never stored and cannot be recovered; only Argon2id hashes are stored, and password reset via Mailpit is the supported recovery path.

### Decision 36: Decoupling Account Creation from Authenticated Session Creation

- **Context:**
  Previously, JavaVerse automatically generated session tokens, wrote an active session row, set the authenticated session cookie, and redirected learners directly to `/dashboard` immediately upon account creation. This behavior masked sign-in defects, allowed successful registration to be falsely treated as proof that credential verification worked, and created confusion when subsequent sign-in failed due to mismatched credentials, environment targeting, or session discrepancies.
- **Architectural Requirement:**
  The account-creation lifecycle is strictly decoupled from session issuance. Account creation must never automatically authenticate a learner or be treated as proof that password sign-in works.
  Authoritative lifecycle:
  `Create account` → persist learner account and Argon2id hash → do not create an authenticated session → redirect to `/auth/login?created=1` → display accessible confirmation notice → learner manually enters credentials → successful sign-in creates session → redirect to `/dashboard`.
- **Architectural Decisions & Implementation:**
  1. **Signup Route Session Decoupling (`/api/v1/auth/signup`):**
     - Added an already-authenticated guard: if `getSessionFromRequest(request)` resolves an active session, the endpoint rejects the request with HTTP 400 `ALREADY_AUTHENTICATED` (`"An account is already signed in. Sign out before creating another account."`).
     - Removed `generateSessionTokens` and `createSessionRow` from the signup database transaction. The transaction creates only the learner account with its Argon2id hash and writes the audit event.
     - Removed session cookie issuance (`Set-Cookie`) from the HTTP 201 response.
     - Returns HTTP 201 with `{ success: true, message: "Account created successfully. Sign in to continue.", user: { id, email, displayName, role }, requiresSignIn: true }`.
  2. **Signup Page Redirect (`/auth/signup`):**
     - Upon receiving HTTP 201 from the signup API, the client immediately redirects to `/auth/login?created=1`.
  3. **Login Page Confirmation Notice (`/auth/login`):**
     - Reads `created=1` query parameter on mount and displays an accessible status alert (`role="status"`): `"Account created successfully. Sign in with your email and password."`.
     - The confirmation alert is displayed above the credentials form and is cleared when the learner initiates form submission.
  4. **Comprehensive Test Alignment:**
     - Integration suites (`signup.test.ts`, `csrf-ratelimit.test.ts`, `credentials-reliability.test.ts`) assert that signup creates 0 sessions, dispatches no session cookie, and returns `requiresSignIn: true`, followed by an explicit sign-in request that creates exactly 1 session row and returns a valid session cookie.
     - Added integration test verifying that already-authenticated sessions are blocked from creating additional accounts with HTTP 400 `ALREADY_AUTHENTICATED`.
     - End-to-end browser suites (`auth.spec.ts`, `ask-ai.spec.ts`) updated across all 188 browser scenarios to execute the decoupled `signup -> /auth/login?created=1 -> login -> /dashboard` sequence.

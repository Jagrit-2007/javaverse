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
   - **Ratified Decision**: `container_runner` is ratified as the primary production sandbox execution provider for Java code (`eclipse-temurin:21-alpine` pinned), with `mock` retained for development, fast local testing, and offline fallback.
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

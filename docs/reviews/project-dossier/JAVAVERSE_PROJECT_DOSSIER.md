# Authoritative JavaVerse Project Dossier

> **Authoritative Technical & Product Specification**  
> **Repository:** `JavaVerse` (Self-hosted, local-first Java learning platform)  
> **Target Branch:** `fix/phases-4-11-owner-audit` (`HEAD: 5207257`)  
> **Audited By:** Pair Programming AI Auditor  
> **Date:** November 10, 2026  
> **Status Classifications:** Implemented · Implemented but awaiting merge · Tested · Manually verified · Unverified · Deferred · Rejected  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Product Problem](#2-product-problem)
3. [Intended Learner Experience](#3-intended-learner-experience)
4. [Current Feature Set](#4-current-feature-set)
5. [Current Limitations](#5-current-limitations)
6. [Local-First Operating Model](#6-local-first-operating-model)
7. [Five-Account Installation Model](#7-five-account-installation-model)
8. [Signup Flow](#8-signup-flow)
9. [Login Flow](#9-login-flow)
10. [Logout Flow](#10-logout-flow)
11. [Password Hashing](#11-password-hashing)
12. [Session Architecture](#12-session-architecture)
13. [CSRF Architecture](#13-csrf-architecture)
14. [Rate Limiting](#14-rate-limiting)
15. [Test-Database Isolation](#15-test-database-isolation)
16. [PostgreSQL Responsibilities](#16-postgresql-responsibilities)
17. [Redis Responsibilities](#17-redis-responsibilities)
18. [Docker Responsibilities](#18-docker-responsibilities)
19. [Web Application Architecture](#19-web-application-architecture)
20. [Worker Architecture](#20-worker-architecture)
21. [Durable Job Lifecycle](#21-durable-job-lifecycle)
22. [SSE Lifecycle](#22-sse-lifecycle)
23. [Curriculum](#23-curriculum)
24. [Lessons](#24-lessons)
25. [Quizzes](#25-quizzes)
26. [Challenges](#26-challenges)
27. [Practice](#27-practice)
28. [Progress Calculations](#28-progress-calculations)
29. [XP and Streak Rules](#29-xp-and-streak-rules)
30. [Flashcards and Spaced Repetition](#30-flashcards-and-spaced-repetition)
31. [Library and Settings](#31-library-and-settings)
32. [Theme Architecture](#32-theme-architecture)
33. [Ask JavaVerse](#33-ask-javaverse)
34. [AI Provider Policy](#34-ai-provider-policy)
35. [Local Mock Behavior](#35-local-mock-behavior)
36. [Gemini Behavior](#36-gemini-behavior)
37. [Anthropic Behavior](#37-anthropic-behavior)
38. [API-Key Ownership](#38-api-key-ownership)
39. [External-AI Consent](#39-external-ai-consent)
40. [AI Usage Metadata](#40-ai-usage-metadata)
41. [AI Limits and Concurrency](#41-ai-limits-and-concurrency)
42. [PII and Secret Redaction](#42-pii-and-secret-redaction)
43. [Sandbox Status](#43-sandbox-status)
44. [Accessibility](#44-accessibility)
45. [Backup and Restore](#45-backup-and-restore)
46. [Production-Readiness Limitations](#46-production-readiness-limitations)
47. [Testing Strategy](#47-testing-strategy)
48. [GitHub Actions](#48-github-actions)
49. [Open-Source Contribution Model](#49-open-source-contribution-model)
50. [Roadmap](#50-roadmap)

---

## 1. Executive Summary
- **Status:** Implemented & Tested
- **Summary:** JavaVerse is source-visible and preparing for open-source release, architected as a local-first learning platform for modern Java (Java 21 LTS). It is engineered to run locally on a developer workstation or self-hosted server using Docker Compose for infrastructure services (PostgreSQL 17, Redis 7, Mailpit, MinIO).
- **Architecture:** Monorepo managed with `pnpm` and Turborepo, featuring a Next.js 16.4 App Router frontend (`apps/web`), a BullMQ background worker (`apps/worker`), Prisma ORM schemas (`packages/db`), shared Zod validation (`packages/schemas`), security libraries (`packages/security`), structured observability (`packages/observability`), and an isolated AI provider gateway (`packages/ai`).
- **Core Product Model:** Standard learner accounts only. The legacy multi-tenant concepts of OWNER, MEMBER, bootstrap tokens, invitation onboarding, and administrative dashboards have been eradicated from live database schemas and active authentication paths.

## 2. Product Problem
- **Status:** Implemented
- **Summary:** Learning Java is notoriously challenging due to verbose syntax, complex object-oriented hierarchies, invisible memory layout dynamics (stack vs. heap), and intimidating compiler errors. Traditional learning tools force students to toggle between static textbooks and opaque IDEs without visual intuition.
- **JavaVerse Solution:** Bridges this gap by providing structured, multi-layer visual explanations, step-by-step memory diagrams, interactive quizzes, automated practice problem evaluation, and an honest, transparent AI assistant.

## 3. Intended Learner Experience
- **Status:** Implemented & Tested
- **Summary:**
  1. Instant local onboarding: public signup without invites or token gates.
  2. Multi-depth curriculum: toggle between Simple (conceptual), Standard (practical), and Deep (JVM internals/specifications) reading levels.
  3. Interactive practice: coding workspace with instant test feedback, hints, and AST visualization.
  4. Ask JavaVerse: Ask coding questions, view step-by-step algorithms, and inspect honest execution modes without fabricated claims.
  5. Distraction-free mastery: SM-2 flashcard spaced repetition and streak rewards that can be toggled off at any time.

## 4. Current Feature Set
- **Status:** Implemented & Tested
- **Summary:**
  - Public local signup, session management, password hashing (Argon2id), RFC 6238 TOTP MFA, and account deletion.
  - Learning dashboard with progress metrics, daily challenge, and study tracks.
  - 12 interactive curriculum lessons across 4 canonical tracks (`fundamentals`, `oop`, `collections`, `concurrency`).
  - 12 practice coding problems with starter code, hidden tests, and automated validation.
  - Ask JavaVerse AI workspace with 3 slot limits, streaming responses (SSE), BullMQ asynchronous analysis jobs, and Redis pub/sub.
  - SM-2 spaced repetition flashcards generated from quiz mistakes.
  - Resource library with bookmarking and personal study tags.
  - Privacy data export (GDPR-style JSON) and instant consent withdrawal propagation.
  - Accessible theme engine (light, dark, system) with zero-flash inline script.

## 5. Current Limitations
- **Status:** Implemented / Known Constraints
- **Summary:**
  - Capacity capped at 5 active accounts per installation.
  - Not approved for public production deployment; lacks distributed multi-tenant isolation.
  - Container-based code runner is REJECTED; Java execution relies on deterministic Local Mock runner (`SANDBOX_PROVIDER=mock`).
  - Study notes feature (`/dashboard/notes`) remains a non-interactive preview shell.
  - External AI requires operator-supplied API keys for Gemini or Anthropic.

## 6. Local-First Operating Model
- **Status:** Implemented & Tested
- **Summary:** Each JavaVerse installation is fully self-contained. Accounts, sessions, learning progress, and chats are stored locally in the installation's PostgreSQL database (`javaverse_postgres_data` volume). Zero telemetry, usage data, or database records are transmitted to the project maintainers.

## 7. Five-Account Installation Model
- **Status:** Implemented & Tested
- **Summary:** Enforced by `LOCAL_ACCOUNT_LIMIT = 5` in [`apps/web/src/lib/auth.ts`](file:///home/jagrit/Desktop/javaverse/apps/web/src/lib/auth.ts#L27).
- **Enforcement:** During registration, `apps/web/src/app/api/v1/auth/signup/route.ts` acquires a transaction-scoped advisory lock (`pg_advisory_xact_lock(74619284)`). It counts non-deleted rows in `users`. If `count >= 5`, registration is rejected with HTTP 409 `ACCOUNT_LIMIT_REACHED`.

## 8. Signup Flow
- **Status:** Implemented & Tested
- **Summary:**
  - Route: `POST /api/v1/auth/signup`.
  - Already-Authenticated Guard: If an active session exists, rejects with HTTP 400 `ALREADY_AUTHENTICATED` (`"An account is already signed in. Sign out before creating another account."`).
  - Form Semantics: Semantic HTML `<form>` with explicit `name="displayName"`, `name="email"`, `name="password"`, `name="confirmPassword"` and standard `autoComplete` attributes (`name`, `username`, `new-password`) ensuring browser password managers correctly map credentials.
  - Rate Limits: 10 attempts/15 min per IP; 5 attempts/15 min per canonical email.
  - Password Policy: 12–128 characters, internal spaces permitted for passphrases, leading/trailing whitespace rejected (`"Password cannot begin or end with whitespace."`), no mandatory composition rules. Length under 12 returns `"Use at least 12 characters."`. Confirmation mismatch returns `"Passwords do not match."`.
  - Breach Screening: Distinguishes local common password blocklist (HTTP 400 `PASSWORD_COMMON`) from HIBP breach lists (HTTP 400 `PASSWORD_BREACHED`) with learner-friendly copy.
  - Degraded Mode: Gracefully allows registration if upstream HIBP API times out or fails, logging non-blocking audit event `auth.breach_check_degraded`.
  - Decoupled Session Lifecycle: Marks local account verified (`emailVerifiedAt = new Date()`), commits learner account and Argon2id hash within a PostgreSQL transaction without creating an authenticated session or dispatching session cookies. Returns HTTP 201 with `{ success: true, message: "Account created successfully. Sign in to continue.", user: { id, email, displayName, role }, requiresSignIn: true }`.
  - Post-Signup Redirection: Browser redirects to `/auth/login?created=1`, displaying an accessible status confirmation alert (`role="status"`). The learner must enter the same email and password to sign in, create the authenticated session, and access `/dashboard`.

## 9. Login Flow
- **Status:** Implemented & Tested
- **Summary:**
  - Route: `POST /api/v1/auth/login`.
  - Form Semantics: Semantic HTML `<form>` with explicit `name="email"`, `name="password"` and standard `autoComplete` attributes (`username`, `current-password`).
  - Validates credentials against stored Argon2id hash with exact character matching (no silent trimming or casing modifications). Sign-in never contacts external breach services. Invalid credentials return generic HTTP 401 `INVALID_CREDENTIALS` (`"Invalid email or password"`).
  - If TOTP is configured, returns `{ mfaRequired: true }` and sets a short-lived MFA ticket cookie (`MFA_TICKET_TTL_SECONDS = 300`).
  - Handles `rememberMe` flag: expires at browser close if false; 7 days if true.

## 10. Logout Flow
- **Status:** Implemented & Tested
- **Summary:**
  - Route: `POST /api/v1/auth/logout` and `POST /api/v1/auth/logout-all`.
  - Revokes session record in PostgreSQL (`revoked_at = now()`) and clears cookie with `Max-Age=0`.
  - Browser cleans session-scoped external-AI consent (`sessionStorage.removeItem('external_ai_consent')`) while safely preserving the learner's theme preference in `localStorage`. Does not perform indiscriminate `localStorage.clear()`.

## 11. Password Hashing
- **Status:** Implemented & Tested
- **Summary:** Handled by `@javaverse/security` using `@node-rs/argon2`. Uses Argon2id variant with memory cost 65536 KiB, time cost 3 iterations, and parallelism 4 threads. Plaintext passwords are never stored. JavaVerse stores the one-way Argon2id password hash and verifies the exact submitted password against that hash during sign-in. Argon2id hashing is one-way and irreversible; plaintext passwords cannot be decrypted from stored hashes. Password hashes are never exposed through APIs, logs, exports, or UI.

## 12. Session Architecture
- **Status:** Implemented & Tested
- **Summary:**
  - Storage: Database table `sessions` keyed by SHA-256 digest of 32-byte cryptographic random token.
  - Cookies: `__Host-javaverse_session` in production (HTTPS), falling back to `javaverse_session` in local development (HTTP).
  - Public ID: Each session has a unique `public_id` UUID used in CSRF double-submit validation and client identifiers.
  - Sliding Window: 7 days absolute expiration; 24-hour idle timeout (`SESSION_IDLE_TIMEOUT_MS`). Touched every 5 minutes (`SESSION_TOUCH_THRESHOLD_MS`).
  - Re-authentication: Sensitive actions require reauth if `reauth_at` is older than 15 minutes (`REAUTH_TIMEOUT_MS`).

## 13. CSRF Architecture
- **Status:** Implemented & Tested
- **Summary:** Double-submit cookie with HMAC verification implemented in `packages/security/src/csrf.ts` and `apps/web/src/lib/csrf.ts`.
- **Pre-Auth Flow Binding:** `GET /api/v1/auth/csrf` supports explicit `flow` query parameter (`signup`, `login`, `forgot_password`, `reset_password`, `mfa`), which takes strict precedence over ambient session context. Tokens have format `${nonce}.${flow}.${expiresAt}.${signature}` with a 1-hour expiration.
- **Dedicated Flow Cookies:** Each flow sets an isolated cookie (`javaverse_csrf_<flow>` in dev, `__Host-javaverse_csrf_<flow>` in HTTPS production) to prevent cross-tab token collisions.
- **Replay Protection & Token Consumption:** Mutating routes validate both cookie and `x-csrf-token` header. Tokens are marked consumed upon successful account creation or session issuance to prevent replay attacks. Replay tracking utilizes shared Redis with a process-local in-memory fallback. The fallback supports the current single-process local runtime but does not provide cross-process or multi-instance replay tracking.
- **Safe Automatic Retry & Friendly Messaging:** Pre-auth pages (`/auth/signup`, `/auth/login`) synchronize token requests with React `useRef` to eliminate state races and automatically retry once on recognized `CSRF_ERROR` (HTTP 403) before presenting learner-friendly session expiry copy.
- **Cache & Origin Controls:** CSRF token endpoints enforce `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` and `Pragma: no-cache`. Mutating endpoints validate `Sec-Fetch-Site` and reject cross-site submissions. The client redirects `127.0.0.1` to the canonical `http://localhost:3000` origin.

## 14. Rate Limiting
- **Status:** Implemented & Tested
- **Summary:** Redis-backed sliding window rate limiter in `apps/web/src/lib/rateLimiter.ts`.
- **Fail-Closed Semantics:** On sensitive auth endpoints (signup, login, password reset), if Redis experiences an outage, requests are rejected with HTTP 503 to prevent brute-force attacks during infrastructure failures.

## 15. Test-Database Isolation
- **Status:** Implemented & Tested
- **Summary:** Guarded by `packages/db/src/safety.ts`.
- **Enforcement:** `assertSafeTestDatabase()` strictly blocks destructive operations on `javaverse`, `postgres`, `production`, allowing only explicit allowlist: `javaverse_test`, `javaverse_clean_verify`, `javaverse_backup_verify_test`.

## 16. PostgreSQL Responsibilities
- **Status:** Implemented & Tested
- **Summary:** PostgreSQL 17 serves as the primary system of record for all relational models. Uses extension `citext` for case-insensitive email lookup and `vector` for semantic knowledge retrieval. All user progress, rewards, flashcards, chats, and audit logs reside here.

## 17. Redis Responsibilities
- **Status:** Implemented & Tested
- **Summary:** Two distinct Redis 7 instances:
  1. `REDIS_QUEUE_URL` (Port 6379): BullMQ job queues (`analysis-queue`, `media-queue`) configured with `noeviction` policy and append-only file (AOF) persistence.
  2. `REDIS_CACHE_URL` (Port 6380): Volatile cache, sliding-window rate limit counters, Redis pub/sub for SSE user events, and AI concurrency slots (`allkeys-lru` eviction).

## 18. Docker Responsibilities
- **Status:** Implemented & Tested
- **Summary:** Defined in `infra/docker-compose.yml`. Orchestrates:
  - `javaverse-postgres`: PostgreSQL 17 with pgvector.
  - `javaverse-redis-queue`: Dedicated BullMQ queue instance.
  - `javaverse-redis-cache`: Dedicated cache and rate-limit instance.
  - `javaverse-mailpit`: Development SMTP server and webmail viewer (ports 1025 / 8025).
  - `javaverse-minio`: S3-compatible private object storage for file attachments (ports 9000 / 9001).

## 19. Web Application Architecture
- **Status:** Implemented & Tested
- **Summary:** Next.js 16.4 App Router (`apps/web`). Routes divided into `(public)` marketing/auth routes and `(dashboard)` authenticated learner workspace routes. Uses dynamic cryptographic nonces for Content Security Policy (CSP) and React 19 server/client components.

## 20. Worker Architecture
- **Status:** Implemented & Tested
- **Summary:** Standalone Node.js process (`apps/worker`) running BullMQ workers:
  - `analysisWorker`: Processes code analysis requests, invokes AI gateway, runs sandbox verification, and updates database records.
  - `mediaWorker`: Sanitizes image attachments using `sharp`, converts them to WebP, and promotes files from quarantine to clean S3 bucket.
  - `reaper`: Sweeps stalled jobs every 30 seconds (`sweepStalledJobs`).

## 21. Durable Job Lifecycle
- **Status:** Implemented & Tested
- **Summary:**
  1. Created: API inserts `DurableJob` with status `PENDING` and pushes to BullMQ.
  2. Running: Worker acquires job, updates status to `RUNNING`, sets lease expiration (`leaseExpiresAt = now + 60s`), and renews heartbeat every 15s.
  3. Stages: Job progress steps through `reading` (15%), `understanding` (30%), `choosing_technique` (50%), `writing_solution` (70%), `testing_sandbox` (85%), `building_visuals` (95%).
  4. Final: On success, status becomes `COMPLETED` and assistant message becomes `SENT`. On unrecoverable error, status becomes `FAILED` after 3 attempts.

## 22. SSE Lifecycle
- **Status:** Implemented & Tested
- **Summary:**
  - Route: `GET /api/v1/chats/[id]/events` and `GET /api/v1/events`.
  - Delivery: Subscribes to Redis pub/sub channel `events:user:${userId}`. On connect, replays missed events from `user_stream_events` using signed cursor (`Last-Event-ID`).
  - Cleanup: On client disconnect, unsubscribes immediately to prevent memory leaks.

## 23. Curriculum
- **Status:** Implemented & Tested
- **Summary:** 4 canonical study tracks:
  1. `fundamentals`: Data types, control flow, loops, operators.
  2. `oop`: Classes, encapsulation, inheritance, polymorphism, interfaces.
  3. `collections`: Lists, Sets, Maps, iteration, Big-O complexity.
  4. `concurrency`: Threads, synchronization, executor services, virtual threads.

## 24. Lessons
- **Status:** Implemented & Tested
- **Summary:** 12 comprehensive lessons seeded in `curriculum_lessons`. Each lesson features:
  - Real-world motivation hook.
  - 3 content depth tiers: Simple, Standard, Deep.
  - Interactive visualization spec (arrays, pointer shifts, object heap diagrams).
  - Code starter and reference solution.
  - Common pitfalls section.

## 25. Quizzes
- **Status:** Implemented & Tested
- **Summary:** Multi-question interactive assessments embedded in each curriculum lesson. Validated on server via `POST /api/v1/lessons/[slug]/quiz`. Incorrect answers automatically generate spaced repetition flashcards for targeted remediation.

## 26. Challenges
- **Status:** Implemented & Tested
- **Summary:** End-of-lesson coding exercises tested via `POST /api/v1/lessons/[slug]/challenge`. Evaluates learner solution code against test harnesses and records completion score.

## 27. Practice
- **Status:** Implemented & Tested
- **Summary:** 12 independent practice problems seeded in `practice_problems`. Learners can edit code in the online editor, execute tests via `POST /api/v1/practice/[slug]/run`, and submit solutions for permanent mastery tracking.

## 28. Progress Calculations
- **Status:** Implemented & Tested
- **Summary:** Computed by `apps/web/src/lib/progress.ts`. Aggregates completed lessons and practice problems against total published curriculum items to produce accurate category-by-category percentages. Does not fabricate progress.

## 29. XP and Streak Rules
- **Status:** Implemented & Tested
- **Summary:**
  - XP: +50 XP for completed lesson, +25 XP for passing quiz, +50 XP for solving practice problem.
  - Streaks: Incremented when activity occurs on consecutive calendar days (UTC). Reset if a calendar day is missed.
  - Gamification Toggle: Learners can disable XP, badges, and streaks entirely in account settings.

## 30. Flashcards and Spaced Repetition
- **Status:** Implemented & Tested
- **Summary:** Uses the SuperMemo SM-2 algorithm (`intervalDays`, `easeFactor`, `reviewCount`). Stored in `user_flashcards`. Automatically spawned when learners fail quiz questions; reviewed via `POST /api/v1/flashcards/[id]/review`.

## 31. Library and Settings
- **Status:** Implemented & Tested
- **Summary:**
  - Library: Bookmarks and notes stored in `library_items` table.
  - Settings: Profile display name, preferred theme, default Java version (21), gamification toggle, and data improvement consent toggle (`consentImprove`).

## 32. Theme Architecture
- **Status:** Implemented & Tested
- **Summary:** Supports `light`, `dark`, and `system` modes. Employs CSS custom properties defined in `apps/web/src/styles/tokens.css`. Injected inline script (`ThemeScript`) reads local storage and system `prefers-color-scheme` to prevent theme flashing on initial render.

## 33. Ask JavaVerse
- **Status:** Implemented & Tested
- **Summary:** Chat interface limited to 3 concurrent conversation slots per learner (`chats.slot` between 1 and 3). Supports code explanations, algorithm walkthroughs, error debugging, and step-by-step visual generation.

## 34. AI Provider Policy
- **Status:** Implemented & Tested
- **Summary:** Strict provider-neutral gateway (`packages/ai`). Server configuration exclusively dictates available providers (`AI_PROVIDER_PRIMARY`). Hosted external user keys (USER_BYOK) are outside v1. Safe default is always Local Mock.

## 35. Local Mock Behavior
- **Status:** Implemented & Tested
- **Summary:** `MockProvider` generates deterministic, schema-compliant Java analyses for binary search, stack evaluation, and general coding questions. Returns zero token usage (`inputTokens: 0, outputTokens: 0`), and renders label: `Local Mock · No external token usage`. Bypasses all rate limits.

## 36. Gemini Behavior
- **Status:** Implemented & Tested
- **Summary:** `GeminiProvider` connects to Google Gemini API via `x-goog-api-key` header (never in URL). Model pinned to `gemini-2.5-flash`. Parses structured JSON and reports exact candidate and prompt token counts from `usageMetadata`.

## 37. Anthropic Behavior
- **Status:** Implemented & Tested
- **Summary:** `AnthropicProvider` connects to Anthropic API via `x-api-key` header. Model pinned to `claude-3-5-sonnet-20241022`. Extracts structured JSON analysis and exact token metrics from response payload.

## 38. API-Key Ownership
- **Status:** Implemented & Tested
- **Summary:** Operator-configured only via server environment variables (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`). Client browsers never receive, store, or transmit provider API keys.

## 39. External-AI Consent
- **Status:** Implemented & Tested
- **Summary:** When external AI is enabled, the UI requires explicit per-session consent before dispatching questions to commercial frontier models. Stored in browser `sessionStorage` and cleared upon logout.

## 40. AI Usage Metadata
- **Status:** Implemented & Tested
- **Summary:** Every analysis stores `modelId`, `promptVersion`, `verificationStatus`, and usage tokens in `analyses` and `messages`. The UI displays exact provider metadata and never fabricates token metrics when running local mocks.

## 41. AI Limits and Concurrency
- **Status:** Implemented & Tested
- **Summary:**
  - Daily limit: 50 requests/day per user via Redis key `ai:usage:daily:${userId}:${date}`.
  - Concurrency: 2 global concurrent external requests via `ai:concurrency:global`.
  - Duplicate-click protection: 3-second NX lock via `ai:submit:lock:${userId}`.

## 42. PII and Secret Redaction
- **Status:** Implemented & Tested
- **Summary:** `packages/security/src/piiScrubber.ts` sanitizes prompt payloads before sending to external AI or logging. Redacts email addresses, phone numbers, SSNs, credit card numbers, and API tokens. Honest UI copy warns that automated redaction cannot guarantee 100% detection.

## 43. Sandbox Status
- **Status:** REJECTED (Mock Sandbox Active)
- **Summary:** Container runner execution (`container_runner`) remains **REJECTED** pending dedicated security review of gVisor isolation and rootless containment. `SANDBOX_PROVIDER=mock` is the active, approved execution provider.

## 44. Accessibility
- **Status:** Implemented & Tested
- **Summary:** Audited against WCAG 2.2 AA standards via `@axe-core/playwright`. All interactive elements have visible keyboard focus rings, skip-to-content links, screen-reader text (`.sr-only`), `aria-busy` state during job processing, and accessible color contrast.

## 45. Backup and Restore
- **Status:** Implemented & Tested
- **Summary:** Verified via `scripts/backup-db.sh` and `scripts/restore-db.sh`. Creates compressed `.sql.gz` snapshots with SHA-256 checksums and `0600` permissions. Tested end-to-end with automated drill (`pnpm test:backup-restore`), verifying 100% record-count fidelity.

## 46. Production-Readiness Limitations
- **Status:** Known Architecture Boundary
- **Summary:** JavaVerse is source-visible and preparing for open-source release, designed for individual and small group learning (up to 5 accounts per local installation). It is **not approved for public multi-tenant SaaS hosting**. It lacks tenant billing, enterprise RBAC, and containerized untrusted code isolation.

## 47. Testing Strategy
- **Status:** Implemented & Tested
- **Summary:** Strict multi-layer testing:
  - 25 unit test suites across core packages.
  - 28 integration test suites for web application workflows (including `repository-alignment.test.ts`).
  - 8 Playwright E2E suites covering 27 browser scenarios on Chromium and Firefox.
  - Automated clean DB, backup/restore, and static hash verification regression drills.

## 48. GitHub Actions
- **Status:** Implemented & Aligned
- **Summary:** CI workflow `.github/workflows/ci.yml` validates formatting, linting, typechecking, unit/integration tests against `javaverse_test`, static-hash verification, clean DB verification, backup-restore drill, MinIO integration, Playwright E2E browser tests, Lighthouse audit, Gitleaks, and OSV-Scanner.

## 49. Open-Source Contribution Model
- **Status:** Source-Visible Preparing for Open-Source Release
- **Summary:** JavaVerse is source-visible and preparing for open-source release. The root `LICENSE` file decision remains pending deliberate project maintainer selection (P0 blocker for open-source release; non-blocking for internal technical merge).

## 50. Roadmap
- **Status:** Proposed
- **Summary:**
  - Near-Term: Project maintainer selects authoritative root `LICENSE`; add community governance files (`SECURITY.md`, `CONTRIBUTING.md`).
  - Mid-Term: Interactive study notes editor, dark mode visual polish, enhanced Java 21 visual debugging.
  - Long-Term: Security feasibility spike for rootless gVisor container execution; offline local LLM embeddings.


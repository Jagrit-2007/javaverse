# JavaVerse Self-Hosting & Local Operations Guide

> [!WARNING]
> **Non-Production Self-Hosting Notice.**
> JavaVerse is source-visible and preparing for open-source release. It is architected for local deployment and single-installation self-hosting. It is **not approved for public multi-tenant production hosting**.
>
> All accounts have identical learner capabilities (up to 5 active accounts per installation). The execution sandbox provider defaults strictly to Local Mock (`SANDBOX_PROVIDER=mock`); container-based execution (`container_runner`) remains **REJECTED** pending dedicated security containment verification.

---

## 1. Local-First Architecture Overview

```
                      Learner Browser (Localhost)
                                  │
                                  ▼
                 ┌──────────────────────────────────┐
                 │   JavaVerse Web App (Next.js)    │
                 │  - Public local signup (max 5)   │
                 │  - Identical learner permissions │
                 │  - Argon2id password hashing     │
                 │  - Local Mock AI default         │
                 │  - Strict CSP & CSRF protection  │
                 └───────────┬──────────────┬───────┘
                             │              │
               ┌─────────────┘              └─────────────┐
               ▼                                          ▼
 ┌───────────────────────────┐              ┌───────────────────────────┐
 │     PostgreSQL 17         │              │      Redis 7 Instances    │
 │  - citext, pgvector       │              │  - Queue (port 6379)      │
 │  - Relational persistence │              │  - Cache (port 6380)      │
 └───────────────────────────┘              └─────────────┬─────────────┘
                                                          │
                                            ┌─────────────┴─────────────┐
                                            │   JavaVerse Worker (Node) │
                                            │  - Durable Async Jobs     │
                                            │  - Execution: Local Mock  │
                                            └───────────────────────────┘
```

### Supporting Services (Local Docker Compose)

- **PostgreSQL 17 (`pgvector/pgvector:pg17`)**: Primary system of record for accounts, progress, sessions, and curricula.
- **Redis Queue (`redis:7-alpine`, port 6379)**: BullMQ durable job queue for asynchronous processing.
- **Redis Cache (`redis:7-alpine`, port 6380)**: Ephemeral rate limiting, token limits, and AI session caches.
- **Mailpit (`axllent/mailpit`, ports 1025 / 8025)**: Local SMTP capture server for testing transactional verification and password-reset emails.
- **MinIO (`minio/minio`, ports 9000 / 9001)**: S3-compatible private object storage used for quarantined upload processing.

---

## 2. Safe Startup and Shutdown

### 2.1 Starting JavaVerse

Start the complete local environment using the managed startup helper:

```bash
./start-dev.sh
```

This script:

1. Validates that Docker and pnpm are installed.
2. Starts background Docker Compose services (`infra/docker-compose.yml`) in detached mode.
3. Leaves all database volumes intact.
4. Launches the Next.js web application (port 3000) and the background worker concurrently.

### 2.2 Safe Shutdown

To stop the application servers, press `Ctrl+C` in the terminal running `./start-dev.sh`.

To stop background infrastructure containers safely without data loss:

```bash
docker compose -f infra/docker-compose.yml down
```

> [!CAUTION]
> **Data Destruction Warning:**
> **NEVER** run `docker compose down -v` or `prisma migrate reset` on your local installation.
> The `-v` flag deletes Docker volumes (`postgres_data`), permanently erasing all created accounts, study progress, and settings.

---

## 3. Database Migration Deployment

To deploy forward-only database migrations against the configured PostgreSQL service:

```bash
pnpm --filter @javaverse/db migrate:deploy
```

To seed deterministic curriculum and limits into a fresh database:

```bash
pnpm --filter @javaverse/db seed
```

> [!NOTE]
> Database safety guardrails (`packages/db/src/safety.ts`) strictly prohibit destructive commands (`drop`, `truncate`, `migrate reset`) against the development database `javaverse`.

---

## 4. Health and Readiness Checks

JavaVerse provides unauthenticated health and readiness probe endpoints:

- **Liveness Probe**: `GET /api/v1/health`
  Returns HTTP 200 `{"status":"ok"}` if the web process is running.
- **Readiness Probe**: `GET /api/v1/readiness`
  Verifies connectivity to PostgreSQL and Redis. Returns HTTP 200 when ready, HTTP 503 if backing services are unreachable.

---

## 5. Database Backup & Disaster Recovery

### 5.1 Creating a Verified Backup

Backups are produced using PostgreSQL `pg_dump`, compressed via `gzip`, and verified with SHA-256 integrity checksums:

```bash
bash scripts/backup-db.sh ./backups
```

Output files:

- `backups/javaverse_backup_YYYYMMDD_HHMMSS.sql.gz`
- `backups/javaverse_backup_YYYYMMDD_HHMMSS.sql.gz.sha256`

### 5.2 Restoring from Backup

To restore a verified snapshot:

```bash
bash scripts/restore-db.sh ./backups/javaverse_backup_YYYYMMDD_HHMMSS.sql.gz javaverse
```

The restore script:

1. Verifies SHA-256 checksum integrity against `.sha256`.
2. Validates that required PostgreSQL extensions (`citext`, `vector`) exist.
3. Restores schema, constraints, indices, and learner data.

### 5.3 Automated Disaster Recovery Drill

Verify backup and restore end-to-end on an isolated disposable test database:

```bash
pnpm test:backup-restore
```

This drill backs up live tables, creates a temporary database (`javaverse_backup_verify_test`), restores the snapshot, and executes deep assertion checks to verify 100% data fidelity.

---

## 6. Secret & Credential Configuration

JavaVerse requires 32-byte (or 64-character hex) random secrets in `.env.local`:

- `SESSION_SECRET`: Signs and encrypts opaque session cookies.
- `CURSOR_SIGNING_SECRET`: Cryptographically signs pagination cursors.
- `SANDBOX_SHARED_SECRET`: Authenticates worker-to-sandbox calls.

To generate a valid `.env.local` with fresh cryptographic secrets:

```bash
pnpm generate-env
```

---

## 7. AI Gateway Configuration

JavaVerse operates in **Local Mock AI mode by default**:

- `AI_PROVIDER_PRIMARY=mock`
- Zero external network requests to AI APIs.
- UI displays: `AI mode: Local Mock` and `Local Mock · No external token usage`.

### Optional External Providers

External AI providers (Google Gemini, Anthropic Claude) can be enabled optionally:

```env
EXTERNAL_AI_ENABLED=true
AI_PROVIDER_PRIMARY=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Or for Anthropic:

```env
EXTERNAL_AI_ENABLED=true
AI_PROVIDER_PRIMARY=anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### Safety Controls

1. **Explicit Learner Consent**: When external AI is active, learners must provide explicit per-session consent before queries are sent to external providers.
2. **Daily Request Limits**: Enforces a default cap of 50 external AI queries per user per day via Redis sliding-window tracking.
3. **Concurrency Ceilings**: Limits global concurrent AI requests to 2 to protect against rate limits and runaway usage.
4. **Secret Redaction**: API keys are server-side only; they are never sent to the browser or stored in client storage.

---

## 8. Sandbox Policy

- **Current Approved Provider**: `SANDBOX_PROVIDER=mock` (Local Mock).
- **Rejected Provider**: `container_runner` is an unverified experimental candidate and remains **REJECTED** pending dedicated security containment review.
- Missing or invalid sandbox provider configuration fails closed immediately.
- Client inputs cannot select the execution provider.
- The learner UI does not display unsupported claims such as "Verified in Sandbox".

---

## 9. Security & Access Invariants

1. **Single Learner Account Model**: Exactly one account type exists. Every account has identical learner capabilities.
2. **Local Capacity Limit**: A hard limit of 5 accounts per local installation is enforced atomically via PostgreSQL transaction advisory lock (`74619284`).
3. **Authenticated User-Resource Isolation**: All chats, progress, library items, and submissions are strictly isolated to the authenticated user ID.
4. **Argon2id Password Hashing & Account Truth**: Plaintext passwords are never stored and cannot be recovered. JavaVerse stores the one-way Argon2id password hash and verifies the exact submitted password against that hash during sign-in. Password hashes are never exposed through APIs, logs, exports, or UI. PostgreSQL is the sole source of truth for account existence; browser password-manager entries are never the source of truth for account existence. If an account's original password is unknown, password reset via Mailpit is the supported recovery path.
5. **Decoupled Account Creation & Sign-in Lifecycle**: Account creation stores the learner account and one-way Argon2id password hash, then redirects to Sign in (`/auth/login?created=1`). JavaVerse does not automatically create an authenticated session after signup. The learner must sign in using the same email and password before accessing the dashboard. Flow: `Signup -> committed account -> Sign in -> authenticated session -> dashboard`. Manual development and smoke testing target the persistent local development database (`javaverse`), whereas automated tests target isolated verification databases (`javaverse_test`, `javaverse_clean_verify`, `javaverse_backup_verify_test`).
6. **Session Revocation**: Logout atomically revokes server-side session records in PostgreSQL and clears cookies.
7. **Content Security Policy (CSP)**: Route-segregated CSP with dynamic per-request nonces for dashboard routes and verified static script hashes for prerendered routes.
8. **CSRF Protection**: Origin and Sec-Fetch-Site validation on all mutative routes. Pre-authentication flows (`signup`, `login`, `forgot_password`, `reset_password`, `mfa`) use flow-bound HMAC tokens with dedicated flow cookies (`javaverse_csrf_<flow>` / `__Host-javaverse_csrf_<flow>`), single-use replay protection (shared Redis tracking with single-process in-memory fallback; the fallback supports the current single-process local runtime but does not provide cross-process or multi-instance replay tracking), and safe one-time automatic retry with learner-friendly session expiry messaging. Requests to `127.0.0.1` redirect to the canonical `http://localhost:3000` origin.
9. **Password Manager Integration & Breach Screening**: All authentication forms provide semantic `<form>` tags with explicit `name` (`displayName`, `email`, `password`, `confirmPassword`) and standard `autoComplete` attributes (`username`, `new-password`, `current-password`). Passwords require at least 12 characters (up to 128) and permit internal spaces for passphrases; leading/trailing whitespace is rejected with `"Password cannot begin or end with whitespace."`. Common predictable passwords return HTTP 400 `PASSWORD_COMMON`, while confirmed HIBP breaches return HTTP 400 `PASSWORD_BREACHED`. If upstream breach services are unavailable, JavaVerse gracefully degrades to local checks and records an audit event (`auth.breach_check_degraded`). Sign-in never contacts external breach services.

---

## 10. Manual Smoke-Test Instructions

When manually smoke-testing a local installation:

1. **Sign-up & Authentication Lifecycle**: Navigate to `http://localhost:3000/auth/signup`. Use any valid unused email and any learner-selected password that satisfies the displayed security policy (at least 12 characters, without leading or trailing spaces; any named email or password in documentation or examples is an optional demonstration example only, not a required credential). JavaVerse does not require predefined domains (`@javaverse.local`, `@example.local`, etc.) or fixed passwords.
   Upon submission, the account and Argon2id hash are committed, and the browser redirects to `http://localhost:3000/auth/login?created=1` with an accessible status notice ('Account created successfully. Sign in with your email and password.'). JavaVerse does not automatically create an authenticated session after signup. Enter the exact same email and password on the Sign in page and submit to authenticate and land on the dashboard. Flow: `Signup -> committed account -> Sign in -> authenticated session -> dashboard`.
2. **Password Manager Compatibility**: Verify that browser password managers prompt to save the credentials using the exact learner email and password created, rather than saving terminal text or extraneous inputs.
3. **Password Reset via Mailpit**: To test or recover credentials locally, navigate to `http://localhost:3000/auth/forgot-password`, submit the account email, open Mailpit at `http://localhost:8025`, and follow the reset link to choose a new password.
4. **Capacity Limit**: Manual smoke testing should create only one account unless the project maintainer deliberately chooses otherwise. Do not require manually creating five permanent development accounts in the local development database; installation capacity (5 accounts) is fully covered by isolated automated tests.
5. **Verify Baseline Metrics**: The dashboard correctly renders 0% progress, 0 XP, and a 0-day streak for a newly registered learner.
6. **Theme & Settings**: Theme toggling between Dark and Light mode persists across browser sessions.
7. **Ask JavaVerse**: Test the Ask JavaVerse panel in default Local Mock mode; verify that no external token usage occurs and responses are immediate.

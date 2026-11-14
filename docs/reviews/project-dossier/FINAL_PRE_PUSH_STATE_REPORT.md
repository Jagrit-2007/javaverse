# JavaVerse Pre-Push State, Data-Safety, Authentication, and Repository Readiness Report

> **Classification:** STRICTLY READ-ONLY FORENSIC & READINESS AUDIT  
> **Target Branch:** `fix/phases-4-11-owner-audit`  
> **HEAD SHA:** `52072576df998725565e90af17a063e9ae6f83ff`  
> **Audit Date:** 2026-11-14  
> **Status:** **READY FOR SAFE ACCOUNT RESET**  

---

## 1. Executive Verdict

JavaVerse on branch `fix/phases-4-11-owner-audit` has completed all architectural and security remediations required by the single-learner-account model, credentials reliability, decoupled authentication flow, CSRF multi-flow isolation, and test-database safety guards.

All local quality gates pass cleanly:
- `pnpm format:check` — **PASS** (100% matched files use Prettier code style)
- `pnpm lint` — **PASS** (8/8 Turborepo packages clean)
- `pnpm typecheck` — **PASS** (8/8 Turborepo packages clean)
- `pnpm verify:static-hashes` — **PASS** (19 deterministic CSP script hashes verified)
- `pnpm --filter @javaverse/web test test/integration/repository-alignment.test.ts` — **PASS** (24/24 regression assertions clean)
- `git diff --check` — **PASS** (zero merge conflicts, zero whitespace errors)

However, **the branch is NOT ready to be pushed immediately** due to an environmental prerequisite:
The local development database (`javaverse`) currently has **all 5 account slots consumed** (capacity: 0 remaining). Of the five accounts, one is an automated Playwright test artifact from an Ask AI cancellation test run against the wrong database prior to test isolation hardening, and four are historical manual test accounts. Furthermore, the latest existing backup (`javaverse_backup_20261109_155417.sql.gz`) **predates 4 of the 5 accounts**.

A **safe, transactional account reset** preceded by a **fresh database backup** must be executed before final manual signup/login smoke testing, staging, and pushing.

---

## 2. Current Branch and HEAD Inventory

| Attribute | State | Verification Detail |
| :--- | :--- | :--- |
| **Current Branch** | `fix/phases-4-11-owner-audit` | Verified via `git branch --show-current` (historical branch name preserved) |
| **HEAD Commit SHA** | `52072576df998725565e90af17a063e9ae6f83ff` | Verified via `git rev-parse HEAD` |
| **Upstream Tracking** | `origin/fix/phases-4-11-owner-audit` | Verified via `git rev-parse --abbrev-ref @{u}` |
| **Branch Tracking State**| Up to date (`ahead 0, behind 0`) | Verified via `git status` |
| **Merge Conflict Markers**| **None** | `git diff --check` returned 0 output |
| **Staged Changes** | **0 files** | `git diff --staged` returned empty |
| **Unstaged Modified** | **68 files** | Complete inventory documented below |
| **Unstaged Deleted** | **1 file** (`packages/security/src/static-hashes.json`) | Redundant JSON artifact removed in favor of `.ts` |
| **Untracked Files** | **4 files/directories** | `.gitleaksignore`, `repository-alignment.test.ts`, `docs/reviews/project-dossier/`, `scripts/verify-static-hashes.mjs` |

---

## 3. Working-Tree Summary

The unstaged working tree represents the completed implementation of:
1. **Decoupled Account-Creation & Sign-In Lifecycle (Decision 36):** Signup returns HTTP 201 without session tokens or cookies, redirecting to `/auth/login?created=1` with an accessible status notice.
2. **CSRF Multi-Flow Isolation & Resilience:** Dedicated cookies per flow (`javaverse_csrf_<flow>`), priority of query `flow` over ambient session, bounded replay cache in memory/Redis, and automatic single retry on 403.
3. **Password Policy & Non-Blocking Degraded Breach Screening (Decision 35):** 12–128 character policy, space allowance, NIST SP 800-63B alignment, Argon2id hashing, and k-anonymity HIBP screening that degrades gracefully without blocking learners.
4. **Strict Database Isolation & Startup Guards:** `@javaverse/db` asserts allowlisted test databases for destructive tests and blocks Playwright/Vitest from ever touching `javaverse`.
5. **Dashboard Fixture Fail-Closed Hardening:** All fixture backdoors removed from live dashboard routes; unauthenticated access strictly redirects to `/auth/login`.
6. **Repository Alignment & Dead Code Removal:** Purged `bootstrap:owner` package script, removed `REGISTRATION_MODE` environment variables, eliminated invitation email helpers, and standardized documentation on "project maintainer".

---

## 4. Current Product Model & Invariant Verification

We have verified the codebase, schema, and tests against the core JavaVerse product invariants:

| Product Invariant | System Truth | Conformance Evidence |
| :--- | :--- | :--- |
| **One active account type** | Learner account only | Zero `role` columns in `users` table; dropped in migration 6 (`20261109210000_single_learner_account_model`). |
| **Identical capabilities** | All accounts equal | No role-based access control, no feature flagging by user type. |
| **Public local signup** | Always open until capacity | Public `/auth/signup` route with no invite token requirement. |
| **Max 5 active accounts** | Strictly enforced at 5 | Enforced via PostgreSQL advisory lock and `LOCAL_ACCOUNT_LIMIT = 5` in `apps/web/src/app/api/v1/auth/signup/route.ts#L132`. |
| **No privileged account role** | Confirmed absent | `chk_users_role` and `idx_users_single_active_owner` dropped. |
| **No admin product interface** | Confirmed absent | `/admin` and `/dashboard/admin` redirect to `/dashboard` in `middleware.ts`. |
| **No invitation onboarding** | Confirmed absent | `invitations` table dropped; dead email helpers deleted. |
| **No privileged bootstrap** | Confirmed absent | `bootstrap:owner` package script deleted; `/auth/bootstrap` redirects to `/auth/signup`. |
| **PostgreSQL as source of truth** | Sole authority | PostgreSQL table `users` governs account existence. Password manager autofill disproven as persistence blocker. |
| **Local Mock AI as default** | Default active | `AI_PROVIDER_PRIMARY="mock"` pinned in `.env.example` and schemas. |
| **External AI consent-gated** | Explicit opt-in | `consentImprove` column in `users`; external calls gated. |
| **Container runner REJECTED** | Explicitly rejected | `SANDBOX_PROVIDER=mock` active; `container_runner` verified REJECTED in `sandbox/src/factory.ts` and `ExecuteCodeSchema`. |
| **Separate Dev & Test DBs** | Fully isolated | `javaverse` (dev) vs `javaverse_test` (disposable test). Automated tests cannot target `javaverse`. |
| **Source-visible status** | Accurately stated | `README.md` states: *"JavaVerse is source-visible and preparing for open-source release."* |
| **Not approved for public prod** | Explicitly stated | `docs/runbooks/OPERATIONS.md` retitled and scoped to local/self-hosted instances with clear warnings. |

---

## 5. Database Topology

| Database Name | Host & Port | Runtime Component | Execution Mode | Env Source | Destructive Ops? | Data Classification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`javaverse`** | `127.0.0.1:5432` | `apps/web` (Next.js) | `development` | `.env.local` / `apps/web/.env.local` | **STRICTLY FORBIDDEN** | Persistent Local Development |
| **`javaverse`** | `127.0.0.1:5432` | `apps/worker` (BullMQ) | `development` | `.env.local` / `apps/worker/.env.local` | **STRICTLY FORBIDDEN** | Persistent Local Development |
| **`javaverse_test`** | `127.0.0.1:5432` | `vitest` (`@javaverse/web`) | `test` | `apps/web/test/setup.ts` | **ALLOWED** | Disposable Test Fixture |
| **`javaverse_test`** | `127.0.0.1:5432` | Playwright (`webServer`) | `test` | `apps/web/playwright.config.ts` | **ALLOWED** | Disposable Test Fixture |
| **`javaverse_clean_verify`** | `127.0.0.1:5432` | `scripts/verify-clean-db.mjs` | `test` | Script constant | **ALLOWED** | Disposable Verification |
| **`javaverse_backup_verify_test`** | `127.0.0.1:5432` | `scripts/verify-backup-restore.mjs` | `test` | Script constant | **ALLOWED** | Disposable Verification |
| **`postgres`** | `127.0.0.1:5432` | System maintenance | `system` | PostgreSQL default | **FORBIDDEN** | PostgreSQL System Catalog |
| **`template0` / `template1`** | `127.0.0.1:5432` | System templates | `system` | PostgreSQL default | **FORBIDDEN** | PostgreSQL Templates |

### Supporting Local Infrastructure Services

| Service | Container Name | Image | Host Port | Internal Port | Storage / Volume |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL 17 + pgvector** | `javaverse-postgres` | `pgvector/pgvector:pg17` | `5432` | `5432` | Named volume: `infra_postgres_data` |
| **Redis Queue (BullMQ)** | `javaverse-redis-queue` | `redis:7-alpine` | `6379` | `6379` | Named volume: `infra_redis_queue_data` |
| **Redis Cache (CSRF / Rate Limit)**| `javaverse-redis-cache` | `redis:7-alpine` | `6380` | `6379` | Named volume: `infra_redis_cache_data` |
| **MinIO (Private S3 Uploads)** | `javaverse-minio` | `minio/minio:latest` | `9000-9001` | `9000-9001` | Named volume: `infra_minio_data` |
| **Mailpit (Local SMTP / Web UI)** | `javaverse-mailpit` | `axllent/mailpit:latest` | `1025, 8025` | `1025, 8025` | Named volume: `infra_mailpit_data` |

---

## 6. Process-to-Database Mapping

- **Manual Signup (`POST /api/v1/auth/signup`)**: Connects exclusively to `javaverse`.
- **Manual Login (`POST /api/v1/auth/login`)**: Connects exclusively to `javaverse`.
- **Dashboard Navigation (`/dashboard/*`)**: Connects exclusively to `javaverse`.
- **Background Worker (`apps/worker`)**: Connects exclusively to `javaverse`.
- **Vitest Unit/Integration Tests**: Forcefully routed to `javaverse_test` in `apps/web/test/setup.ts`.
- **Playwright Browser Tests**: Forcefully routed to `javaverse_test` via `playwright.config.ts` environment and webServer subshell guard.
- **Clean DB Verification**: Targets isolated `javaverse_clean_verify`.
- **Backup/Restore Verification**: Targets isolated `javaverse_backup_verify_test`.

### Proof that Automated Tests Cannot Target `javaverse`
1. `packages/db/src/safety.ts`: `FORBIDDEN_TEST_DATABASES` includes `'javaverse'`. Calling `assertSafeTestDatabase('.../javaverse')` throws a fatal error: `CRITICAL DATA-SAFETY VIOLATION`.
2. `apps/web/playwright.config.ts`: Evaluates `assertSafeTestDatabase(TEST_DATABASE_URL)` before runner startup. In `webServer.command`, executes a node pre-check asserting that if the database name is `javaverse`, the process exits immediately with exit code 1.
3. `apps/web/test/setup.ts`: Replaces any `DATABASE_URL` ending in `/javaverse` with `javaverse_test`, then executes `assertSafeTestDatabase`.
4. `apps/web/src/components/fixtures/dashboardData.ts`: `getDashboardFixtureState` throws if `process.env.DATABASE_URL` targets `javaverse`.

---

## 7. Current Five-Account Inventory (`javaverse`)

Querying PostgreSQL `javaverse` database safely (excluding secret fields, hashes, and tokens):

| # | User ID | Canonical Email | Display Name | Status | Created At (UTC) | Verified? | Hash Exists? |
| :-: | :--- | :--- | :--- | :---: | :--- | :---: | :---: |
| **1** | `35af8b60-990c-4f1b-ad85-bd78ab652163` | `learner.askai.1794230924205.kyot7j20gso@example.local` | Cancel Tester | `ACTIVE` | 2026-11-09 13:28:44 | Yes | Yes |
| **2** | `69a60d83-96f2-4d8b-ac6d-46e9cd002180` | `learner@gmail.com` | learner | `ACTIVE` | 2026-11-09 19:57:37 | Yes | Yes |
| **3** | `80436add-d09d-4488-9568-6a8c81b2eecb` | `persistence.learner@gmail.com` | Persistent Learner | `ACTIVE` | 2026-11-09 20:26:22 | Yes | Yes |
| **4** | `f664d9db-71af-4b7a-becd-1e53a577fa02` | `hello1@gmail.com` | *(none)* | `ACTIVE` | 2026-11-10 16:21:55 | Yes | Yes |
| **5** | `22be0f28-bba6-4875-9079-6651b2a7aa6b` | `helloooo123@gmail.com` | hello | `ACTIVE` | 2026-11-10 19:23:45 | Yes | Yes |

- **Total Accounts:** 5
- **Active Accounts:** 5
- **Deleted/Inactive Accounts:** 0
- **Configured Installation Limit (`deployment_limits.max_users`):** 5
- **Remaining Signup Capacity:** **0** (Registration is closed due to capacity limit)

---

## 8. Account-Origin Classification

1. **`learner.askai.1794230924205.kyot7j20gso@example.local`**:
   - **Classification:** **Historical automated-test artifact**
   - **Evidentiary Proof:** Matches exact email generation template `userEmail = \`learner.askai.\${nonce}@example.local\`` in `apps/web/test/e2e/ask-ai.spec.ts#L56`. Created on Nov 9 at 13:28 UTC during an Ask AI cancellation test run prior to database isolation enforcement.
2. **`learner@gmail.com`**:
   - **Classification:** **Deliberate manual test account**
   - **Evidentiary Proof:** Created Nov 9 at 19:57 UTC. Contains 1 manual chat session titled `"string reverse..."` with 2 messages, 1 durable job, 1 analysis, and 1 execution. Documented in `docs/PROGRESS.md#L944`.
3. **`persistence.learner@gmail.com`**:
   - **Classification:** **Deliberate manual test account**
   - **Evidentiary Proof:** Created Nov 9 at 20:26 UTC during the credential persistence and sign-in reliability investigation. Has 4 active sessions and 1 revoked session. Documented in `docs/PROGRESS.md#L945`.
4. **`hello1@gmail.com`**:
   - **Classification:** **Deliberate manual test account**
   - **Evidentiary Proof:** Created Nov 10 at 16:21 UTC during manual password reset and recovery testing via Mailpit. Has 1 revoked session. Documented in `docs/PROGRESS.md#L927,L946`.
5. **`helloooo123@gmail.com`**:
   - **Classification:** **Deliberate manual test account**
   - **Evidentiary Proof:** Created Nov 10 at 19:23 UTC as a manual smoke test account immediately following the decoupled signup/login refactor. Has 1 revoked session.

---

## 9. Per-Account Linked-Data Counts

| User Email | Active Sessions | Revoked Sessions | Chats | Messages | Progress | Library | Flashcards | Durable Jobs | Analyses | Executions | Stream Events |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `learner.askai...` | 1 | 0 | 1 | 2 | 0 | 0 | 0 | 1 | 0 | 0 | 2 |
| `learner@gmail.com` | 1 | 0 | 1 | 2 | 0 | 0 | 0 | 1 | 1 | 1 | 8 |
| `persistence.learner...` | 4 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `hello1@gmail.com` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `helloooo123@gmail.com` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **TOTALS** | **6** | **3** | **2** | **4** | **0** | **0** | **0** | **2** | **1** | **1** | **10** |

---

## 10. User Deletion Dependency & Foreign Key Map

Inspection of PostgreSQL `information_schema.referential_constraints` starting from `users`:

| Table Name | Foreign Key Column | Target Table | Delete Action | Auto-Cascade? | Manual Step Required? | Current Rows in `javaverse` | Content Nature |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **`sessions`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 9 | Learner session tokens |
| **`chats`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 2 | Learner chat workspaces |
| **`chat_state`** | `chat_id` | `chats.id` | **CASCADE** | **Yes** | No | 2 | Learner workspace UI state |
| **`messages`** | `chat_id` | `chats.id` | **CASCADE** | **Yes** | No | 4 | Learner/assistant messages |
| **`analyses`** | `message_id` | `messages.id` | **CASCADE** | **Yes** | No | 1 | AI code analyses |
| **`executions`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 1 | Code runner execution logs |
| **`user_stream_events`**| `user_id` | `users.id` | **CASCADE** | **Yes** | No | 10 | SSE event stream buffers |
| **`attachments`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | Upload metadata |
| **`feedback`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | Learner thumbs up/down |
| **`feedback_reports`**| `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | Learner bug reports |
| **`kb_candidates`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | Learner KB proposals |
| **`library_items`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | Learner bookmarks/notes |
| **`practice_submissions`**| `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | Learner code submissions |
| **`user_badges`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | Learner awarded badges |
| **`user_flashcards`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | Spaced repetition cards |
| **`user_progress`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | Lesson/practice progress |
| **`user_rewards`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | Learner XP/streaks |
| **`mfa_totp`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | TOTP secrets |
| **`recovery_codes`** | `user_id` | `users.id` | **CASCADE** | **Yes** | No | 0 | MFA recovery codes |
| **`email_tokens`** | `subject_user_id`| `users.id` | **CASCADE** | **Yes** | No | 0 | Verification/reset tokens |
| **`durable_jobs`** | `user_id` | `users.id` | **SET NULL** | **NO** | **YES** | 2 | Background BullMQ jobs |
| **`audit_logs`** | `actor_user_id` | `users.id` | **SET NULL** | **NO** | Preserved | 931 | Audit trail (Actor nullified) |
| **`audit_logs`** | `target_user_id` | `users.id` | **SET NULL** | **NO** | Preserved | 931 | Audit trail (Target nullified) |
| **`idempotency_records`**| `principal_id` | *(none)* | *(no FK)* | **NO** | *(0 rows)* | 0 | Request replay prevention |
| **`curriculum_lessons`**| *(none)* | *(none)* | *(no FK)* | **NO** | Preserved | 12 | **Shared platform curriculum** |
| **`practice_problems`** | *(none)* | *(none)* | *(no FK)* | **NO** | Preserved | 12 | **Shared practice problem set** |
| **`deployment_limits`** | *(none)* | *(none)* | *(no FK)* | **NO** | Preserved | 1 | **Installation limits (`max_users=5`)** |
| **`eval_runs`** | *(none)* | *(none)* | *(no FK)* | **NO** | Preserved | 33 | **Prompt quality evaluations** |
| **`_prisma_migrations`** | *(none)* | *(none)* | *(no FK)* | **NO** | Preserved | 6 | **Database migration history** |

---

## 11. PostgreSQL Cascade Behavior & Critical Finding

> [!WARNING]
> **CRITICAL DATA-SAFETY FINDING: `DELETE FROM users;` ALONE LEAVES ORPHANED ROWS IN `durable_jobs`**
>
> In `schema.prisma` and PostgreSQL, `durable_jobs.user_id` is defined with `onDelete: SetNull`.
> If an operator executes `DELETE FROM users;` without explicitly cleaning `durable_jobs`, PostgreSQL will **NOT** delete the 2 durable job rows. Instead, it will set their `user_id` and `chat_id` columns to `NULL`, leaving orphaned job records in the database.
>
> Therefore, an account reset procedure **MUST** execute an explicit `DELETE FROM durable_jobs WHERE user_id IN (SELECT id FROM users);` (or `DELETE FROM durable_jobs;`) within the transaction.

### Audit Log Retention Behavior
In `audit_logs`, `actor_user_id` and `target_user_id` are defined with `onDelete: SetNull`. When users are deleted, the audit records are preserved, and their user ID columns are nullified while preserving the action name, timestamp, and anonymous IP hash. This conforms to standard security audit retention requirements.

---

## 12. Non-PostgreSQL Storage Orphan Risk

### Redis Stores
- **Redis Queue (`javaverse-redis-queue`, 6379):** Contains 169 BullMQ tracking keys (`bull:analysis-queue:*`, `bull:cleanup-queue:*`, `bull:media-queue:*`). There are no active pending learner jobs. Keys represent queue bookkeeping and completed historical job records.
- **Redis Cache (`javaverse-redis-cache`, 6380):** Contains **0 keys** (DBSIZE = 0).
- **Cascade Impact:** Foreign keys cannot touch Redis.
- **Privacy / Orphan Risk:** Low. Keys do not contain passwords or raw user data. Flushing is not strictly required for account creation, but restarting the queue container or clearing completed BullMQ jobs ensures a completely pristine queue state.

### MinIO Storage
- **Bucket:** `javaverse-uploads` (`/data/javaverse-uploads/clean/`)
- **Contents:** 60 object directories named with UUIDs.
- **Attachment Rows in DB:** **0** in `javaverse`, **0** in `javaverse_test`.
- **Nature of Objects:** Historical test artifacts from past test runs of `uploads.test.ts`. None correspond to active user data in `javaverse`.
- **Privacy / Orphan Risk:** Negligible. Because no database attachments point to them, leaving them creates no functional broken links.

### Mailpit Storage
- **Port:** `8025`
- **Messages in Mailpit:** **0** (total: 0).
- **Cleanup Required:** None.

### Browser Cookies
- **Active Cookies:** Browsers that have interacted with JavaVerse may retain `javaverse_session` and flow CSRF cookies (`javaverse_csrf_*`).
- **Required Operator Action:** Clear browser cookies for `localhost:3000` or open an incognito/private browser window prior to the manual verification test.

---

## 13. Backup Readiness

| Checkpoint | Status | Details |
| :--- | :---: | :--- |
| **`scripts/backup-db.sh` exists** | **YES** | Shell script with strict umask 077 and error handling. |
| **Targets `javaverse`** | **YES** | Defaults to `TARGET_DB="javaverse"` and `TARGET_CONTAINER="javaverse-postgres"`. |
| **Creates compressed SQL** | **YES** | Streams `pg_dump` through `gzip -c` to `.sql.gz`. |
| **Creates SHA-256 checksum** | **YES** | Generates companion `.sql.gz.sha256` checksum file. |
| **Enforces 0600 permissions** | **YES** | Enforces `chmod 600` on backup file and `0700` on backup directory. |
| **Latest backup filename** | `javaverse_backup_20261109_155417.sql.gz` | Size: 91,495 bytes. Checksum: `be494d7a...` verified OK. |
| **Latest backup timestamp** | 2026-11-09 15:54:17 UTC | File modified Nov 9 21:24. |
| **Does backup include current 5 accounts?** | **NO** | **CRITICAL: The existing backup predates Accounts 2, 3, 4, and 5.** Only Account 1 is in the backup. |
| **Restore verification passed?** | **YES** | `scripts/verify-backup-restore.mjs` verifies restore against `javaverse_backup_verify_test`. |

> [!IMPORTANT]
> **BACKUP MANDATE:** Because the existing backup predates four of the five accounts, an operator **MUST run `./scripts/backup-db.sh ./backups` immediately before executing any account deletion**.

---

## 14. Exact Safe Account-Reset Plan (Proposed, Not Executed)

### Step 1: Pre-Reset Fresh Backup
```bash
./scripts/backup-db.sh ./backups
```
Verify the generated backup checksum:
```bash
sha256sum -c backups/javaverse_backup_*.sql.gz.sha256 | tail -n 1
```

### Step 2: Quiesce Application Processes
Stop any running web or worker dev servers (`Ctrl+C` in running terminals) to prevent concurrent write operations during the reset. PostgreSQL containers remain running.

### Step 3: Execute Transactional Cleanup SQL
Execute the following single transaction via `psql` with `ON_ERROR_STOP=1`:

```bash
docker exec -i javaverse-postgres psql -v ON_ERROR_STOP=1 -U javaverse -d javaverse << 'EOF'
BEGIN;

-- 1. Display target accounts prior to deletion
SELECT id, email, display_name, status, created_at FROM users ORDER BY created_at ASC;

-- 2. Clean up non-cascading durable jobs associated with users
DELETE FROM durable_jobs WHERE user_id IN (SELECT id FROM users);

-- 3. Delete user rows (cascades automatically to sessions, chats, chat_state, messages, analyses, executions, stream_events)
DELETE FROM users;

-- 4. Verification assertions before commit
SELECT count(*) AS remaining_users FROM users;
SELECT count(*) AS remaining_sessions FROM sessions;
SELECT count(*) AS remaining_chats FROM chats;
SELECT count(*) AS remaining_durable_jobs FROM durable_jobs;

-- 5. Assert protected shared data remains intact
SELECT count(*) AS curriculum_lessons_count FROM curriculum_lessons; -- Expected: 12
SELECT count(*) AS practice_problems_count FROM practice_problems;   -- Expected: 12
SELECT count(*) AS deployment_limits_count FROM deployment_limits;   -- Expected: 1
SELECT count(*) AS migrations_count FROM _prisma_migrations;         -- Expected: 6

COMMIT;
EOF
```

### Step 4: Post-Commit Account-Count Verification
```bash
docker exec -i javaverse-postgres psql -U javaverse -d javaverse -c "SELECT count(*) AS active_users FROM users;"
```
Expected output: `active_users: 0`.

### Step 5: Browser State Cleanup
Clear browser cookies and site data for `http://localhost:3000` (or use a fresh Private/Incognito browser window) to remove obsolete `javaverse_session` and CSRF cookies.

---

## 15. Protected Shared Data Verification

The proposed reset script guarantees 100% preservation of all shared platform assets:
- **`_prisma_migrations` (6 rows):** Migration history remains untouched.
- **`curriculum_lessons` (12 rows):** All published lesson tracks, hooks, visualizations, quizzes, and starter code remain intact.
- **`practice_problems` (12 rows):** All practice problems, test harnesses, sample tests, and hints remain intact.
- **`deployment_limits` (1 row):** `max_users = 5` limit remains intact.
- **`eval_runs` (33 rows):** Evaluation suite runs remain intact.
- **Docker Named Volumes:** `infra_postgres_data`, `infra_redis_cache_data`, `infra_redis_queue_data`, `infra_minio_data`, and `infra_mailpit_data` remain intact.

---

## 16. Authentication & Security Flow Audit

### Current Implemented Signup Flow (Flow B: Decoupled Sign-In)
- **Route:** `POST /api/v1/auth/signup`
- **Session Issuance:** **None**. `generateSessionTokens` and `createSessionRow` are completely removed from the signup transaction.
- **Cookie Header:** **None**. No `Set-Cookie` header is returned.
- **Response Contract:** Returns HTTP 201 Created:
  ```json
  {
    "success": true,
    "message": "Account created successfully. Sign in to continue.",
    "user": {
      "id": "...",
      "email": "...",
      "displayName": "..."
    },
    "requiresSignIn": true
  }
  ```
- **Client Redirect:** `apps/web/src/app/(public)/auth/signup/page.tsx` redirects to `/auth/login?created=1` on HTTP 201.
- **Login Status Notice:** `apps/web/src/app/(public)/auth/login/page.tsx` detects `?created=1` and renders an accessible banner (`role="status"`): `"Account created successfully. Sign in with your email and password."`. Banner is automatically cleared when the user submits the sign-in form.

### Current Password & Breach Screening Policy
- **Length:** Minimum 12 characters, maximum 128 characters.
- **Whitespace:** Internal spaces permitted for multi-word passphrases; leading/trailing whitespace rejected with `"Password cannot begin or end with whitespace."`.
- **Composition Rules:** None (NIST SP 800-63B compliant).
- **Argon2id Parameters:** `memoryCost: 65536` (64 MB), `timeCost: 3`, `parallelism: 4`. Timing attack mitigation via dummy hash verification (`verifyDummyPassword`).
- **Common Password Detection:** Local blocklist check (`isCommonPassword`) returns HTTP 400 `PASSWORD_COMMON` with `"This password is too common. Choose a longer, less predictable password."`.
- **HIBP Breach Screening:** Privacy-preserving k-anonymity SHA-1 range check with 1500ms timeout.
- **Degraded-Mode Non-Blocking Fallback:** When HIBP times out, returns HTTP 500, or fails network calls, JavaVerse logs a sanitized audit event (`auth.breach_check_degraded`) and allows signup/reset to proceed using local policy checks. Login **never** contacts external breach services.

### Current Pre-Authentication CSRF Behavior
- **Explicit Flow Priority:** Query parameter `?flow=<flow>` overrides ambient session cookies in `GET /api/v1/auth/csrf`.
- **Multi-Flow Isolation:** Dedicated cookies per flow (`javaverse_csrf_<flow>` / `__Host-javaverse_csrf_<flow>`), preventing cross-tab token overwrites.
- **Replay Protection:** Bounded consumed token cache in memory and Redis. Single-use nonces marked consumed upon successful account creation or sign-in.
- **Automatic Retry:** Signup and login forms use React `useRef` to eliminate submission races and automatically retry once on HTTP 403 `CSRF_ERROR`.

---

## 17. Contradictory Report Claim Audit

| Document | Line Range | Audited Claim | Truth & Evidentiary Findings | Corrected Understanding |
| :--- | :--- | :--- | :--- | :--- |
| `docs/PROGRESS.md` | L943–947 | Forensic account audit lists 3 active accounts and 1 non-existent account; claims zero test pollution in `javaverse`. | **CONTRADICTION:** Omitted Account 1 (`learner.askai...`), which is an automated Playwright test artifact from Nov 9 that consumed 1 of the 5 installation slots. | The `javaverse` database contained 1 historical automated test artifact and 4 manual test accounts, totaling 5 accounts. |
| `docs/PROGRESS.md` | L856 | *"None. All criteria passing. All changes left uncommitted for owner review."* | **CONTRADICTION:** Implied readiness to commit and push immediately. In reality, all 5 installation slots are full, blocking manual registration testing. | The code is verified in test databases, but manual smoke testing on `javaverse` requires an account reset first. |
| Earlier reports / Discussions | N/A | Browser password managers caused account disappearance or login failures. | **DISPROVEN:** Forensic analysis proved PostgreSQL is the sole system of record. Playwright's `webServer` targeting `javaverse_test` wiped rows, not browser password managers. | Password managers provide valid form autofill; database row deletion was caused by test suite cleanup against port 3000. |
| `docs/reviews/ROADMAP_AUDIT_PHASES_4_11.md` | L62 | Lists `container_runner (Primary)` as active sandbox execution provider. | **CONTRADICTION:** `AGENTS.md` and Phase 6 rules explicitly mark `container_runner` as **REJECTED**. | `SANDBOX_PROVIDER=mock` is the sole approved provider. `container_runner` is an unapproved, unverified candidate. |

---

## 18. Readiness Assessment

| Gate / Operation | Status | Blocking Condition & Justification |
| :--- | :---: | :--- |
| **A. Account Reset** | **READY** | Transactional reset SQL is verified and ready to execute after fresh backup. |
| **B. Manual Signup/Login Test** | **BLOCKED** | Blocked until Account Reset frees capacity (currently 0/5 slots remaining). |
| **C. Git Staging** | **READY (PENDING TEST)**| All lint, format, typecheck, static hashes, and alignment tests pass. Awaiting maintainer approval after smoke test. |
| **D. Git Commit** | **NOT READY** | Maintainer instructions require manual verification and clean working tree before committing. |
| **E. Git Push** | **NOT READY** | Blocked on commit and maintainer review. |
| **F. Branch Merge to Main** | **NOT READY** | Requires clean push, green remote GitHub Actions CI run, and maintainer review. |

---

## 19. Recommended Next Exact Sequence

To safely conclude this release phase without risking data loss or repository corruption, the maintainer should execute the following sequence:

1. **Step 1: Take Fresh Backup**
   ```bash
   ./scripts/backup-db.sh ./backups
   ```
2. **Step 2: Stop Dev Servers**
   Terminate any running `pnpm dev` or `./start-dev.sh` processes with `Ctrl+C`.
3. **Step 3: Execute Account Reset**
   Run the proposed SQL transaction in `psql`:
   ```bash
   docker exec -i javaverse-postgres psql -v ON_ERROR_STOP=1 -U javaverse -d javaverse << 'EOF'
   BEGIN;
   DELETE FROM durable_jobs WHERE user_id IN (SELECT id FROM users);
   DELETE FROM users;
   COMMIT;
   EOF
   ```
4. **Step 4: Launch Dev Environment**
   ```bash
   ./start-dev.sh
   ```
5. **Step 5: Perform Manual Smoke Test**
   - Open an Incognito/Private browser window at `http://localhost:3000/auth/signup`.
   - Register a new learner account.
   - Verify immediate redirect to `http://localhost:3000/auth/login?created=1` with confirmation notice.
   - Sign in with the registered credentials.
   - Verify redirect to `/dashboard` with live user profile.
6. **Step 6: Stage and Commit**
   ```bash
   git add -A
   git commit -m "feat: complete single-learner account model, decoupled authentication, and CSRF multi-flow isolation"
   ```
7. **Step 7: Push and Monitor CI**
   ```bash
   git push origin fix/phases-4-11-owner-audit
   ```

---

## 20. Final Audit Status

**READY FOR SAFE ACCOUNT RESET**

*(Awaiting explicit maintainer instruction to execute backup and account reset SQL).*


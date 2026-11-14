# JavaVerse Database & Migration Audit

> **Audit Target:** Prisma schema, PostgreSQL migrations sequence, and data-integrity guarantees  
> **Active Database Engine:** PostgreSQL 17 + `citext` + `pgvector` (`pgvector/pgvector:pg17`)  
> **Prisma Client Version:** `^6.4.1`  
> **Safety Guard:** Strict allowlist protection via `packages/db/src/safety.ts`  

---

## 1. Executive Summary

This audit establishes the structural baseline of the JavaVerse database layer. Following Phase 11 and migration `20261109210000_single_learner_account_model`, the database implements a strict **single-learner-account architecture**:
- The `users` table contains **zero `role` column**.
- All accounts have identical learner capabilities.
- The `invitations`, `bootstrap_tokens`, and `bootstrap_audit` tables have been dropped.
- Account limits are governed by the `deployment_limits` singleton table (`max_users = 5`).
- Destructive operations (`drop`, `truncate`, `migrate reset`) are strictly blocked against development database `javaverse` by `packages/db/src/safety.ts`.

---

## 2. Chronological Migration Audit

JavaVerse possesses 6 forward-only migrations recorded in `packages/db/prisma/migrations/migration_lock.toml`:

| # | Migration Directory | Phase | Timestamp | Primary DDL Actions & Structural Changes |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `20261026164311_foundation` | Phase 1 | Oct 26, 2026 | Initial schema: `deployment_limits`, `users`, `invitations`, `email_tokens`, `sessions`, `mfa_totp`, `recovery_codes`, `chats`, `chat_state`, `messages`, `attachments`, `analyses`, `executions`, `feedback`, `durable_jobs`, `user_stream_events`, `idempotency_records`, `audit_logs`. |
| **2** | `20261030151351_auth_hardening` | Phase 3 | Oct 30, 2026 | Added `users.display_name` (VARCHAR 64), `sessions.public_id` (UUID unique backfill), `sessions.last_seen_at` (TIMESTAMPTZ), `idx_sessions_user_active`. |
| **3** | `20261106000000_curriculum_lessons` | Phase 8 | Nov 6, 2026 | Added `curriculum_lessons` table with track, module, difficulty, hook, content layers, starter/solution code, JSON quiz/challenges. |
| **4** | `20261106010000_practice_progress_mastery` | Phase 9 | Nov 6, 2026 | Added `users.theme`, `users.default_java_version`, `practice_problems`, `practice_submissions`, `user_progress`, `user_rewards`, `user_badges`, `user_flashcards`, `library_items`. |
| **5** | `20261106020000_evaluation_quality_kb` | Phase 10 | Nov 6, 2026 | Added `feedback_reports`, `kb_candidates`, `kb_items`, `eval_runs`, and raw SQL GIN full-text index `kb_items_search_idx`. |
| **6** | `20261109210000_single_learner_account_model` | Single-Account | Nov 9, 2026 | **Authoritative Cleanse:** Dropped `users.role`, single-owner index `idx_users_single_active_owner`, role check `chk_users_role`, `invitations` table, `bootstrap_tokens`, `bootstrap_audit`, `deployment_limits.registration_mode`, `audit_logs.actor_role_at_time`, and enums `Role`/`UserRole`. |

---

## 3. Deep-Dive Verification of Migration 6 (`single_learner_account_model`)

Migration `20261109210000_single_learner_account_model` was applied and verified against live PostgreSQL data and clean disposable verification databases.

### 3.1 Verification Checklist

| Invariant / Data Requirement | Verified State | Evidence & Mechanism |
| :--- | :--- | :--- |
| **Preserves user accounts** | **CONFIRMED** | `users` table retained; `id`, `email`, `created_at` completely intact. Verified in `verify-clean-db.mjs` and `verify-backup-restore.mjs`. |
| **Preserves password hashes** | **CONFIRMED** | `users.password_hash` column unmodified. Argon2id hashes preserved without truncation. |
| **Preserves active sessions** | **CONFIRMED** | `sessions` table unmodified. Foreign keys (`user_id -> users.id`) preserved. |
| **Preserves chat histories** | **CONFIRMED** | `chats`, `messages`, `analyses`, `executions` preserved with cascade rules. |
| **Preserves learner progress** | **CONFIRMED** | `user_progress` (lessons & problems) preserved 100%. |
| **Preserves XP & streak rewards** | **CONFIRMED** | `user_rewards` and `user_badges` preserved 100%. |
| **Preserves settings & preferences** | **CONFIRMED** | `theme`, `default_java_version`, and `consent_improve` on `users` preserved. |
| **Preserves library bookmarks** | **CONFIRMED** | `library_items` table preserved 100%. |
| **Removes `users.role` column** | **CONFIRMED** | `ALTER TABLE "users" DROP COLUMN IF EXISTS "role";` executed. Verified: `('role' in user)` is false. |
| **Removes `Role` / `UserRole` enums** | **CONFIRMED** | `DROP TYPE IF EXISTS "Role"; DROP TYPE IF EXISTS "UserRole";` executed. |
| **Removes single-owner constraints** | **CONFIRMED** | `DROP INDEX IF EXISTS "idx_users_single_active_owner"; ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_role";` executed. |
| **Removes bootstrap structures** | **CONFIRMED** | `DROP TABLE IF EXISTS "bootstrap_tokens" CASCADE; DROP TABLE IF EXISTS "bootstrap_audit" CASCADE;` executed. |
| **Removes invitation structures** | **CONFIRMED** | `DROP TABLE IF EXISTS "invitations" CASCADE;` executed. |
| **Avoids unrelated data loss** | **CONFIRMED** | Zero unrelated columns or tables modified. Verified by backup/restore byte comparison. |

### 3.2 SQL Verification Code in Migration 6
```sql
-- Convert legacy OWNER rows to normal account before removing role column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        UPDATE "users" SET "role" = 'MEMBER' WHERE "role" = 'OWNER';
    END IF;
END $$;

DROP INDEX IF EXISTS "idx_users_single_active_owner";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_role";
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
DROP TABLE IF EXISTS "invitations" CASCADE;
DROP TABLE IF EXISTS "bootstrap_tokens" CASCADE;
DROP TABLE IF EXISTS "bootstrap_audit" CASCADE;
ALTER TABLE "deployment_limits" DROP COLUMN IF EXISTS "registration_mode";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "actor_role_at_time";
DROP TYPE IF EXISTS "Role";
DROP TYPE IF EXISTS "UserRole";
```

---

## 4. Active Active Schema Architecture (`schema.prisma`)

The authoritative schema contains **20 active models**:

```
 deployment_limits (id=1 singleton, max_users=5)
       │
       ▼
     users ──┬── email_tokens (verification, password reset, otp)
             ├── sessions (public_id, idle timeout, last_seen_at)
             ├── mfa_totp (RFC 6238 encrypted secret)
             ├── recovery_codes (hashed backup codes)
             ├── chats ──┬── chat_state (UI layout state)
             │           ├── messages ──┬── attachments (S3 quarantine/clean)
             │           │              ├── analyses ──┬── feedback_reports
             │           │              │              └── kb_candidates ── kb_items
             │           │              └── executions (sandbox runner audit)
             │           └── user_stream_events (SSE replay)
             ├── durable_jobs (BullMQ async tracking, leases)
             ├── practice_submissions ── practice_problems
             ├── user_progress (curriculum & practice)
             ├── user_rewards (xp, streak_days, gamification toggle)
             ├── user_badges (gamification achievements)
             ├── user_flashcards (SM-2 spaced repetition)
             ├── library_items (bookmarks and notes)
             └── audit_logs (security event tracing)

 Standalone Models:
 - idempotency_records (HTTP idempotency keys)
 - eval_runs (automated benchmark scoring)
 - curriculum_lessons (12 visual lessons)
```

### 4.1 Foreign Key Deletion Cascades
- **`User` Deletion (`ON DELETE CASCADE`):** Cascades to `email_tokens`, `sessions`, `mfa_totp`, `recovery_codes`, `chats`, `attachments`, `executions`, `feedback`, `streamEvents`, `practiceSubmissions`, `progressEntries`, `rewards`, `badges`, `flashcards`, `libraryItems`, `feedbackReports`, `kbCandidates`.
- **`User` Anonymization (`ON DELETE SET NULL`):** `audit_logs` (`actorUserId`, `targetUserId`), `durable_jobs` (`userId`), `resolvedFeedbacks` (`resolvedBy`), `reviewedCandidates` (`reviewedBy`). Protects audit trail integrity even if a user is deleted.
- **`Chat` Deletion (`ON DELETE CASCADE`):** Cascades to `messages`, `chat_state`.
- **`Message` Deletion (`ON DELETE CASCADE`):** Cascades to `attachments`, `analysis`, `feedback`.

### 4.2 Raw SQL Full-Text Search GIN Index Exception
In `packages/db/prisma/schema.prisma` lines 564–570, `model KbItem` contains an intentional raw SQL index comment:
```prisma
// Intentional Raw SQL GIN Index Exception:
// The PostgreSQL full-text search index:
//   CREATE INDEX "kb_items_search_idx" ON "kb_items" USING gin(to_tsvector('english', "title" || ' ' || "content"));
// was created in migration 20261106020000_evaluation_quality_kb.
// Prisma Schema DSL does not support functional/expression GIN indexes.
```
This index is preserved in the database and explicitly asserted in `scripts/verify-clean-db.mjs`.

---

## 5. Old-Schema to New-Schema Structural Mapping

| Schema Element | Legacy Architecture (Phases 1–10) | Current Architecture (Phase 11+) | Migration Action Taken |
| :--- | :--- | :--- | :--- |
| `users.role` | `TEXT` (`'OWNER'`, `'MEMBER'`) | **Removed** | Dropped column; all users are standard learners |
| Single Owner Index | `idx_users_single_active_owner` | **Removed** | Dropped partial index |
| `invitations` table | Table with tokens, expires, role | **Removed** | Dropped table with `CASCADE` |
| `bootstrap_tokens` | Table with single-use tokens | **Removed** | Dropped table |
| `deployment_limits.registration_mode` | `TEXT` (`'invite_only'`, `'open'`) | **Removed** | Dropped column; registration is always public up to 5 |
| `audit_logs.actor_role_at_time` | `TEXT` (`'OWNER'`, `'MEMBER'`) | **Removed** | Dropped column |
| `Role` / `UserRole` enums | PostgreSQL custom types | **Removed** | Dropped types |
| Display Name | Absent in v1 -> Added in Phase 3 | `users.display_name VARCHAR(64)` | Preserved |
| Account Limit | Variable | Singleton `deployment_limits.max_users = 5` | Enforced via PostgreSQL advisory lock |

---

## 6. Rollback Difficulty & Staging Recommendations

1. **Forward-Only Policy:** PostgreSQL migrations in JavaVerse are strictly forward-only. Rollback of migration `20261109210000_single_learner_account_model` is **HIGH DIFFICULTY** because the `role` column, `invitations` table, and bootstrap tokens were dropped without preserving old invitation records.
2. **Disaster Recovery Path:** If a rollback is ever mandated, operators must restore the pre-migration backup (`./backups/javaverse_backup_YYYYMMDD_HHMMSS.sql.gz`) using `scripts/restore-db.sh`.
3. **Database Protection Rules:**
   - **NEVER** run `prisma migrate reset` against development database `javaverse`.
   - **NEVER** run `docker compose down -v` casually, as `-v` destroys the persistent Docker volume `javaverse_postgres_data`.
   - All schema verifications must target disposable test databases (`javaverse_test`, `javaverse_clean_verify`).


-- ==============================================================================
-- Migration: auth_hardening (Phase 3 Authentication Hardening)
-- ==============================================================================

-- 1. Display name on users (preserving CITEXT on email)
ALTER TABLE "users" ADD COLUMN "display_name" VARCHAR(64);

-- 2. Session hardening: Safe public_id addition and backfill ordering
ALTER TABLE "sessions" ADD COLUMN "public_id" UUID;

UPDATE "sessions"
SET "public_id" = gen_random_uuid()
WHERE "public_id" IS NULL;

ALTER TABLE "sessions" ALTER COLUMN "public_id" SET NOT NULL;

CREATE UNIQUE INDEX "sessions_public_id_key" ON "sessions"("public_id");

-- 3. Idle expiration timestamp
ALTER TABLE "sessions" ADD COLUMN "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 4. Access-pattern-justified indexes
CREATE INDEX "sessions_last_seen_at_idx" ON "sessions"("last_seen_at");
CREATE INDEX "idx_sessions_user_active" ON "sessions"("user_id") WHERE "revoked_at" IS NULL;


-- CreateTable
CREATE TABLE "deployment_limits" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "max_users" INTEGER NOT NULL DEFAULT 5,
    "registration_mode" TEXT NOT NULL DEFAULT 'invite_only',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployment_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ,
    "consent_improve" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invited_by_user_id" UUID,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "otp_hash" TEXT,
    "delivery_channel" TEXT NOT NULL,
    "subject_user_id" UUID,
    "subject_email" TEXT,
    "purpose" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "mfa_verified_at" TIMESTAMPTZ,
    "reauth_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_totp" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "secret_ciphertext" TEXT NOT NULL,
    "last_used_timestep" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_totp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "slot" SMALLINT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Question',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_state" (
    "chat_id" UUID NOT NULL,
    "ui_state" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_state_pkey" PRIMARY KEY ("chat_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "chat_id" UUID NOT NULL,
    "parent_id" UUID,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message_id" UUID,
    "storage_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "safe_display_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "scan_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "model_id" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "analysis_id" UUID,
    "message_id" UUID,
    "code_hash" TEXT NOT NULL,
    "java_version" TEXT NOT NULL,
    "runner_provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stdout" TEXT,
    "stderr" TEXT,
    "exit_code" INTEGER,
    "time_ms" INTEGER,
    "memory_kb" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "vote" SMALLINT NOT NULL,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "durable_jobs" (
    "id" UUID NOT NULL,
    "queue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stage" TEXT,
    "user_id" UUID,
    "chat_id" UUID,
    "analysis_id" UUID,
    "correlation_id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "dedupe_key" TEXT,
    "lease_owner" TEXT,
    "lease_expires_at" TIMESTAMPTZ,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "durable_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stream_events" (
    "stream_seq" BIGSERIAL NOT NULL,
    "job_event_seq" INTEGER,
    "user_id" UUID NOT NULL,
    "chat_id" UUID,
    "job_id" UUID,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stream_events_pkey" PRIMARY KEY ("stream_seq")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "key" TEXT NOT NULL,
    "principal_id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_payload" JSONB NOT NULL,
    "status_code" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("principal_id","key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "target_user_id" UUID,
    "actor_pseudonym" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_role_at_time" TEXT,
    "action" TEXT NOT NULL,
    "target_metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_expires_at_idx" ON "invitations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_tokens_token_hash_key" ON "email_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_tokens_purpose_token_hash_idx" ON "email_tokens"("purpose", "token_hash");

-- CreateIndex
CREATE INDEX "email_tokens_expires_at_idx" ON "email_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_totp_user_id_key" ON "mfa_totp"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_codes_code_hash_key" ON "recovery_codes"("code_hash");

-- CreateIndex
CREATE INDEX "recovery_codes_user_id_idx" ON "recovery_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chats_user_id_slot_key" ON "chats"("user_id", "slot");

-- CreateIndex
CREATE INDEX "messages_chat_id_created_at_idx" ON "messages"("chat_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storage_key_key" ON "attachments"("storage_key");

-- CreateIndex
CREATE INDEX "attachments_user_id_idx" ON "attachments"("user_id");

-- CreateIndex
CREATE INDEX "attachments_message_id_idx" ON "attachments"("message_id");

-- CreateIndex
CREATE INDEX "attachments_sha256_idx" ON "attachments"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_message_id_key" ON "analyses"("message_id");

-- CreateIndex
CREATE INDEX "executions_user_id_idx" ON "executions"("user_id");

-- CreateIndex
CREATE INDEX "executions_code_hash_idx" ON "executions"("code_hash");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_user_id_message_id_key" ON "feedback"("user_id", "message_id");

-- CreateIndex
CREATE INDEX "durable_jobs_queue_status_idx" ON "durable_jobs"("queue", "status");

-- CreateIndex
CREATE INDEX "durable_jobs_lease_expires_at_idx" ON "durable_jobs"("lease_expires_at");

-- CreateIndex
CREATE INDEX "user_stream_events_user_id_stream_seq_idx" ON "user_stream_events"("user_id", "stream_seq");

-- CreateIndex
CREATE INDEX "user_stream_events_chat_id_created_at_idx" ON "user_stream_events"("chat_id", "created_at");

-- CreateIndex
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_occurred_at_idx" ON "audit_logs"("actor_user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_target_user_id_occurred_at_idx" ON "audit_logs"("target_user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_totp" ADD CONSTRAINT "mfa_totp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_state" ADD CONSTRAINT "chat_state_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "durable_jobs" ADD CONSTRAINT "durable_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "durable_jobs" ADD CONSTRAINT "durable_jobs_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "durable_jobs" ADD CONSTRAINT "durable_jobs_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stream_events" ADD CONSTRAINT "user_stream_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stream_events" ADD CONSTRAINT "user_stream_events_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stream_events" ADD CONSTRAINT "user_stream_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "durable_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==============================================================================
-- Reviewed Foundation SQL (Extensions, Invariants, Custom Checks & Indexes)
-- ==============================================================================

-- 1. Database Extensions
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Case-insensitive email
ALTER TABLE "users" ALTER COLUMN "email" TYPE CITEXT;

-- 3. Invariant: At-most-one active/non-deleted OWNER
CREATE UNIQUE INDEX idx_users_single_active_owner ON "users" ("role") WHERE "role" = 'OWNER' AND "status" != 'DELETED';
ALTER TABLE "users" ADD CONSTRAINT chk_users_role CHECK ("role" IN ('OWNER', 'MEMBER'));
ALTER TABLE "users" ADD CONSTRAINT chk_users_status CHECK ("status" IN ('ACTIVE', 'SUSPENDED', 'DELETION_PENDING', 'DELETED'));

-- 4. Invariant: Invitations may create MEMBER accounts only
ALTER TABLE "invitations" ADD CONSTRAINT chk_invitations_member_only CHECK ("role" = 'MEMBER');
ALTER TABLE "invitations" ADD CONSTRAINT chk_invitations_status CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'));
CREATE UNIQUE INDEX idx_invitations_pending_email ON "invitations" ("email_normalized") WHERE "status" = 'PENDING';

-- 5. Deployment limits constraints (singleton & positive capacity)
ALTER TABLE "deployment_limits" ADD CONSTRAINT chk_deployment_limits_singleton CHECK ("id" = 1);
ALTER TABLE "deployment_limits" ADD CONSTRAINT chk_deployment_limits_max_users CHECK ("max_users" >= 1);

-- 6. Email tokens constraints
ALTER TABLE "email_tokens" ADD CONSTRAINT chk_email_tokens_delivery_channel CHECK ("delivery_channel" IN ('TERMINAL', 'EMAIL'));
ALTER TABLE "email_tokens" ADD CONSTRAINT chk_email_tokens_purpose CHECK ("purpose" IN ('OWNER_BOOTSTRAP', 'ACCEPT_INVITATION', 'VERIFY_EMAIL', 'RESET_PASSWORD', 'CHANGE_EMAIL'));
ALTER TABLE "email_tokens" ADD CONSTRAINT chk_email_tokens_attempts CHECK ("attempts" >= 0);

-- 7. Chat slot constraints (slots 1..3 per user)
ALTER TABLE "chats" ADD CONSTRAINT chk_chats_slot CHECK ("slot" BETWEEN 1 AND 3);

-- 8. Messages constraints
ALTER TABLE "messages" ADD CONSTRAINT chk_messages_role CHECK ("role" IN ('USER', 'ASSISTANT', 'SYSTEM'));
ALTER TABLE "messages" ADD CONSTRAINT chk_messages_status CHECK ("status" IN ('PENDING', 'SENT', 'FAILED', 'STREAMING'));

-- 9. Attachments constraints
ALTER TABLE "attachments" ADD CONSTRAINT chk_attachments_scan_status CHECK ("scan_status" IN ('PENDING', 'CLEAN', 'INFECTED', 'REJECTED'));
ALTER TABLE "attachments" ADD CONSTRAINT chk_attachments_size_bytes CHECK ("size_bytes" >= 0);

-- 10. Analyses verification status constraint
ALTER TABLE "analyses" ADD CONSTRAINT chk_analyses_verification_status CHECK ("verification_status" IN ('UNVERIFIED', 'VERIFIED_CORRECT', 'VERIFIED_ERROR', 'SKIPPED'));

-- 11. Executions status constraint
ALTER TABLE "executions" ADD CONSTRAINT chk_executions_status CHECK ("status" IN ('PENDING', 'RUNNING', 'SUCCESS', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'TIMEOUT', 'MEMORY_LIMIT', 'CONTAINMENT_ERROR'));

-- 12. Feedback vote constraint (-1 or 1)
ALTER TABLE "feedback" ADD CONSTRAINT chk_feedback_vote CHECK ("vote" IN (-1, 1));

-- 13. Durable jobs deduplication index and checks
CREATE UNIQUE INDEX idx_durable_jobs_dedupe ON "durable_jobs" ("queue", "dedupe_key") WHERE "status" IN ('PENDING', 'RUNNING');
ALTER TABLE "durable_jobs" ADD CONSTRAINT chk_durable_jobs_status CHECK ("status" IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'));
ALTER TABLE "durable_jobs" ADD CONSTRAINT chk_durable_jobs_progress CHECK ("progress" BETWEEN 0 AND 100);

-- 14. User stream events consistency check and job event sequencing
CREATE UNIQUE INDEX idx_user_stream_events_job_event_seq ON "user_stream_events" ("job_id", "job_event_seq") WHERE "job_id" IS NOT NULL AND "job_event_seq" IS NOT NULL;
ALTER TABLE "user_stream_events" ADD CONSTRAINT chk_user_stream_events_job_consistency CHECK (
  ("job_id" IS NULL AND "job_event_seq" IS NULL) OR
  ("job_id" IS NOT NULL AND "job_event_seq" IS NOT NULL)
);

-- 15. Audit logs actor type check
ALTER TABLE "audit_logs" ADD CONSTRAINT chk_audit_logs_actor_type CHECK ("actor_type" IN ('USER', 'SYSTEM'));


-- Migration: 20261106020000_evaluation_quality_kb
-- Phase 10: Feedback, approved knowledge, evaluations and owner administration

CREATE TABLE "feedback_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "analysis_id" UUID,
    "message_id" UUID,
    "issue_type" VARCHAR(32) NOT NULL,
    "details" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,
    "resolved_by" UUID,

    CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kb_candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "analysis_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
    "topic" VARCHAR(64) NOT NULL,
    "subtopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "title" VARCHAR(255) NOT NULL,
    "anonymized_question" TEXT NOT NULL,
    "verified_solution" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kb_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "topic" VARCHAR(64) NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "source_type" VARCHAR(32) NOT NULL DEFAULT 'APPROVED_ANALYSIS',
    "source_id" VARCHAR(128),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kb_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "kb_items_candidate_id_key" UNIQUE ("candidate_id")
);

CREATE TABLE "eval_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "suite_name" VARCHAR(128) NOT NULL,
    "model" VARCHAR(64) NOT NULL,
    "prompt_version" VARCHAR(64) NOT NULL,
    "total_cases" INTEGER NOT NULL,
    "passed_cases" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kb_candidates" ADD CONSTRAINT "kb_candidates_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kb_candidates" ADD CONSTRAINT "kb_candidates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kb_candidates" ADD CONSTRAINT "kb_candidates_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kb_items" ADD CONSTRAINT "kb_items_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "kb_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "feedback_reports_status_idx" ON "feedback_reports"("status");
CREATE INDEX "feedback_reports_created_at_idx" ON "feedback_reports"("created_at" DESC);

CREATE INDEX "kb_candidates_status_idx" ON "kb_candidates"("status");
CREATE INDEX "kb_candidates_topic_idx" ON "kb_candidates"("topic");
CREATE INDEX "kb_candidates_user_id_idx" ON "kb_candidates"("user_id");

CREATE INDEX "kb_items_published_idx" ON "kb_items"("published");
CREATE INDEX "kb_items_topic_idx" ON "kb_items"("topic");
CREATE INDEX "kb_items_search_idx" ON "kb_items" USING gin(to_tsvector('english', "title" || ' ' || "content"));

CREATE INDEX "eval_runs_created_at_idx" ON "eval_runs"("created_at" DESC);
CREATE INDEX "eval_runs_suite_name_idx" ON "eval_runs"("suite_name");


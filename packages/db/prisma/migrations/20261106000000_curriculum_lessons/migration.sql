-- ==============================================================================
-- Migration: curriculum_lessons (Phase 8 Curriculum & Lessons Foundation)
-- ==============================================================================

CREATE TABLE "curriculum_lessons" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "track" VARCHAR(64) NOT NULL,
    "module" VARCHAR(64) NOT NULL,
    "order_index" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "difficulty" VARCHAR(32) NOT NULL DEFAULT 'EASY',
    "estimated_minutes" INTEGER NOT NULL DEFAULT 15,
    "hook" TEXT NOT NULL,
    "content_simple" TEXT NOT NULL,
    "content_standard" TEXT NOT NULL,
    "content_deep" TEXT NOT NULL,
    "visualization" JSONB NOT NULL,
    "code_starter" TEXT NOT NULL,
    "code_solution" TEXT,
    "common_mistakes" JSONB NOT NULL,
    "quiz" JSONB NOT NULL,
    "challenge" JSONB NOT NULL,
    "java_version" VARCHAR(16) NOT NULL DEFAULT '21',
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_lessons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "curriculum_lessons_slug_key" ON "curriculum_lessons"("slug");
CREATE INDEX "curriculum_lessons_track_order_index_idx" ON "curriculum_lessons"("track", "order_index");
CREATE INDEX "curriculum_lessons_published_idx" ON "curriculum_lessons"("published");


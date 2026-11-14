-- ==============================================================================
-- Migration: practice_progress_mastery (Phase 9 Practice, Progress, Mastery & Rewards)
-- ==============================================================================

-- 1. Alter users table for theme and default Java version preferences
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "theme" VARCHAR(16) NOT NULL DEFAULT 'system';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_java_version" VARCHAR(16) NOT NULL DEFAULT '21';

-- 2. Practice Problems
CREATE TABLE IF NOT EXISTS "practice_problems" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "topic" VARCHAR(64) NOT NULL,
    "difficulty" VARCHAR(32) NOT NULL DEFAULT 'EASY',
    "order_index" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "starter_code" TEXT NOT NULL,
    "solution_code" TEXT,
    "sample_tests" JSONB NOT NULL,
    "hidden_tests" JSONB NOT NULL,
    "hints" JSONB NOT NULL,
    "test_harness" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_problems_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "practice_problems_slug_key" ON "practice_problems"("slug");
CREATE INDEX IF NOT EXISTS "practice_problems_topic_difficulty_idx" ON "practice_problems"("topic", "difficulty");
CREATE INDEX IF NOT EXISTS "practice_problems_order_index_idx" ON "practice_problems"("order_index");

-- 3. Practice Submissions
CREATE TABLE IF NOT EXISTS "practice_submissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "problem_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "tests_passed" INTEGER NOT NULL DEFAULT 0,
    "tests_total" INTEGER NOT NULL DEFAULT 0,
    "time_ms" INTEGER,
    "memory_kb" INTEGER,
    "stdout" TEXT,
    "stderr" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "practice_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "practice_submissions_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "practice_problems"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "practice_submissions_user_problem_idx" ON "practice_submissions"("user_id", "problem_id", "created_at" DESC);

-- 4. User Progress (Lessons & Practice Problems)
CREATE TABLE IF NOT EXISTS "user_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "item_type" VARCHAR(32) NOT NULL,
    "item_id" VARCHAR(128) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "last_attempted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_progress_user_item_idx" ON "user_progress"("user_id", "item_type", "item_id");
CREATE INDEX IF NOT EXISTS "user_progress_user_type_completed_idx" ON "user_progress"("user_id", "item_type", "completed");

-- 5. User Rewards (XP, Streaks, Gamification toggle)
CREATE TABLE IF NOT EXISTS "user_rewards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streak_days" INTEGER NOT NULL DEFAULT 0,
    "last_activity_date" VARCHAR(10),
    "gamification_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_rewards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_rewards_user_id_key" ON "user_rewards"("user_id");

-- 6. User Badges
CREATE TABLE IF NOT EXISTS "user_badges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_key" VARCHAR(64) NOT NULL,
    "awarded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_badges_user_badge_key" ON "user_badges"("user_id", "badge_key");
CREATE INDEX IF NOT EXISTS "user_badges_user_awarded_idx" ON "user_badges"("user_id", "awarded_at" DESC);

-- 7. User Flashcards (Spaced Repetition SM-2)
CREATE TABLE IF NOT EXISTS "user_flashcards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "source_type" VARCHAR(32) DEFAULT 'quiz_mistake',
    "source_id" VARCHAR(128),
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "next_review_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_flashcards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_flashcards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_flashcards_user_next_review_idx" ON "user_flashcards"("user_id", "next_review_at");

-- 8. Library Items (Bookmarks, Private Notes, Tags)
CREATE TABLE IF NOT EXISTS "library_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "item_type" VARCHAR(32) NOT NULL,
    "item_id" VARCHAR(128) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "bookmarked" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "library_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "library_items_user_item_idx" ON "library_items"("user_id", "item_type", "item_id");
CREATE INDEX IF NOT EXISTS "library_items_user_bookmarked_idx" ON "library_items"("user_id", "bookmarked");


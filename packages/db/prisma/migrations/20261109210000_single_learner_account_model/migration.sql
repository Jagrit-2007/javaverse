-- Convert any existing legacy OWNER rows to normal account before removing role column
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

-- Drop single active owner partial index and role check constraint
DROP INDEX IF EXISTS "idx_users_single_active_owner";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_role";

-- Drop role column from users
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";

-- Drop invitations table and all associated constraints
DROP TABLE IF EXISTS "invitations" CASCADE;

-- Drop bootstrap tables if any exist
DROP TABLE IF EXISTS "bootstrap_tokens" CASCADE;
DROP TABLE IF EXISTS "bootstrap_audit" CASCADE;

-- Drop registration_mode column from deployment_limits
ALTER TABLE "deployment_limits" DROP COLUMN IF EXISTS "registration_mode";

-- Drop actor_role_at_time from audit_logs
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "actor_role_at_time";

-- Drop legacy role enum types if any exist
DROP TYPE IF EXISTS "Role";
DROP TYPE IF EXISTS "UserRole";


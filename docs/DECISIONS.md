# JavaVerse Architectural Decisions & Amendments

## Phase 0 Amendments

Status: Approved for Phase 1

1. The initial pnpm installation is non-frozen because no lockfile exists.
2. Generate and commit pnpm-lock.yaml, then verify: `pnpm install --frozen-lockfile`.
3. Keep `.github/workflows` at the repository root.
4. Avoid speculative future packages and database tables.
5. Defer `argon2` and `otplib` to Phase 3.
6. Defer `sharp` to Phase 5.
7. Generate and inspect the initial Prisma migration.
8. Test `migrate:deploy` against a clean database.
9. Establish Pino structured logging, redaction and correlation IDs in Phase 1.
10. Defer full OpenTelemetry exporters and collectors until the required application boundaries exist.
11. Begin dependency and container-image licence inventory in Phase 1.
12. Do not create a fixed `VECTOR(1536)` field.
13. Implement separate health and readiness endpoints.
14. Treat `container_runner` as a preferred candidate only until the Phase 6 Sandbox Feasibility Spike passes.
15. Treat `gitleaks` and `OSV-Scanner` as pinned external tools, not application runtime dependencies.
16. Distinguish local CI validation from remote GitHub Actions success.

## Phase 1 Ratified Decisions

Status: Approved & Implemented

1. **Package Management & Tooling**:
   - Pinned `pnpm@12.15.0` via Corepack and `package.json#packageManager`.
   - Used Turborepo for monorepo pipeline orchestration.
   - Pinned dependencies with verified supply-chain policies and zero unmitigated vulnerabilities.

2. **Database Architecture & Initial Migration**:
   - Pinned PostgreSQL 17 with `citext` 1.6 and `pgvector` 0.8.7 extensions.
   - Initial reviewed migration named `foundation` (`20261026164311_foundation`).
   - Enforced database constraints in SQL DDL:
     - `idx_users_single_active_owner`: partial unique index on `(role)` WHERE `role = 'OWNER' AND status = 'ACTIVE'`.
     - `slot BETWEEN 1 AND 3` CHECK constraint on `chats`.
     - `singleton_check` CHECK constraint on `deployment_limits` ensuring `id = 1`.
     - `chk_invitations_member_only` ensuring invited role is `MEMBER`.
     - Check constraints on durable job status and progress (0–100).
   - Seed script configured with deterministic idempotency (`max_users=5`, `registration_mode=invite_only`).

3. **Dual Redis Architecture**:
   - `redis-queue`: Configured with append-only file (AOF) persistence and `maxmemory-policy noeviction` on port 6379 for reliable BullMQ job processing.
   - `redis-cache`: Configured with `maxmemory-policy allkeys-lru` on port 6380 for disposable ephemeral cache.

4. **Security & Cryptographic Foundations**:
   - Domain-separated HMAC-SHA-256 utility with timing-safe comparison implemented in `@javaverse/security` for future token validation. Raw SHA-256 token hashing rejected.
   - Passwords and TOTP authentication implementation deferred to Phase 3.
   - Zero hardcoded secrets; fail-fast validation in `@javaverse/schemas` rejects placeholder secrets and localhost URLs in production unless explicitly overridden.

5. **Observability & Health Model**:
   - Correlation IDs generated via standard UUIDv4 and propagated through `AsyncLocalStorage` and HTTP request/response headers (`x-correlation-id`).
   - Liveness endpoint (`/api/v1/health`) completely uncoupled from external databases and queues.
   - Readiness endpoint (`/api/v1/readiness`) monitors PostgreSQL (critical), Redis Queue (critical), and Redis Cache (non-critical), returning HTTP 503 on critical dependency failure.

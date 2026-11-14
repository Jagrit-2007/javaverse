# JavaVerse Environment & Runtime Audit

> **Audit Target:** Complete environment variable catalog, configuration validation, secrets management, and runtime orchestration  
> **Schema Authority:** `packages/schemas/src/env.ts` (`EnvSchema`)  
> **Runtime Consumers:** `@javaverse/web`, `@javaverse/worker`, `@javaverse/db`, `@javaverse/security`, `@javaverse/ai`, `@javaverse/sandbox`  

---

## 1. Executive Summary

JavaVerse enforces strict environment contract validation at application startup via `EnvSchema` in `@javaverse/schemas`. If any mandatory variable is missing or malformed, the application throws a structured `ConfigValidationError` and exits before mounting HTTP listeners or starting job workers.

The platform follows a **local-first privacy and isolation model**:
- Every independent clone connects strictly to its own local or self-hosted PostgreSQL database.
- **Zero hardcoded maintainer credentials or remote tracking endpoints** exist in the repository.
- Local Mock AI is the default (`AI_PROVIDER_PRIMARY=mock`), with external providers (`gemini`, `anthropic`) gated behind explicit user consent and strict daily/concurrency limits.
- Container-based sandbox runner remains `REJECTED`, with `SANDBOX_PROVIDER=mock` enforced as the safe default.

---

## 2. Complete Environment Variable Inventory (41 Variables)

| Variable Name | Purpose | Req/Opt | Default Value | Validation Schema | Runtime Consumer | Secret? | In `.env.example` | In CI | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment mode | Optional | `development` | `enum(['development', 'test', 'production'])` | Web, Worker, All | No | Yes | Yes | Active |
| `PORT` | Web server listening port | Optional | `3000` | `coerce.number()` | Next.js Web | No | Yes | No | Active |
| `APP_URL` | Canonical web application URL | Optional | `http://localhost:3000` | `string().url()` | Web (auth, CSP, links) | No | Yes | Yes | Active |
| `DATABASE_URL` | PostgreSQL connection string | **Required** | None | `string().url().min(1)` | Prisma Client (Web, Worker) | **Yes** | Yes | Yes | Active |
| `REDIS_QUEUE_URL` | BullMQ Redis instance URL | **Required** | None | `string().url().min(1)` | BullMQ (Web, Worker) | **Yes** | Yes | Yes | Active |
| `REDIS_CACHE_URL` | Cache/Rate-limit Redis URL | **Required** | None | `string().url().min(1)` | Redis Cache (Web, Worker) | **Yes** | Yes | Yes | Active |
| `SESSION_SECRET` | 32-byte session signing key | **Required** | None | `string().min(32)` | `@javaverse/security` | **Yes** | Yes | Yes | Active |
| `APP_MASTER_KEY` | 32-byte key for TOTP secrets | Optional | None | `string().min(32).optional()` | Web, Security | **Yes** | Yes | Yes | Active |
| `PREVIOUS_APP_MASTER_KEY` | Key rotation standby | Optional | None | `string().min(32).optional()` | Web, Security | **Yes** | Yes | No | Active |
| `CURSOR_SIGNING_SECRET` | SSE cursor signature key | **Required** | None | `string().min(32)` | Web SSE | **Yes** | Yes | Yes | Active |
| `SANDBOX_SHARED_SECRET` | Sandbox token signing key | **Required** | None | `string().min(32)` | Sandbox API | **Yes** | Yes | Yes | Active |
| `MAX_USERS` | Installation account limit | Optional | `5` | `coerce.number().int().positive()` | Web (Signup) | No | Yes | No | Active |
| `REGISTRATION_MODE` | Legacy registration mode | None | Removed | Purged from schema | None | No | No | No | **PURGED** |
| `TRUSTED_PROXY_IPS` | Comma-separated proxy IPs | Optional | `""` | `string()` | Web (Rate limiter) | No | Yes | No | Active |
| `HIBP_ENFORCEMENT_MODE` | Password breach check mode | Optional | `degraded` | `enum(['degraded', 'strict'])` | Web Auth | No | Yes | No | Active |
| `AI_PROVIDER_PRIMARY` | Active AI provider | Optional | `mock` | `enum(['mock', 'anthropic', 'gemini'])` | AI Gateway, Worker | No | Yes | Yes | Active |
| `EXTERNAL_AI_ENABLED` | Global external AI gate | Optional | `false` | `boolean` (transformed) | AI Gateway, Web, Worker | No | Yes | No | Active |
| `AI_PROVIDER_EMBED` | Knowledge embedding model | Optional | `disabled` | `enum(['disabled', 'gemini', 'local'])` | Knowledge Base | No | Yes | No | Active |
| `GEMINI_API_KEY` | Google Gemini API Key | Optional* | None | `string().optional()` (*req if gemini) | `@javaverse/ai` | **Yes** | Yes | No | Active |
| `GEMINI_MODEL` | Google Gemini model name | Optional | `gemini-2.5-flash` | `string()` | `@javaverse/ai` | No | Yes | No | Active |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key | Optional* | None | `string().optional()` (*req if anthropic)| `@javaverse/ai` | **Yes** | Yes | No | Active |
| `ANTHROPIC_MODEL` | Anthropic Claude model name | Optional | `claude-3-5-sonnet-20241022` | `string()` | `@javaverse/ai` | No | Yes | No | Active |
| `AI_DEV_FALLBACK_TO_MOCK` | Fallback to mock on error | Optional | `false` | `boolean` (transformed) | AI Gateway | No | Yes | No | Active |
| `EXTERNAL_AI_DAILY_REQUEST_LIMIT_PER_USER` | Daily limit per account | Optional | `50` | `coerce.number().int().positive()` | Web (`aiLimits.ts`) | No | Yes | No | Active |
| `EXTERNAL_AI_MAX_CONCURRENCY` | Global concurrent requests | Optional | `2` | `coerce.number().int().positive()` | Web, Worker (`aiLimits.ts`)| No | Yes | No | Active |
| `SANDBOX_PROVIDER` | Execution sandbox engine | Optional | `mock` | `enum(['mock', 'container_runner', 'judge0'])` | `@javaverse/sandbox` | No | Yes | Yes | Active |
| `SANDBOX_CONTAINER_RUNNER_URL` | Dedicated VM daemon URL | Optional | None | `string().optional()` | Sandbox (Candidate) | No | Yes | No | Candidate |
| `S3_ENDPOINT` | Private S3 API URL | Optional | `http://127.0.0.1:9000` | `string().url().optional()` | Web, Worker (Attachments) | No | Yes | No | Active |
| `S3_REGION` | S3 bucket region | Optional | `us-east-1` | `string()` | Web, Worker | No | Yes | No | Active |
| `S3_BUCKET` | S3 bucket name | Optional | `javaverse-uploads` | `string()` | Web, Worker | No | Yes | No | Active |
| `S3_ACCESS_KEY` | S3 API Access Key | Optional | `minioadmin` | `string()` | Web, Worker | **Yes** | Yes | No | Active |
| `S3_SECRET_KEY` | S3 API Secret Key | Optional | `minioadmin` | `string()` | Web, Worker | **Yes** | Yes | No | Active |
| `SMTP_HOST` | Transactional email host | Optional | `127.0.0.1` | `string()` | Web (`email.ts`) | No | Yes | Yes | Active |
| `SMTP_PORT` | Transactional email port | Optional | `1025` | `coerce.number()` | Web (`email.ts`) | No | Yes | Yes | Active |
| `SMTP_FROM` | Sender address | Optional | `noreply@javaverse.local` | `string()` | Web (`email.ts`) | No | Yes | Yes | Active |
| `EMAIL_FROM` | Alternate sender address | Optional | `noreply@javaverse.local` | `string()` | Web (`email.ts`) | No | Yes | Yes | Active |
| `SMTP_USER` | SMTP Auth Username | Optional | None | `string().optional()` | Web (`email.ts`) | No | Yes | No | Active |
| `SMTP_PASSWORD` | SMTP Auth Password | Optional | None | `string().optional()` | Web (`email.ts`) | **Yes** | Yes | No | Active |
| `SMTP_SECURE` | SMTP TLS toggle | Optional | `false` | `boolean` (transformed) | Web (`email.ts`) | No | Yes | No | Active |
| `CLAMAV_HOST` | ClamAV daemon host | Optional | `127.0.0.1` | `string()` | Worker (Media scan) | No | Yes | No | Active |
| `CLAMAV_PORT` | ClamAV daemon port | Optional | `3310` | `coerce.number()` | Worker (Media scan) | No | Yes | No | Active |
| `CLAMAV_ENABLED` | ClamAV scanning toggle | Optional | `false` | `boolean` (transformed) | Worker (Media scan) | No | Yes | No | Active |
| `ALLOW_LOCAL_SERVICES_IN_PRODUCTION` | Production local bypass | Optional | None | `string().optional()` | Web, Worker | No | No | Yes | Active |
| `E2E_FIXTURES_ENABLED` | Visual test harness gate | Optional | None | `string().optional()` | Web UI (`dashboardData`) | No | No | No | Active |

---

## 3. Analysis of Critical Variables

### 3.1 `DATABASE_URL` & Database Isolation
- Verified: Both `apps/web` and `apps/worker` connect via `@javaverse/db`.
- Database isolation is strictly enforced by `packages/db/src/safety.ts`. Destructive commands reject `javaverse`, `postgres`, `prod`, `production`, allowing only `javaverse_test`, `javaverse_clean_verify`, `javaverse_backup_verify_test`.
- Clones are completely isolated; all schemas target localhost or operator-configured PostgreSQL.

### 3.2 AI Configuration Contract
- `AI_PROVIDER_PRIMARY` defaults to `'mock'`.
- `EXTERNAL_AI_ENABLED` defaults to `false`. When false, external AI routes cleanly return 403 `EXTERNAL_AI_DISABLED`.
- `GEMINI_API_KEY` and `ANTHROPIC_API_KEY` are validated in `EnvSchema.superRefine()`: if the primary provider is selected without the corresponding key, boot fails immediately with `ConfigValidationError`.
- `EXTERNAL_AI_DAILY_REQUEST_LIMIT_PER_USER` (50) and `EXTERNAL_AI_MAX_CONCURRENCY` (2) protect against API billing overrun.

### 3.3 Sandbox Execution Contract
- `SANDBOX_PROVIDER` defaults to `'mock'`.
- The container-based runner remains `REJECTED`. If an operator specifies `SANDBOX_PROVIDER=container_runner`, `ContainerSandboxClient` validates immutable `@sha256` digest pinning and Java identifier regex, but remains unapproved for production use.

### 3.4 Obsolete & Ambiguous Variables (Resolved)
- **`REGISTRATION_MODE`**: Purged. In `.env.example`, `scripts/generate-env-local.mjs`, `packages/schemas/src/env.ts`, and `turbo.json`, `REGISTRATION_MODE` was removed. The platform uses public local signup up to 5 accounts without registration mode gates.
- Missing AI environment variables (`GEMINI_MODEL`, `ANTHROPIC_MODEL`, `EXTERNAL_AI_ENABLED`, `EXTERNAL_AI_DAILY_REQUEST_LIMIT_PER_USER`, `EXTERNAL_AI_MAX_CONCURRENCY`) have been added to `turbo.json`.

---

## 4. End-to-End Startup Orchestration Audit

### 4.1 Canonical Local Development Flow
```
1. Generate Secrets:      node scripts/generate-env-local.mjs (creates .env.local)
2. Start Docker Services: docker compose -f infra/docker-compose.yml up -d
3. Deploy Migrations:     pnpm --filter @javaverse/db prisma migrate deploy
4. Seed Invariants:       pnpm --filter @javaverse/db prisma db seed
5. Start Applications:    pnpm dev (concurrent Next.js web + tsx worker)
6. Open Browser:          http://localhost:3000
```

### 4.2 `start-dev.sh` Safety and Correctness Audit
- **Path:** [`start-dev.sh`](file:///home/jagrit/Desktop/javaverse/start-dev.sh)
- **Prerequisites Check:** Correctly asserts `docker` and `pnpm` in `PATH`.
- **Infrastructure Startup:** Runs `docker compose -f infra/docker-compose.yml up -d` in detached mode without `-v`. Named volume `javaverse_postgres_data` is preserved across restarts.
- **Process Management:** Runs `pnpm dev` (`turbo run dev`), concurrently starting `apps/web` (Next.js port 3000) and `apps/worker` (`tsx watch src/index.ts`).
- **Data Safety Contract:** Explicitly warns in comments and logs that Ctrl+C stops Node.js processes without destroying PostgreSQL containers or Docker volumes.
- **Verdict on `start-dev.sh`:** **SAFE & CORRECT** for local developer experience.


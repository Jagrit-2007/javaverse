# JavaVerse — Phase 0 Report
**Specification Understanding & Implementation Risk Review**
Date: 2026-10-26 | Spec authority: Part B + Parts G, I–S (Part H retired)

---

## Deliverable 1 — 15-Line Architecture Summary

1. **Product**: JavaVerse — open-source, self-hosted, provider-neutral Java learning platform. Learners upload/paste Java questions; the platform returns explanation, verified solution, interactive visualizations and curriculum.
2. **Monorepo**: pnpm + Turborepo with `apps/web` (Next.js 16.4.x App Router + TypeScript strict), `apps/worker` (BullMQ), and shared packages: `db`, `schemas`, `ai`, `viz`, `security`.
3. **Data layer**: PostgreSQL 17 + pgvector (sole system of record); Prisma ORM + Prisma Migrate; Redis (two separate instances: `REDIS_QUEUE_URL` for BullMQ, `REDIS_CACHE_URL` for ephemeral cache); S3-compatible private storage (MinIO in dev).
4. **Auth**: Custom opaque server-side sessions (Argon2id, Node.js crypto, otplib), invite-only registration, deployment-configured `MAX_USERS=5` reference pilot, `OWNER` + `MEMBER` roles, mandatory owner TOTP.
5. **AI gateway**: Provider-neutral interface (`AIProvider`) with `MockProvider`, `AnthropicProvider`, `GeminiProvider`. `AI_PROVIDER_PRIMARY=mock` through Phases 1–4. `LocalOpenAICompatibleProvider` deferred. No browser-to-model calls.
6. **Sandbox**: `SANDBOX_PROVIDER=mock` until Phase 6 spike passes. Recommended v1 provider: `container_runner` (fresh Eclipse Temurin containers, gVisor-preferred, isolated VM). Judge0 CE 1.13.1 is an optional adapter (GPL-3.0, cgroup-v1/Linux-only constraints).
7. **Java versions supported**: JAVA_8, JAVA_11, JAVA_17, JAVA_21, JAVA_25. Default JAVA_21. Separate pinned digest images — never cross-compile.
8. **Streaming**: SSE only (no WebSockets in v1). Per-user `user_stream_events` table with `stream_seq BIGSERIAL`, snapshot-on-reconnect, heartbeat, max 3 concurrent SSE connections per user.
9. **File handling**: allow-listed types (PNG/JPEG/WebP/PDF/.java/.txt); magic-byte checks; media decoded only in non-root resource-limited worker (not in `apps/web`); ClamAV quarantine; no SVG in v1.
10. **Visualization engine**: JSON-only AI output validated by Zod → whitelisted React components (3D: Three.js + R3F; 2D: D3/SVG; Mermaid strict). Phase 7 delivers 12 launch-critical 2D kinds + 1 signature 3D scene. Full 35-kind target is "Full Blueprint Complete."
11. **Curriculum**: 12 complete lessons across Foundations/OOP/DSA/Advanced Java (Phase 8). 50+ golden eval cases (private repo/encrypted artifact, loaded via `EVAL_DATASET_PATH`).
12. **Security**: OWASP Top 10 + ASVS L2 + LLM Top 10 mapped in `docs/SECURITY.md`/`THREAT_MODEL.md`. Nonce-based CSP, CSRF tokens, per-user scoped queries, upload quarantine, prompt-injection defence, rate-limit token buckets.
13. **Capacity**: `deployment_limits` singleton + `invitations` table + advisory-lock/SERIALIZABLE reservation. `reserved_seats = COUNT(ACTIVE|SUSPENDED|DELETION_PENDING users) + COUNT(PENDING unexpired invitations)`.
14. **Observability**: OpenTelemetry + Pino structured logs; feature flags in PostgreSQL; no third-party session-replay at launch; first-party consent-aware analytics only.
15. **Release stages**: Stage 1 Mock local → Stage 2 five-user hosted pilot → Stage 3 open-source self-hosted BYOK → Stage 4 hosted USER_BYOK (after vault security review) → Stage 5 optional managed plans.

---

## Deliverable 2 — Risk Register (Critical / High / Medium / Low)

### CRITICAL

| ID | Risk | Mitigation from spec |
|----|------|---------------------|
| R-C1 | **Sandbox isolation failure** — untrusted learner code running in the web/worker process or escaping container | OS-level isolation (namespaces, cgroups, seccomp, dropped caps, gVisor); web process never executes code; Phase 6 spike must pass before real users; dedicated VM with no route to DB/secrets |
| R-C2 | **Secret leakage into Git/logs/client bundle** — API keys, session secrets, bootstrap token | gitleaks pre-commit + CI; env-boot validation; Pino redaction rules; CI assertion that no secret enters the client bundle; bootstrap token never in logs/email |
| R-C3 | **Auth bypass / privilege escalation** — parallel seat race, IDOR, cross-user data leakage | SERIALIZABLE/advisory-lock seat count; server-side ownership check on every query; full IDOR automated tests before inviting first non-owner user |
| R-C4 | **Prompt injection from uploaded files** — malicious PDF/image content hijacking model instructions | Per-request CSPRNG-random delimiter wrapping; model given no side-effect tools; Zod output validation; indirect injection treated as untrusted |
| R-C5 | **Bootstrap token exposure** — "first visitor wins" bootstrap pattern | `pnpm bootstrap:owner` CLI-only; token printed once to terminal; HMAC-SHA-256 digest stored; 15-minute TTL; atomically consumed on activation; bootstrap permanently disabled after use |

### HIGH

| ID | Risk | Mitigation |
|----|------|-----------|
| R-H1 | **Judge0/container_runner cgroup-v2 incompatibility** — Phase 6 may be BLOCKED on target Linux host | Pre-Phase-6 feasibility spike on actual target VM; `SANDBOX_PROVIDER=mock` until spike passes; container_runner alternative avoids Judge0 dependency |
| R-H2 | **Image decompression bomb / polyglot payload** — malicious images causing worker OOM or code execution | pixel-count cap, file-size limit, magic-byte check, re-encoding in isolated non-root media worker; web process never decodes images |
| R-H3 | **Token reuse / cross-endpoint token confusion** — invitation token accepted as reset token etc. | Each `email_tokens` row bound to one `purpose`; API rejects valid-hash on wrong endpoint; single-use; constant-time compare |
| R-H4 | **Cross-user KB retrieval / data leakage** — unapproved or another user's content surfacing in shared retrieval | Only `APPROVED` `kb_items` and published lessons enter full-text retrieval; private chats never indexed; consent withdrawal deletes derived items |
| R-H5 | **Dependency supply-chain attack** — malicious package update | pnpm frozen-lockfile; Renovate 7-14 day cooldown; OSV-Scanner + pnpm audit + Semgrep + CodeQL + Trivy in CI; Syft SBOM + Cosign image signing |
| R-H6 | **SSE connection exhaustion** — attacker opening unlimited SSE connections | Hard limit 3 concurrent SSE per user; 429 `SSE_CONNECTION_LIMIT_REACHED`; rate-limit on `/events` endpoint |
| R-H7 | **Provider credential leakage in traces/queue** — API key appearing in job payload or span | Every job carries credential_source ID not the key value; Pino/OTEL redaction removes key-like patterns; workers retrieve key from env only at call time |

### MEDIUM

| ID | Risk | Mitigation |
|----|------|-----------|
| R-M1 | **pnpm / Corepack not bundled on Node 25+** | Explicitly install reviewed Corepack/pnpm version in Dockerfile; do not rely on bundled Corepack |
| R-M2 | **Model ID drift** — hardcoded model IDs become invalid | Model IDs in env only; startup capability-discovery validation; blank in `.env.example` |
| R-M3 | **Redis eviction evicting BullMQ jobs** — single Redis instance with LRU eviction | Two separate Redis instances: `REDIS_QUEUE_URL` (`noeviction`) + `REDIS_CACHE_URL` (bounded eviction) |
| R-M4 | **Golden eval set exposure** — eval cases leaking into RAG or prompts | Loaded only via `EVAL_DATASET_PATH`; stored in private repo/encrypted artifact; access is audit-logged; never in `content/` root |
| R-M5 | **Coffee-cup branding artifact** — Oracle logo resemblance in UI reference image | Part S10 explicitly retires the cup icon; production uses original geometric JavaVerse mark |
| R-M6 | **Argon2id DoS** — hashing used as compute DoS vector | Per-IP + per-account login rate limits before hashing; dummy hash for unknown emails |
| R-M7 | **Content licence ambiguity** — copy from proprietary coding platforms | All lesson/problem content must be original or openly licensed; no LeetCode/HackerRank scraping |
| R-M8 | **WebM recording browser compatibility** — MediaRecorder + captureStream support varies | GIF deferred; WebM behind feature detection; graceful disable on unsupported browsers |
| R-M9 | **CSP and Monaco/Three.js conflict** — unsafe directives needed for editors/3D | Self-host Monaco workers; use `worker-src 'self' blob:`; CSP proven by tests not loosened for Lighthouse |
| R-M10 | **TOTP timestep replay** — accepted code reused within window | `mfa_totp.last_used_timestep` checked; new timestep must be strictly greater |

### LOW

| ID | Risk | Mitigation |
|----|------|-----------|
| R-L1 | Java 25 Temurin image availability | Re-verify Eclipse Temurin 25 images before Phase 6 pin |
| R-L2 | Next.js 16.4.x breaking change vs 15.x patterns | Spec pins to 16.4.1+ security floor; verify App Router compatibility on bootstrap |
| R-L3 | GIF export performance | Deferred to post-v1; WebM ships first |
| R-L4 | Spaced-repetition card quality | Phase 9 scope; generated from learner mistakes, not model-written exercises |
| R-L5 | Open-source licence choice not final | AGPL-3.0 or Apache-2.0 recommended; legal review required before Phase 11 public release |

---

## Deliverable 3 — Conflicts and Authoritative Resolutions

| # | Conflict | Authoritative resolution |
|---|----------|-------------------------|
| C1 | **Part H** contains Phase 9–12 prompts that overlap and in some cases differ from Part C | **S1 + AGENTS.md**: Part H is retired in full. Part C amended by Part S is the sole source of phase prompts. Part H content is superseded. |
| C2 | F2 `.env.example` (partial) vs J16 (partial) vs S11 (full, includes `REDIS_CACHE_URL`, `CURSOR_SIGNING_SECRET`, `SANDBOX_SHARED_SECRET`, etc.) | **S11** is the canonical `.env.example`. F2 and J16 are superseded. |
| C3 | §3.2 "Lite stack" described as an alternative | **S1** retires the Lite stack stub. One production stack authoritative: Next.js/PostgreSQL/Redis/S3/BullMQ/Judge0-optional. |
| C4 | Earlier sections (§12/P1) say "Dark theme is the default" | **S10**: Light is the default first impression for unauthenticated visitors and new accounts. Dark remains selectable. |
| C5 | Boot-time owner creation described as "first visitor wins" in some earlier examples | **S3**: owner bootstrap is CLI-only (`pnpm bootstrap:owner`); never first-HTTP-request; bootstrap token single-use HMAC with 15-minute TTL. |
| C6 | Earlier token endpoints use URL path segment (`/invitations/:token/accept`) | **S4**: raw tokens never in URL path/query. Use fragment (`#token=...`) + JSON POST body. Endpoint becomes `POST /api/v1/invitations/accept` with `{token, name, password}`. |
| C7 | F1 `SANDBOX_PROVIDER=judge0` as first-class default | **S2**: `SANDBOX_PROVIDER=mock` is the default; `container_runner` is the recommended v1 real provider; `judge0` is an optional adapter. |
| C8 | §3.1 redis described as single service for queue + cache | **S8**: Two separate Redis instances required: `REDIS_QUEUE_URL` (`noeviction`) and `REDIS_CACHE_URL` (bounded eviction). Single logical DBs on one process are insufficient. |
| C9 | RPO ≤ 15 min stated in G7 as a baseline target | **S8**: RPO ≤ 15 min applies only to the PITR/WAL-G profile (broader public prod). Self-hosted / five-user Compose profile: daily encrypted `pg_dump`, RPO ≤ 24 h, after restore evidence exists. |
| C10 | `ADMIN` role referenced in Parts A–R | **S4/M1**: Only two v1 roles: `OWNER` and `MEMBER`. All "admin" references in Parts A–R refer to the OWNER interface. |
| C11 | `PENDING_INVITE` listed as a `users.status` value in earlier tables | **S3**: `users.status` is `ACTIVE \| SUSPENDED \| DELETION_PENDING \| DELETED` only. `PENDING_INVITE` is an invitation status, not a user status. |
| C12 | Java versions 8/11/17/21 (§8, J10) vs Java 25 addition | **S2**: Supported targets include JAVA_25. Java 27 is not v1. Default is JAVA_21 or JAVA_25 after sandbox proves support. |
| C13 | §11 CSP: `unsafe-inline` and `unsafe-eval` prohibited; Monaco/Three known to need workers | **S10 + J5**: Use `worker-src 'self' blob:`; self-host Monaco; CSP proven by tests; never weakened for Lighthouse scores. |
| C14 | `POST /api/v1/admin/invitations/:token/accept` (L2) vs body-token approach (S4) | **S4** governs: `POST /api/v1/invitations/accept` with token in JSON body, never in URL. |
| C15 | `email_tokens.purpose` values differ between L3 and S4 | **S4**: canonical set is `OWNER_BOOTSTRAP \| ACCEPT_INVITATION \| VERIFY_EMAIL \| RESET_PASSWORD \| CHANGE_EMAIL`. |

---

## Deliverable 4 — Proposed Assumptions for `docs/DECISIONS.md`

> These are **proposed** assumptions for the owner to ratify before or during Phase 1. None constitutes a decision the agent makes unilaterally.

| ID | Assumption / Decision | Rationale / Source |
|----|----------------------|-------------------|
| D-1 | **pnpm packageManager pinned** to `pnpm@9.x` (latest stable at Phase 1 start). Exact version to be confirmed with `pnpm --version` at Phase 1. | L6, S5, J3 |
| D-2 | **Corepack** will be explicitly installed in Dockerfile (not assumed bundled) given Node 25+ no longer bundles it. | S12 / S5 |
| D-3 | **Sandbox provider for Phases 1–5** = `mock`. Phase 6 spike target = `container_runner` on a dedicated Linux VM. Judge0 evaluated as optional adapter if spike fails feasibility. | S2, K7 |
| D-4 | **Default Java version** = JAVA_21. JAVA_25 support confirmed only after Eclipse Temurin 25 image availability and containment testing in Phase 6 spike. | S2, S12 |
| D-5 | **OpenTelemetry Collector** targeted for Phase 6+ (production observability). Phases 1–5 use structured Pino logs + basic metrics. Full OTEL instrumentation deferred to avoid scope creep in early phases. | G6, J12 |
| D-6 | **Licence choice** deferred to Phase 11. Recommended AGPL-3.0-or-later (server) + CC BY-SA 4.0 (content) pending legal review. | N6, I3 |
| D-7 | **GIF export** deferred post-v1. Phase 7 delivers WebM only via `MediaRecorder + canvas.captureStream`. | S1, J5 |
| D-8 | **pgvector columns** created in Phase 1 schema but nullable/inactive. `AI_PROVIDER_EMBED=disabled` means no embedding jobs enqueued in any phase through v1. | L4, J6, S1 |
| D-9 | **Branding**: original geometric JavaVerse mark (interlocking crystal/code-path spark) replaces coffee-cup icon from the reference image. No resemblance to Oracle cup or Duke. Exact mark designed in Phase 2. | S10 |
| D-10 | **Evaluation dataset** stored as private submodule or encrypted CI artifact, loaded via `EVAL_DATASET_PATH`. Public sample cases (`content/eval-sample`) contain 5 smoke cases only. | S9, G8 |
| D-11 | **Node.js version**: Node 24 LTS (≥ 24.22.1) as initial pin. Node 26 evaluated only after official LTS transition. | S12, J3 |
| D-12 | **Next.js version**: 16.4.1 or later security patch in the 16.4.x reviewed line. Exact patch confirmed at Phase 1 start. | S5, J4, J15 |
| D-13 | **`sharp` floor**: 0.35.5 or later. Enforced via `pnpm` `overrides`/`resolutions` and verified in lockfile + CI image scan. | S5 |
| D-14 | **SSE connection limit** policy: reject excess with 429 (`SSE_CONNECTION_LIMIT_REACHED`). Oldest-connection-replacement policy is an alternative; chosen policy recorded here. | S6 |
| D-15 | **HIBP check failure** degrades safely (does not block signup). Network error logged; user proceeds without breach check, with a warning recorded in audit log. | J8 |

---

## Deliverable 5 — Exact Phase 1 Repository Tree, Dependencies, Services, Files and Commands

### Phase 1 scope (from Part C as amended by S13)
> Corrected schema foundations, environment contract, separate Redis endpoints, bootstrap token schema, user-level SSE event schema. No live auth, no real AI, no real sandbox.

### 5A — Repository tree to be created in Phase 1

```
javaverse/
├── apps/
│   ├── web/                          # Next.js 16.4.x App Router
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx          # Health/landing placeholder
│   │   │   │   └── api/
│   │   │   │       └── v1/
│   │   │   │           └── health/route.ts
│   │   │   ├── env.ts                # T3-env or custom validated env schema
│   │   │   └── middleware.ts
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tsconfig.json
│   └── worker/                       # BullMQ background worker
│       ├── src/
│       │   ├── index.ts              # Worker entrypoint
│       │   └── queues/               # Queue definitions (analysis, cleanup, eval)
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── db/                           # Prisma schema + migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   │       └── 0001_init/
│   │   │           └── migration.sql
│   │   ├── src/
│   │   │   ├── client.ts             # Prisma client singleton
│   │   │   └── seed.ts               # Deterministic dev seed
│   │   └── package.json
│   ├── schemas/                      # Zod schemas (API, jobs, env, viz)
│   │   ├── src/
│   │   │   ├── env.ts
│   │   │   ├── api/
│   │   │   └── jobs/
│   │   └── package.json
│   ├── ai/                           # Gateway interface + MockProvider stub
│   │   ├── src/
│   │   │   ├── gateway.ts            # AIProvider interface
│   │   │   └── providers/
│   │   │       └── mock.ts
│   │   └── package.json
│   ├── viz/                          # Visualization registry stub
│   │   └── package.json
│   └── security/                     # CSP, CSRF, rate-limit, password helpers
│       ├── src/
│       │   ├── csp.ts
│       │   ├── csrf.ts
│       │   ├── rateLimit.ts
│       │   └── password.ts
│       └── package.json
├── sandbox/                          # SandboxClient interface + mock impl
│   └── src/
│       └── client.ts
├── ml/                               # Empty Python scaffold (offline only)
│   └── .gitkeep
├── content/
│   └── eval-sample/                  # 5 public smoke cases only
│       └── .gitkeep
├── infra/
│   ├── docker-compose.yml
│   └── .github/
│       └── workflows/
│           ├── ci.yml                # format, lint, typecheck, unit, gitleaks, osv
│           └── codeql.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md                   # Stub (full in Phase 11)
│   ├── THREAT_MODEL.md               # Stub
│   ├── API.md                        # Stub
│   ├── DECISIONS.md
│   ├── PROGRESS.md
│   ├── RISK_REGISTER.md
│   ├── RUNBOOK.md                    # Stub
│   ├── BLUEPRINT.docx                # Already present
│   └── design/
│       └── javaverse-approved-ui-direction.jpeg  # Already present
├── .env.example                      # S11 canonical, placeholders only
├── .gitignore
├── .gitleaksrc.toml
├── package.json                      # Root: packageManager, scripts, engines
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .eslintrc.cjs (or eslint.config.mjs)
├── .prettierrc
├── AGENTS.md                         # Already present
├── PROJECT_SPEC.md                   # Already present
└── README.md
```

### 5B — Core Prisma schema tables (Phase 1)

Phase 1 must implement migrations for (at minimum):

| Table | Key constraints |
|-------|----------------|
| `deployment_limits` | singleton `id`, `max_users DEFAULT 5`, `updated_by` |
| `users` | `email citext UNIQUE`, `password_hash`, `role OWNER\|MEMBER`, `status ACTIVE\|SUSPENDED\|DELETION_PENDING\|DELETED`, `email_verified_at`, `consent_improve DEFAULT false` |
| `invitations` | `token_hash`, `status PENDING\|ACCEPTED\|REVOKED\|EXPIRED`, partial UNIQUE on `(email_normalized) WHERE status='PENDING'` |
| `email_tokens` | `purpose OWNER_BOOTSTRAP\|ACCEPT_INVITATION\|VERIFY_EMAIL\|RESET_PASSWORD\|CHANGE_EMAIL`, `token_hash`, `otp_hash`, `expires_at`, `used_at`, `attempts` |
| `sessions` | `id = SHA-256(cookie)`, `mfa_verified_at`, `reauth_at`, `revoked_at` |
| `mfa_totp` | `secret` (AES-256-GCM encrypted), `last_used_timestep`, `created_at` |
| `recovery_codes` | `code_hash`, `used_at` |
| `chats` | `user_id`, `slot SMALLINT CHECK(slot BETWEEN 1 AND 3)`, `UNIQUE(user_id, slot)` |
| `chat_state` | `chat_id`, `ui_state JSONB`, `updated_at` |
| `messages` | `chat_id`, `role`, `content`, `status`, `parent_id` |
| `attachments` | `message_id`, `storage_key`, `mime`, `size`, `sha256`, `scan_status` |
| `analyses` | `message_id`, `result JSONB`, `prompt_version`, `model`, `verification_status` |
| `executions` | `user_id`, `code_hash`, `status`, `stdout`, `stderr`, `time_ms`, `memory_kb` |
| `feedback` | `UNIQUE(user_id, message_id)`, `vote`, `reasons[]`, `comment` |
| `kb_items` | `search_document tsvector`, `embedding VECTOR(1536) NULL`, `status CANDIDATE\|APPROVED\|REJECTED`, `source_user_id NULL`, `contributor_pseudonym`, `consent_version` |
| `user_stream_events` | `stream_seq BIGSERIAL PK`, `user_id`, `chat_id`, `job_id`, `job_event_seq`, `event_type`, `payload JSONB`, `created_at` |
| `durable_jobs` | `status`, `stage`, `attempts`, `max_attempts`, `dedupe_key`, `lease_owner`, `lease_expires_at`, `progress`, `created_at`, `started_at`, `finished_at` |
| `idempotency_records` | `key`, `principal_id`, `route`, `request_hash`, `response JSONB`, `expires_at` |
| `audit_logs` | `actor_user_id NULL FK ON DELETE SET NULL`, `actor_pseudonym`, `actor_type USER\|SYSTEM`, `actor_role_at_time`, `action`, `target_metadata JSONB`, `occurred_at` |
| `lessons`, `quizzes`, `problems` | Stubs with author/source/licence/review metadata fields |
| `progress`, `xp_events`, `badges` | Stubs |
| `eval_cases`, `eval_runs`, `prompt_versions`, `usage_events` | Stubs |

### 5C — Docker Compose services (Phase 1)

```yaml
services:
  postgres:    # PostgreSQL 17.x with pgvector extension enabled
  redis-queue: # Redis (noeviction policy) — REDIS_QUEUE_URL
  redis-cache: # Redis (bounded LRU policy) — REDIS_CACHE_URL
  minio:       # S3-compatible private object storage
  mailpit:     # Local SMTP + web UI
  clamav:      # Malware scanner (daemon mode)
  # Judge0 NOT added in Phase 1
```

### 5D — Key runtime dependencies (Phase 1 additions)

| Package | Purpose | Justification |
|---------|---------|---------------|
| `next@16.4.x` | Web framework | Normative (J4, S5) |
| `react`, `react-dom` | UI runtime | Required by Next.js |
| `typescript` | Language | Normative (J2) |
| `@prisma/client` + `prisma` | ORM + migrations | Normative (J6) |
| `zod` | Runtime validation | Normative (J4, §6) |
| `bullmq` | Job queues | Normative (J6) |
| `ioredis` | Redis client | Required by BullMQ |
| `argon2` | Argon2id hashing | Normative (J8, §11.1) |
| `otplib` | TOTP | Normative (J8) |
| `pino` + `pino-pretty` | Structured logging | Normative (J12) |
| `ulid` | Application-visible IDs | Normative (G1, J4) |
| `@t3-oss/env-nextjs` or custom | Env validation at boot | §11.7, S11 |
| `sharp@≥0.35.5` | Image processing (media worker only) | S5; floor enforced via overrides |
| `vitest` | Unit tests | Normative (J11) |
| `eslint` + `prettier` | Code quality | Normative (J11) |
| `gitleaks` | Secret scanning | Normative (J11) |
| `@osv-scanner/osv-scanner` or CLI | Dependency vulnerability scan | Normative (J11) |
| `turbo` | Monorepo task orchestration | Normative (J3) |

### 5E — Phase 1 commands

```bash
# 0. Prerequisites (human installs, not agent)
node --version   # must be 24.x LTS ≥ 24.22.1
pnpm --version   # 9.x from Corepack or explicit install

# 1. Bootstrap monorepo
pnpm install --frozen-lockfile

# 2. Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# 3. Apply migrations + seed
pnpm --filter @javaverse/db migrate:dev
pnpm --filter @javaverse/db seed

# 4. Start dev servers
pnpm dev   # (turbo dev — runs web + worker in parallel)

# 5. Verify health
curl http://localhost:3000/api/v1/health   # → 200 {"data":{"status":"ok",...}}

# 6. Canonical checks (all must pass before reporting complete)
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test

# 7. Secret scan
gitleaks detect --source . --verbose

# 8. Dependency vulnerability scan
pnpm audit
osv-scanner scan --lockfile=pnpm-lock.yaml
```

### 5F — Phase 1 branch
```
git checkout -b phase/01-foundation
```

---

## Deliverable 6 — What Cannot Be Verified on This Machine

| # | Item | Reason |
|---|------|--------|
| V-1 | **Sandbox containment** (container_runner / Judge0 cgroup behaviour) | Requires a dedicated Linux VM with Docker + gVisor; cannot run on Windows/macOS Docker Desktop. Phase 6 feasibility spike required. |
| V-2 | **Eclipse Temurin Java 25 image availability** | Must be re-checked at Phase 6 time against official Adoptium registry. |
| V-3 | **Anthropic / Gemini model IDs and structured-output compatibility** | Model IDs change; capability must be validated via `listModels()` at Phase 5 with live credentials. |
| V-4 | **HIBP k-anonymity API reachability** | Network-dependent; HIBP outage must degrade safely without blocking signup. |
| V-5 | **ClamAV scanning latency under load** | Must be load-tested after docker compose is running with real representative files. |
| V-6 | **Lighthouse / axe scores** | Require a running browser and build; Phase 2 deliverable. |
| V-7 | **k6 load smoke results** | Require running infrastructure; Phase 4+ deliverable. |
| V-8 | **Email delivery via SES / DKIM** | Deferred to remote-tester/public-beta gate; Mailpit only in Phase 1–4. |
| V-9 | **Backup restoration** | Must be tested on actual Postgres instance; documented in Phase 11. |
| V-10 | **Next.js 16.4.x breaking changes vs 15.x** | Must be verified when exact package version is resolved at Phase 1 bootstrap. |
| V-11 | **pnpm / Corepack exact version compatibility on host** | Depends on developer machine; pinned in `package.json#packageManager`. |
| V-12 | **Legal/licence review** | External; must be completed before Phase 11 public release. |
| V-13 | **Privacy/Terms compliance** (India DPDP, GDPR, CCPA) | External legal review; pre-public-beta gate. |
| V-14 | **ZAP baseline scan results** | Requires running staging environment; Phase 11. |
| V-15 | **Golden eval set correctness** | Requires human Java educator review; Phase 8 + 10 content gate. |

---

## Deliverable 7 — Phase 1 Acceptance Checklist

All items must **PASS** before the Phase 1 report can be marked **PASS**.

### Infrastructure & environment
- [ ] `docker compose up -d` starts all 6 services (postgres, redis-queue, redis-cache, minio, mailpit, clamav) without errors
- [ ] `GET /api/v1/health` returns HTTP 200 with all service connectivity checks

### Database & migrations
- [ ] Migrations apply cleanly on a fresh database (`pnpm migrate:dev` passes)
- [ ] All tables listed in §5B exist with correct constraints, indexes and check conditions
- [ ] `UNIQUE(user_id, slot)` and `slot BETWEEN 1 AND 3` CHECK constraint verified via `\d` or migration SQL
- [ ] `deployment_limits` singleton row seeded with `max_users=5`
- [ ] `pgvector` extension enabled; `embedding VECTOR(1536) NULL` column present in `kb_items` and inactive

### Environment validation
- [ ] App fails to start with placeholder secrets (e.g. `SESSION_SECRET=replace_with_32_byte_random_hex`)
- [ ] App fails to start with localhost-only assumptions when `NODE_ENV=production`
- [ ] `.env.example` matches S11 canonical structure exactly; `.env.local` is in `.gitignore` and absent from repo

### Code quality (all exit 0)
- [ ] `pnpm format:check`
- [ ] `pnpm lint` (no errors, no disabled rules for non-documented reasons)
- [ ] `pnpm typecheck` (TypeScript strict mode, no `any` suppressions)
- [ ] `pnpm test` — unit tests for: Argon2id hash/verify, CSPRNG token generation, ULID format, Zod schema validation (env + API contracts), `UNIQUE(user_id, slot)` constraint logic stub

### Security
- [ ] `gitleaks detect` — zero findings
- [ ] `pnpm audit` + `osv-scanner` — zero critical/high unmitigated findings
- [ ] `sharp@≥0.35.5` resolved version confirmed in lockfile and `pnpm ls sharp`
- [ ] No secrets in `apps/web` build output (assert via `pnpm build` + grep for key patterns)
- [ ] `AI_PROVIDER_PRIMARY=mock` is the only provider active; `AI_PROVIDER_EMBED=disabled`

### Repository hygiene
- [ ] `pnpm-lock.yaml` committed; `package.json#packageManager` pinned
- [ ] No `node_modules`, `.env.local`, `*.db`, database dumps or uploads in Git history
- [ ] `AGENTS.md`, `PROJECT_SPEC.md`, `docs/design/javaverse-approved-ui-direction.jpeg`, `docs/BLUEPRINT.docx` all present and readable
- [ ] `docs/PROGRESS.md`, `docs/DECISIONS.md`, `docs/RISK_REGISTER.md` updated with Phase 1 outcomes

### CI
- [ ] GitHub Actions `ci.yml` runs on push/PR: format, lint, typecheck, unit tests, gitleaks, osv-scanner — all green
- [ ] No secrets in CI environment except repo-level secrets injected via GitHub Secrets

### Confirmed operating direction
- [ ] `REGISTRATION_MODE=invite_only`, `MAX_USERS=5`, `CREDENTIAL_MODE=local_environment`, `AI_PROVIDER_PRIMARY=mock`, `SANDBOX_PROVIDER=mock` all confirmed in `.env.example` and validated at boot

---

## Operating Direction Confirmation

Confirmed per Part C (amended by S13) and AGENTS.md:

| Item | Status |
|------|--------|
| Open-source, self-hosted, BYOK-first architecture | ✅ Confirmed |
| Mock provider for Phases 1–4 | ✅ Confirmed (`AI_PROVIDER_PRIMARY=mock`) |
| Anthropic + Gemini adapters shipped in Phase 5 | ✅ Confirmed |
| Five-user cap for the reference **hosted** security pilot only | ✅ Confirmed (not an OSS licence limit) |
| `MAX_USERS` configurable by self-hosted operators | ✅ Confirmed |
| Part H is retired | ✅ Confirmed — Part C amended by Part S is the sole phase-prompt source |
| Part S identified as normative override | ✅ Confirmed — present, read and applied throughout this report |
| Spec export used: Part B + Parts G, I–S | ✅ Confirmed — BLUEPRINT.docx contains all required parts |
| Hosted USER_BYOK storage outside v1 | ✅ Confirmed |
| `SANDBOX_PROVIDER=mock` until Phase 6 feasibility spike passes | ✅ Confirmed |

---

> **Do not begin Phase 1. Awaiting owner review.**

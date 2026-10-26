# JavaVerse

JavaVerse is an open-source, self-hosted, provider-neutral Java learning platform.

## Architecture

JavaVerse is structured as a pnpm + Turborepo monorepo:

- `apps/web`: Next.js 16.4.x App Router web application
- `apps/worker`: BullMQ background job processing worker
- `packages/db`: PostgreSQL 17 + pgvector Prisma ORM schemas, migrations, and seeds
- `packages/schemas`: Shared Zod schemas for runtime environment and DTO contracts
- `packages/security`: Secret redaction, domain-separated token hashing, safe error formatting
- `packages/observability`: Structured Pino logging, correlation context, request tracing
- `packages/ai`: Provider-neutral AI gateway with deterministic mock provider
- `sandbox`: Provider-neutral execution sandbox interface with deterministic mock runner

## Local Development Setup

### 1. Prerequisites

- Node.js 24 LTS (`>=24.22.1`)
- pnpm 12 (`>=12.15.0`)
- Docker Engine & Docker Compose

### 2. Generate Local Secrets

```bash
node scripts/generate-env-local.mjs
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Start Infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 5. Apply Migrations & Seed

```bash
pnpm --filter @javaverse/db prisma migrate dev
pnpm --filter @javaverse/db prisma db seed
```

### 6. Run Checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

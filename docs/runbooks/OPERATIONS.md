# JavaVerse Production Operations & Runbooks

This document provides authoritative operational runbooks for self-hosting, operating, maintaining, and recovering a production JavaVerse deployment.

---

## 1. System Architecture Overview

```
                      Internet / Learner Browser
                                 │
                                 ▼
                     [ Reverse Proxy / TLS ]
                                 │
                                 ▼
                ┌──────────────────────────────────┐
                │   JavaVerse Web App (Next.js)    │
                │  - Auth, Sessions, CSRF, CSP     │
                │  - REST APIs, SSE Streams        │
                │  - Dynamic Nonce Generation      │
                └───────────┬──────────────┬───────┘
                            │              │
              ┌─────────────┘              └─────────────┐
              ▼                                          ▼
┌───────────────────────────┐              ┌───────────────────────────┐
│     PostgreSQL 17         │              │      Redis 7 Instances    │
│  - citext, pgvector       │              │  - Queue: AOF + noeviction│
│  - Relational & Analytics │              │  - Cache: volatile-lru    │
└───────────────────────────┘              └─────────────┬─────────────┘
                                                         │
                                           ┌─────────────┴─────────────┐
                                           │   JavaVerse Worker (Node) │
                                           │  - Durable Async Jobs     │
                                           │  - Lease Renewal & Heartbeat│
                                           └─────────────┬─────────────┘
                                                         │
                                           ┌─────────────┴─────────────┐
                                           │ Java 21 Sandbox Container │
                                           │  - eclipse-temurin:21     │
                                           │  - non-root, read-only    │
                                           │  - --network none         │
                                           └───────────────────────────┘
```

---

## 2. Database Backup & Disaster Recovery

### 2.1 Automated Routine Backup

Backups are produced using PostgreSQL `pg_dump`, compressed via `gzip`, and verified with SHA-256 integrity checksums.

```bash
# Execute standard backup (defaults to ./backups directory)
bash scripts/backup-db.sh ./backups

# Environment variables for custom target:
POSTGRES_CONTAINER=javaverse-postgres POSTGRES_DB=javaverse POSTGRES_USER=javaverse bash scripts/backup-db.sh /var/backups/javaverse
```

Output:

- Archive: `javaverse_backup_YYYYMMDD_HHMMSS.sql.gz`
- Checksum: `javaverse_backup_YYYYMMDD_HHMMSS.sql.gz.sha256`

### 2.2 Point-in-Time & Emergency Restore

To restore an existing backup into the active or standby database:

```bash
# Verify checksum and restore
bash scripts/restore-db.sh ./backups/javaverse_backup_20261105_205913.sql.gz javaverse
```

The restore script automatically:

1. Verifies SHA-256 checksum integrity against `.sha256` if present.
2. Ensures required extensions (`citext`, `vector`) exist.
3. Restores schema, constraints, indices, and data without permission errors.

### 2.3 Automated Disaster Recovery Drill

Verify backup and restore end-to-end against an isolated test database:

```bash
pnpm test:backup-restore
```

This automated drill backs up live tables, drops/creates an isolated test database, restores the snapshot, and executes deep assertion checks to verify 100% data fidelity.

---

## 3. Secret & Credential Rotation Runbook

### 3.1 `SESSION_SECRET` (Cookie Signing & Encryption)

- **Impact**: Rotating `SESSION_SECRET` immediately invalidates all active user browser sessions, requiring users to log in again.
- **Rotation Procedure**:
  1. Generate a new 64-character hex secret: `openssl rand -hex 32`.
  2. Update `SESSION_SECRET` in production `.env.local` or environment vault.
  3. Deploy web application instances simultaneously.
  4. Notify learners of scheduled logout.

### 3.2 `APP_MASTER_KEY` (Database Field-Level Encryption)

- **Impact**: Encrypts sensitive fields (TOTP secrets, email tokens, external provider tokens).
- **Rotation Procedure**:
  1. If rotating, run the key re-encryption migration script to decrypt existing ciphertexts with `APP_MASTER_KEY_OLD` and re-encrypt with `APP_MASTER_KEY_NEW`.
  2. Set `APP_MASTER_KEY` to the new secret and remove the old key.

### 3.3 `SANDBOX_SHARED_SECRET` (Worker-to-Sandbox RPC Auth)

- **Impact**: Authenticates execution requests between worker and sandbox.
- **Rotation Procedure**:
  1. Generate a new 64-character hex secret.
  2. Update both worker and sandbox configurations.
  3. Restart sandbox container, then restart worker.

---

## 4. Worker & Job Queue Operations

### 4.1 Queue Monitoring

- Redis Queue URL: `redis://127.0.0.1:6379`
- Key prefixes: `bull:javaverse-jobs:*`
- Inspection:
  ```bash
  docker exec -it javaverse-redis-queue redis-cli INFO memory
  docker exec -it javaverse-redis-queue redis-cli LLEN "bull:javaverse-jobs:wait"
  ```

### 4.2 Graceful Worker Shutdown

The worker handles `SIGTERM` and `SIGINT`:

1. Pauses receiving new jobs from Redis.
2. Completes active in-flight jobs within a 30-second grace window.
3. Releases job leases and closes Redis connections.
4. Exits with code 0.

### 4.3 Stale Job Recovery

- Jobs have active heartbeat leases (30s interval).
- If a worker crashes, the supervisor reclaims jobs whose lease has lapsed (> 60s) and reschedules or fails them cleanly.

---

## 5. Security & Isolation Invariants

1. **Java Execution Sandbox**:
   - Pinned image: `eclipse-temurin:21-alpine`.
   - Dedicated non-root UID/GID: `10001:10001`.
   - Root filesystem mounted strictly `--read-only`.
   - Network fully disabled: `--network none`.
   - Security options: `--security-opt no-new-privileges:true`.
   - Resource ceilings: Memory max 512MB, Swap 0, PIDs limit 64, CPU quota 1.0 core.
   - Wall-clock timeout: 10 seconds hard kill.

2. **Web Application Hardening**:
   - Content Security Policy (CSP): Dynamic per-request cryptographically secure nonce on all script tags.
   - CSRF: Origin and Sec-Fetch-Site verification on all mutative routes.
   - Admin RBAC: All `/api/v1/admin/*` and `/dashboard/admin` routes require verified user with `role = 'OWNER'`.
   - PII Scrubbing: User questions scrubbed for emails, IP addresses, URLs, phone numbers, file paths, and tokens before entry into the knowledge base pipeline.

---

## 6. Incident Response & Troubleshooting

| Symptom                                     | Likely Root Cause                             | Remediation Step                                                                                            |
| :------------------------------------------ | :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **HTTP 503 on `/api/v1/readiness`**         | PostgreSQL or Redis unreachable               | Run `docker compose ps` to inspect service states. Check database logs with `docker compose logs postgres`. |
| **HTTP 429 `SSE_CONNECTION_LIMIT_REACHED`** | User opened > 3 concurrent SSE streams        | Verify user client tabs; recommend closing inactive tabs or investigate stale SSE connections.              |
| **Sandbox Execution Timeout**               | Infinite loop or heavy recursion in user code | Expected safety behavior. Sandbox returns `STATUS: TIMEOUT` after 10s.                                      |
| **Worker High Memory Usage**                | Excessive concurrent job backlog              | Check Redis queue size; scale worker replicas or verify concurrency limits in worker configuration.         |
| **PostgreSQL Pool Saturation**              | Connection leak or unindexed query            | Inspect `pg_stat_activity`. Ensure all database queries run through connection-pooled Prisma clients.       |

# JavaVerse Project Dossier & Alignment Audit — Report Index

> **Audit Date:** November 10, 2026  
> **Target Branch:** `fix/phases-4-11-owner-audit` (`HEAD: 5207257`)  
> **Working Tree Status:** Remediation Applied & Verified (all changes unstaged for final maintainer review)  
> **Operating Mode:** Authoritative Post-Remediation Baseline & Project Dossier  

---

## 1. Executive Summary

This audit establishes the definitive baseline of the **JavaVerse** codebase following the implementation of the single-learner-account model, credential freedom, transparent AI limits, local database isolation safeguards, and the comprehensive final repository remediation.

JavaVerse is **source-visible and preparing for open-source release**, architected as a local-first Java learning platform for local deployment. It operates with a strict limit of five accounts per local installation, public local registration with no bootstrap tokens or invitations, uniform learner permissions across all accounts, and installation-specific PostgreSQL and Redis backing services. It runs in **Local Mock AI mode by default** (`AI_PROVIDER_PRIMARY=mock`, `SANDBOX_PROVIDER=mock`) with optional, transparent integrations for Gemini or Anthropic that require explicit per-session user consent and clear visual labelling. It is **not currently approved for public multi-tenant production hosting**, and its container-based sandbox runner remains **REJECTED** pending dedicated security containment review.

This dossier indexes ten comprehensive, deeply evidentiary reports located under `docs/reviews/project-dossier/` covering every tracked file, route, database migration, environment variable, test suite, and operational risk.

---

## 2. Dossier Deliverables Directory

| Deliverable | File Path | Focus Area | Status |
| :--- | :--- | :--- | :--- |
| **Index** | [`REPORT_INDEX.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/REPORT_INDEX.md) | Navigation index, audit methodology, executive synthesis | **Complete · Remediated** |
| **Report 1** | [`JAVAVERSE_PROJECT_DOSSIER.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/JAVAVERSE_PROJECT_DOSSIER.md) | Authoritative 50-section technical and architectural specification | **Complete · Remediated** |
| **Report 2** | [`REPOSITORY_FILE_INVENTORY.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/REPOSITORY_FILE_INVENTORY.md) | Comprehensive repository catalog with categories, ownership, and recommendations | **Complete · Remediated** |
| **Report 3** | [`STALE_AND_CONTRADICTORY_CONTENT_AUDIT.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/STALE_AND_CONTRADICTORY_CONTENT_AUDIT.md) | Keyword audit and resolved contradiction analysis | **Complete · Remediated** |
| **Report 4** | [`ROUTE_AND_API_INVENTORY.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/ROUTE_AND_API_INVENTORY.md) | 25 pages, 49 API route files (56 HTTP methods), auth, CSRF, and rate limits | **Complete · Remediated** |
| **Report 5** | [`DATABASE_AND_MIGRATION_AUDIT.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/DATABASE_AND_MIGRATION_AUDIT.md) | Prisma schema, 6 migrations in sequence, single-learner migration analysis | **Complete · Remediated** |
| **Report 6** | [`ENVIRONMENT_AND_RUNTIME_AUDIT.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/ENVIRONMENT_AND_RUNTIME_AUDIT.md) | 40 env vars, startup flows, Docker services, Redis keys, `start-dev.sh` audit | **Complete · Remediated** |
| **Report 7** | [`TEST_AND_CI_COVERAGE_MAP.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/TEST_AND_CI_COVERAGE_MAP.md) | Unit, integration, E2E test inventory, CI pipeline alignment, DB safety guard | **Complete · Remediated** |
| **Report 8** | [`OPEN_SOURCE_READINESS_AUDIT.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/OPEN_SOURCE_READINESS_AUDIT.md) | Open-source licensing (missing LICENSE), governance, security disclosures | **Complete · Remediated** |
| **Report 9** | [`REMEDIATION_BACKLOG.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/REMEDIATION_BACKLOG.md) | Prioritized remediation backlog: REM-02–REM-14 resolved; REM-01 pending maintainer choice | **Complete · Remediated** |

---

## 3. High-Level Summary of Audit Findings & Remediation

### 3.1 Repository Scale & Health
- **Code Quality:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck` pass with zero errors.
- **Test Suite:** 53 Vitest test files (189 web tests including 24 repository alignment tests + schemas, security, observability, ai, sandbox tests) pass 100% on isolated test databases.
- **Database & Disaster Recovery:** `pnpm test:clean-db` and `pnpm test:backup-restore` pass 100% with byte-level checksum and record-count fidelity.
- **Build Reproducibility:** `pnpm build` is deterministic and leaves zero dirty git diff; verified via `pnpm verify:static-hashes`.

### 3.2 Key Architectural Alignments Achieved
1. **Single-Account Model:** The live database schema (`packages/db/prisma/schema.prisma`) has zero `role` column, zero `invitations` table, and zero bootstrap tokens. Migration `20261109210000_single_learner_account_model` safely migrated legacy roles to uniform accounts without data loss.
2. **Local Account Limit:** Hard limit of 5 active accounts per installation enforced atomically via PostgreSQL transaction advisory lock (`ACCOUNT_CREATION_ADVISORY_LOCK_ID = 74619284`) during signup.
3. **Transparent AI Policy:** Server defaults strictly to `AI_PROVIDER_PRIMARY=mock`. When external AI is configured, daily request limits (50/day per user) and global concurrency limits (2 concurrent) are enforced via Redis, and token displays explicitly declare `Local Mock · No external token usage` when mock execution is active.
4. **Database Guardrails:** `packages/db/src/safety.ts` strictly rejects destructive operations (`drop`, `truncate`, `migrate reset`) against `javaverse`, enforcing allowlisted test databases (`javaverse_test`, `javaverse_clean_verify`, `javaverse_backup_verify_test`).

### 3.3 Post-Remediation Resolution Status
1. **REM-01 (Missing `LICENSE` File) — PENDING MAINTAINER DECISION:** Documented as P0 blocker for open-source release; does not block internal technical merge. The project is explicitly designated as "source-visible and preparing for open-source release".
2. **REM-02 (Dead `bootstrap:owner` Script) — RESOLVED:** Removed from `package.json`.
3. **REM-03 (Stale Email Helpers) — RESOLVED:** Refactored `sendOwnerVerificationEmail` to `sendVerificationEmail` with neutral copy; deleted `sendMemberInvitationEmail`.
4. **REM-04 (Inactive `REGISTRATION_MODE`) — RESOLVED:** Purged from `.env.example`, `scripts/generate-env-local.mjs`, `packages/schemas/src/env.ts`, `turbo.json`.
5. **REM-05 (Sandbox Container Contradictions) — RESOLVED:** Harmonized `docs/DECISIONS.md`, `docs/RISK_REGISTER.md`, `docs/runbooks/OPERATIONS.md`, and `sandbox/src/factory.ts`.
6. **REM-06 (Stale Administrator Copy on Suspended Page) — RESOLVED:** Updated `suspended/page.tsx` with neutral platform operator copy.
7. **REM-07 (Static Hashes Dirtied on Build) — RESOLVED:** Added alphabetical sorting and equality checks to `extract-static-hashes.mjs`, deleted redundant `static-hashes.json`, added `verify:static-hashes`.
8. **REM-08 (CI Pipeline Expansion) — RESOLVED:** Added clean DB verification, backup-restore drill, MinIO service container, and Playwright E2E browser tests to `.github/workflows/ci.yml`.
9. **REM-09 (Stale Notes Preview Shell) — RESOLVED:** Updated `/dashboard/notes` to Outcome B feature preview shell with neutral messaging.
10. **REM-10 (Operations Guide Refactor) — RESOLVED:** Rewritten as *JavaVerse Self-Hosting & Local Operations Guide* with non-production disclaimers.
11. **REM-12 (Missing AI Env Vars in `turbo.json`) — RESOLVED:** Added all 5 missing vars to `turbo.json`.
12. **REM-13 (Dead `.invitationList` Selector) — RESOLVED:** Cleaned from `SecuritySettings.module.css`.
13. **REM-14 (`PROJECT_SPEC.md` Authoritative Spec) — RESOLVED:** Transformed into comprehensive navigation index linking to dossier reports and decision records.

---

## 4. Recommended Reading Sequence

For reviewers, maintainers, and auditors, review the reports in the following sequence:

1. **Orientation:** Read this index ([`REPORT_INDEX.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/REPORT_INDEX.md)) for scope and executive findings.
2. **Core Specification:** Read [`JAVAVERSE_PROJECT_DOSSIER.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/JAVAVERSE_PROJECT_DOSSIER.md) for the 50-section technical reference of how JavaVerse currently works.
3. **Discrepancy Analysis:** Read [`STALE_AND_CONTRADICTORY_CONTENT_AUDIT.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/STALE_AND_CONTRADICTORY_CONTENT_AUDIT.md) to inspect every occurrence of superseded terminology and conflicting claims.
4. **Data & Routing:** Review [`ROUTE_AND_API_INVENTORY.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/ROUTE_AND_API_INVENTORY.md) and [`DATABASE_AND_MIGRATION_AUDIT.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/DATABASE_AND_MIGRATION_AUDIT.md).
5. **Runtime & Open Source:** Review [`ENVIRONMENT_AND_RUNTIME_AUDIT.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/ENVIRONMENT_AND_RUNTIME_AUDIT.md) and [`OPEN_SOURCE_READINESS_AUDIT.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/OPEN_SOURCE_READINESS_AUDIT.md).
6. **Testing & Action Plan:** Review [`TEST_AND_CI_COVERAGE_MAP.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/TEST_AND_CI_COVERAGE_MAP.md) and execute the remediation plan in [`REMEDIATION_BACKLOG.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/REMEDIATION_BACKLOG.md).


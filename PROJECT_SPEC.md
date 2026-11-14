# JavaVerse Project Specification Index (Historical Record)

> [!IMPORTANT]
> **Historical Record.** This document is a historical specification index describing earlier development phases and milestones. It is **not** the current authoritative product specification.
>
> The authoritative, comprehensive current technical and product specification is maintained in the **JavaVerse Project Dossier**:
> [`docs/reviews/project-dossier/JAVAVERSE_PROJECT_DOSSIER.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/JAVAVERSE_PROJECT_DOSSIER.md)
>
> For overall audit results, consult [`docs/reviews/project-dossier/REPORT_INDEX.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/REPORT_INDEX.md).

---

## Historical Specification Parts Index

During early implementation phases (Phases 0 through 3), the project was organized into the following specification parts:

- **Part B — Architecture & Monorepo Structure:** Pinned tooling, workspace package topology (`@javaverse/*`), and directory layout.
- **Part G — Data Models & Storage:** PostgreSQL database schemas, Prisma migrations, and durable job queues.
- **Part I — Authentication & Session Management:** Argon2id credential hashing, HTTP-only session cookies, and multi-factor authentication (MFA/TOTP).
- **Part J — Curricular Knowledge Base & Content:** Java 21 visual lessons, challenges, and mastery tracking.
- **Part K — Practice Engine & Code Execution:** Interactive Java execution via Local Mock and sandbox interfaces.
- **Part L — AI Gateway & Chat Operations:** Ask JavaVerse AI tutoring, model selection, external-AI consent, and token usage accounting.
- **Part M — Security Architecture & Boundaries:** Content Security Policy (CSP), CSRF validation, rate limiting, and quarantined upload processing.
- **Part N — Media Processing & File Quarantining:** Image and code upload sanitization, ClamAV integration, and S3-compatible storage.
- **Part O — Analytics, Observability & Structured Logging:** OpenTelemetry, correlation ID propagation, and security audit logs.
- **Part P — Automated Verification & Testing Strategy:** Vitest unit/integration testing, isolated test databases, and Playwright browser verification.
- **Part Q — Operational Procedures & Local Runbooks:** Self-hosting deployment, backup creation, and database restore drills.
- **Part R — Design System & Learner User Interface:** Modern accessible learning UI, theme management (light/dark), and responsive layouts.
- **Part S — Normative Precedence & Authoritative Overrides:** Authoritative baseline overrides established during Phase 3 verification.

---

## Current Canonical Reference

For all active development, implementation rules, and architectural invariants, refer to:
- **Project Dossier:** [`docs/reviews/project-dossier/JAVAVERSE_PROJECT_DOSSIER.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/JAVAVERSE_PROJECT_DOSSIER.md)
- **Architecture Decisions:** [`docs/DECISIONS.md`](file:///home/jagrit/Desktop/javaverse/docs/DECISIONS.md)
- **Remediation Backlog:** [`docs/reviews/project-dossier/REMEDIATION_BACKLOG.md`](file:///home/jagrit/Desktop/javaverse/docs/reviews/project-dossier/REMEDIATION_BACKLOG.md)
- **Operations Guide:** [`docs/runbooks/OPERATIONS.md`](file:///home/jagrit/Desktop/javaverse/docs/runbooks/OPERATIONS.md)

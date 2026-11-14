# JavaVerse Open-Source Readiness Audit

> **Audit Target:** Open-source legal licensing, community governance, contribution standards, security disclosure, and repository health  
> **Repository:** `JavaVerse` (Self-hosted, local-first Java learning platform)  

---

## 1. Executive Summary

JavaVerse is **source-visible and preparing for open-source release**. The repository currently lacks an authoritative root `LICENSE` file. Under international copyright law and standard software licensing principles, public source visibility on GitHub does **not** grant third parties the right to use, modify, redistribute, or self-host the software.

The absence of a project licence is:
- A **P0 blocker** for public open-source release,
- A **blocker** for accepting outside contributions under clear reuse terms,
- **Not automatically a blocker** for an internal technical merge.

Public source visibility does not grant reuse, modification, distribution, or hosting rights by itself. The project maintainer must deliberately select and commit the root `LICENSE` file.

---

## 2. Open-Source Governance Inventory Checklist

| Document / Asset | Required Path | Present? | Quality / Status |
| :--- | :--- | :--- | :--- |
| **Project License** | `LICENSE` or `LICENSE.md` | **MISSING (CRITICAL)** | Only `LICENSES.md` (third-party dependency catalog) exists. No project license. |
| **Root Readme** | `README.md` | **Present** | Present but minimal (58 lines); lacks architecture deep-dive and license mention. |
| **Contributing Guide** | `CONTRIBUTING.md` | **MISSING** | No contribution guidelines, commit standards, or setup walkthrough for contributors. |
| **Code of Conduct** | `CODE_OF_CONDUCT.md` | **MISSING** | No community conduct standards or enforcement contact. |
| **Security Policy** | `SECURITY.md` | **MISSING** | No vulnerability reporting instructions or disclosure SLAs. |
| **Changelog** | `CHANGELOG.md` | **MISSING** | Project history tracked only through internal review documents. |
| **Code Owners** | `.github/CODEOWNERS` | **MISSING** | No automated code review assignments. |
| **Issue Templates** | `.github/ISSUE_TEMPLATE/` | **MISSING** | No bug report or feature request structured templates. |
| **Pull Request Template** | `.github/PULL_REQUEST_TEMPLATE.md` | **MISSING** | No PR checklist for testing, documentation, or security assertions. |
| **Branch Protection Rules** | Repository Settings / Docs | **MISSING** | Branch protection rules are not documented for external contributors. |
| **Vulnerability Reporting** | Within `SECURITY.md` | **MISSING** | No private vulnerability reporting mechanism (e.g. GitHub Security Advisories). |
| **Release Process Runbook** | `docs/runbooks/RELEASE.md` | **MISSING** | No documented semantic versioning, tagging, or container release procedure. |
| **Dependency Update Policy**| Within `SECURITY.md` | **Partial** | Renovate/Dependabot absent; pinned container versions manually tracked. |
| **Contributor AI-Use Policy**| Within `CONTRIBUTING.md` | **MISSING** | No policy regarding AI-generated code, copyright assignments, or eval checks. |
| **Local Installation Guide**| `README.md` / `docs/` | **Partial** | Basic setup in `README.md` and `start-dev.sh`; missing complete troubleshooting guide. |
| **Privacy Disclosure** | App `/privacy` page | **Present** | Live web page `/privacy`; missing open-source operator data declaration. |
| **External-AI Disclosure** | App `/about` & UI | **Present** | Transparently declares active model and local mock execution in UI. |

---

## 3. Legal & Open-Source Licensing Findings

### 3.1 The Missing `LICENSE` File
- **Current Reality:** The repository contains `LICENSES.md`, which lists third-party licenses (MIT, Apache-2.0, BSD-3-Clause, AGPL-3.0 for MinIO, GPL-2.0 for ClamAV). However, there is no file named `LICENSE` defining the license granted to users of JavaVerse itself.
- **Legal Implication:** Without an explicit project license, GitHub's default Terms of Service apply: the author retains all copyright rights, and public visitors have only the right to view and fork the code on GitHub. Users do **not** have the legal right to run, deploy, modify, or distribute JavaVerse for their own learning or institutional use.
- **Rule:** The project maintainer must explicitly select and commit a license (e.g. Apache-2.0 or MIT). The agent must not invent or assume a chosen license. JavaVerse is source-visible and preparing for open-source release.

### 3.2 Third-Party Dependency License Compatibility
- Direct dependencies are predominantly permissive (`MIT`, `Apache-2.0`, `ISC`, `BSD-3-Clause`).
- Infrastructure container images include:
  - `minio/minio:latest`: AGPL-3.0 (used strictly as an independent service container via network APIs).
  - `clamav/clamav:stable`: GPL-2.0 (optional container service).
  - `pgvector/pgvector:pg17`: PostgreSQL / Apache-2.0.
  - `redis:7-alpine`: BSD-3-Clause.
- Neither AGPL-3.0 nor GPL-2.0 container usage infects the proprietary or MIT/Apache-2.0 licensing of the JavaVerse TypeScript code when communicating over network boundaries.

---

## 4. Remediation Plan: Required Files and Creation Order

To achieve complete open-source readiness, create the missing files in the following exact sequence:

1. **`LICENSE` (P0 Blocker):** Commit the project license chosen by the project owner (e.g., Apache 2.0 or MIT).
2. **`SECURITY.md` (P1 Blocker):** Define supported versions, safe disclosure instructions, and private reporting contact.
3. **`CONTRIBUTING.md` (P2):** Walk contributors through prerequisite setup (`pnpm`, Docker), coding standards (TypeScript strict, Prettier, ESLint), testing mandates (`pnpm test:clean-db`, `pnpm test`), and the requirement that PRs never weaken database safety guards.
4. **`CODE_OF_CONDUCT.md` (P2):** Adopt standard Contributor Covenant v2.1.
5. **`.github/pull_request_template.md` (P2):** Provide a checklist verifying:
   - Tests run against isolated test databases.
   - Zero hardcoded secrets or environment variables.
   - Regression tests included.
   - No modifications to historical migrations.
6. **`.github/ISSUE_TEMPLATE/` (P3):** Provide `bug_report.yml` and `feature_request.yml`.
7. **`CHANGELOG.md` (P3):** Document release history from Phase 0 to Single-Account Milestone.
8. **`.github/CODEOWNERS` (P3):** Assign review responsibility for security, schema, and AI gateway files.


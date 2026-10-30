# JavaVerse Third-Party Licence Inventory

This inventory documents the open-source licences of direct dependencies and base container images introduced in Phase 1 Foundation.

## Direct Runtime Dependencies

| Package          | Version Range | Licence    | Purpose                                 |
| :--------------- | :------------ | :--------- | :-------------------------------------- |
| `next`           | `16.4.3`      | MIT        | Web application framework (App Router)  |
| `react`          | `19.3.1`      | MIT        | UI rendering engine                     |
| `react-dom`      | `19.3.1`      | MIT        | DOM rendering runtime                   |
| `@prisma/client` | `^6.4.1`      | Apache-2.0 | PostgreSQL type-safe query client       |
| `zod`            | `^4.6.7`      | MIT        | Runtime schema & environment validation |
| `bullmq`         | `^5.41.0`     | MIT        | Distributed job queue management        |
| `ioredis`        | `^5.6.0`      | MIT        | Redis client for BullMQ and cache       |
| `pino`           | `^9.6.0`      | MIT        | Fast structured JSON logging            |
| `lucide-react`   | `1.61.0`      | ISC        | Accessible UI icons                     |

## Direct Development & Test Dependencies

| Package                       | Version Range | Licence    | Purpose                                       |
| :---------------------------- | :------------ | :--------- | :-------------------------------------------- |
| `typescript`                  | `^5.7.0`      | Apache-2.0 | Strict static type checking                   |
| `typescript-eslint`           | `^8.72.0`     | MIT        | TypeScript linting integration                |
| `turbo`                       | `^2.11.10`    | MIT        | Monorepo task orchestration                   |
| `prisma`                      | `^6.4.1`      | Apache-2.0 | Schema migration CLI                          |
| `vitest`                      | `^5.0.5`      | MIT        | Fast ESM-native unit testing runner           |
| `eslint`                      | `^9.20.0`     | MIT        | Code quality linting                          |
| `prettier`                    | `^3.5.0`      | MIT        | Code formatting                               |
| `pino-pretty`                 | `^13.0.0`     | MIT        | Development log formatting                    |
| `@playwright/test`            | `1.64.1`      | Apache-2.0 | End-to-end browser automation and test runner |
| `@axe-core/playwright`        | `4.14.0`      | MPL-2.0    | Automated WCAG 2.2 AA accessibility audit     |
| `@lhci/cli`                   | `0.15.1`      | Apache-2.0 | Lighthouse CI performance and a11y auditing   |
| `@testing-library/react`      | `16.3.3`      | MIT        | React UI component testing harness            |
| `@testing-library/user-event` | `14.6.8`      | MIT        | High-fidelity user interaction simulation     |
| `jsdom`                       | `30.1.3`      | MIT        | Headless DOM implementation for unit tests    |
| `@types/jsdom`                | `^21.1.7`     | MIT        | Type definitions for jsdom                    |

## Container Base Images

| Image               | Tag / Digest                           | Upstream Licence           | Notes                                              |
| :------------------ | :------------------------------------- | :------------------------- | :------------------------------------------------- |
| `pgvector/pgvector` | `pg17`                                 | PostgreSQL / Apache-2.0    | PostgreSQL 17 with pgvector extension              |
| `redis`             | `7-alpine`                             | BSD-3-Clause / Alpine base | Queue (`noeviction`) and cache (`allkeys-lru`)     |
| `elestio/minio`     | `latest` (tagged `minio/minio:latest`) | AGPL-3.0                   | S3-compatible private storage                      |
| `axllent/mailpit`   | `latest`                               | MIT                        | Development SMTP and testing webmail               |
| `clamav/clamav`     | `stable`                               | GPL-2.0                    | Malware scanner (under optional profile `uploads`) |

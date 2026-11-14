# JavaVerse Route & API Inventory

> **Audit Target:** All Next.js App Router UI pages and REST API routes  
> **Active Scale:** 25 Page Routes · 49 API Route Files (56 HTTP Methods)  
> **Authentication Model:** Single-account learner architecture (`User` without `role` column)

---

## 1. Executive Summary & Legacy Verification

This inventory maps every public and authenticated interface in JavaVerse. Following Phase 11 and the single-account migration:

- **Bootstrap Routes:** `0` active routes. Legacy `/auth/bootstrap` redirects cleanly to `/auth/signup` via middleware.
- **Invitation Routes:** `0` active routes. Legacy `/auth/invite` redirects cleanly to `/auth/signup` via middleware.
- **Admin Routes:** `0` active routes. Legacy `/admin` and `/dashboard/admin` redirect to `/dashboard` via middleware.
- **Owner Routes:** `0` active routes. No owner-specific endpoints or guards exist in the application.
- **Role Management:** `0` active routes. All accounts possess identical learner permissions.

---

## 2. Next.js App Router Page Routes (25 Pages)

| URL | Source File Path | Access | Intended User | Navigation Entry | Test Coverage | Obsolete Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `apps/web/src/app/(public)/page.tsx` | Public | Learner | Direct / Header | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/about` | `apps/web/src/app/(public)/about/page.tsx` | Public | Learner | Public Footer / Header | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/auth/forgot-password` | `apps/web/src/app/(public)/auth/forgot-password/page.tsx` | Public | Learner | Auth Flow Link | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/auth/login` | `apps/web/src/app/(public)/auth/login/page.tsx` | Public | Learner | Auth Flow Link | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/auth/mfa` | `apps/web/src/app/(public)/auth/mfa/page.tsx` | Public | Learner | Auth Flow Link | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/auth/recovery` | `apps/web/src/app/(public)/auth/recovery/page.tsx` | Public | Learner | Auth Flow Link | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/auth/reset-password` | `apps/web/src/app/(public)/auth/reset-password/page.tsx` | Public | Learner | Auth Flow Link | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/auth/signup` | `apps/web/src/app/(public)/auth/signup/page.tsx` | Public | Learner | Auth Flow Link | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/auth/suspended` | `apps/web/src/app/(public)/auth/suspended/page.tsx` | Public | Learner | Auth Flow Link | `E2E: routes.spec.ts, auth.spec.ts` | **Active (Stale Copy)** |
| `/auth/verify-email` | `apps/web/src/app/(public)/auth/verify-email/page.tsx` | Public | Learner | Auth Flow Link | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/contact` | `apps/web/src/app/(public)/contact/page.tsx` | Public | Learner | Public Footer / Header | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/dashboard` | `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Authenticated Learner | Learner | Sidebar Nav | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/dashboard/ask` | `apps/web/src/app/(dashboard)/dashboard/ask/page.tsx` | Authenticated Learner | Learner | Sidebar Nav | `E2E: ask-ai.spec.ts` | **Active** |
| `/dashboard/learn` | `apps/web/src/app/(dashboard)/dashboard/learn/page.tsx` | Authenticated Learner | Learner | Sidebar Nav | `E2E: curriculum.spec.ts` | **Active** |
| `/dashboard/learn/[slug]` | `apps/web/src/app/(dashboard)/dashboard/learn/[slug]/page.tsx` | Authenticated Learner | Learner | Sidebar Nav | `E2E: curriculum.spec.ts` | **Active** |
| `/dashboard/library` | `apps/web/src/app/(dashboard)/dashboard/library/page.tsx` | Authenticated Learner | Learner | Sidebar Nav | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/dashboard/notes` | `apps/web/src/app/(dashboard)/dashboard/notes/page.tsx` | Authenticated Learner | Learner | Sidebar Nav (Notes) | `E2E: routes.spec.ts, auth.spec.ts` | **Feature Preview** |
| `/dashboard/practice` | `apps/web/src/app/(dashboard)/dashboard/practice/page.tsx` | Authenticated Learner | Learner | Sidebar Nav | `E2E: practice.spec.ts` | **Active** |
| `/dashboard/practice/[slug]` | `apps/web/src/app/(dashboard)/dashboard/practice/[slug]/page.tsx` | Authenticated Learner | Learner | Sidebar Nav | `E2E: practice.spec.ts` | **Active** |
| `/dashboard/progress` | `apps/web/src/app/(dashboard)/dashboard/progress/page.tsx` | Authenticated Learner | Learner | Sidebar Nav | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/dashboard/settings` | `apps/web/src/app/(dashboard)/dashboard/settings/page.tsx` | Authenticated Learner | Learner | Sidebar Nav | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/dashboard/settings/security` | `apps/web/src/app/(dashboard)/dashboard/settings/security/page.tsx` | Authenticated Learner | Learner | Sidebar Nav | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/learn` | `apps/web/src/app/(public)/learn/page.tsx` | Public | Learner | Direct / Header | `E2E: curriculum.spec.ts` | **Active** |
| `/privacy` | `apps/web/src/app/(public)/privacy/page.tsx` | Public | Learner | Public Footer / Header | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |
| `/terms` | `apps/web/src/app/(public)/terms/page.tsx` | Public | Learner | Public Footer / Header | `E2E: routes.spec.ts, auth.spec.ts` | **Active** |

---

## 3. REST API Route Inventory (56 HTTP Methods across 49 Routes)

Every API route returns JSON adhering to the canonical JavaVerse response envelopes (`jsonOk` or `jsonError`).

| Method | Route URL | Auth Required | CSRF Guard | Rate Limit | Schemas / Validation | Storage / Dependencies | Sensitivity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ai/providers` | Yes (Session) | No | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `GET` | `/api/v1/auth/csrf` | No (Public/Token) | No | No | `Implicit / Custom` | In-Memory / Config | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/email/resend-verification` | No (Public/Token) | Yes | Yes (Redis) | `Implicit / Custom` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/email/verify` | No (Public/Token) | Yes | Yes (Redis) | `verifyEmailSchema` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/login` | No (Public/Token) | Yes | Yes (Redis) | `loginSchema` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/logout` | No (Public/Token) | Yes | No | `Implicit / Custom` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/logout-all` | No (Public/Token) | Yes | No | `Implicit / Custom` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/mfa/challenge` | No (Public/Token) | Yes | Yes (Redis) | `mfaChallengeSchema` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/mfa/recovery` | No (Public/Token) | Yes | Yes (Redis) | `mfaRecoverySchema` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/password/change` | No (Public/Token) | Yes | No | `changePasswordSchema` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/password/forgot` | No (Public/Token) | Yes | Yes (Redis) | `forgotPasswordSchema` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/password/reset` | No (Public/Token) | Yes | Yes (Redis) | `resetPasswordSchema` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/reauth` | No (Public/Token) | Yes | Yes (Redis) | `reauthSchema` | PostgreSQL | High (Credentials/Tokens) |
| `GET` | `/api/v1/auth/session` | No (Public/Token) | No | No | `Implicit / Custom` | In-Memory / Config | High (Credentials/Tokens) |
| `GET` | `/api/v1/auth/sessions` | No (Public/Token) | No | No | `Implicit / Custom` | PostgreSQL | High (Credentials/Tokens) |
| `DELETE` | `/api/v1/auth/sessions/[publicId]` | No (Public/Token) | Yes | No | `Implicit / Custom` | PostgreSQL | High (Credentials/Tokens) |
| `POST` | `/api/v1/auth/signup` | No (Public/Token) | Yes | Yes (Redis) | `signupSchema` | PostgreSQL | High (Credentials/Tokens) |
| `GET` | `/api/v1/chats` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Medium (Learner Code/Queries) |
| `POST` | `/api/v1/chats` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Medium (Learner Code/Queries) |
| `GET` | `/api/v1/chats/[id]` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Medium (Learner Code/Queries) |
| `PATCH` | `/api/v1/chats/[id]` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Medium (Learner Code/Queries) |
| `DELETE` | `/api/v1/chats/[id]` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Medium (Learner Code/Queries) |
| `POST` | `/api/v1/chats/[id]/cancel` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Medium (Learner Code/Queries) |
| `GET` | `/api/v1/chats/[id]/events` | Yes (Session) | No | No | `Implicit / Custom` | PostgreSQL | Medium (Learner Code/Queries) |
| `GET` | `/api/v1/chats/[id]/messages` | Yes (Session) | Yes | Yes (Redis) | `Implicit / Custom` | PostgreSQL | Medium (Learner Code/Queries) |
| `POST` | `/api/v1/chats/[id]/messages` | Yes (Session) | Yes | Yes (Redis) | `Implicit / Custom` | PostgreSQL | Medium (Learner Code/Queries) |
| `POST` | `/api/v1/chats/[id]/retry` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Medium (Learner Code/Queries) |
| `PUT` | `/api/v1/chats/[id]/state` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Medium (Learner Code/Queries) |
| `GET` | `/api/v1/events` | Yes (Session) | No | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `POST` | `/api/v1/feedback` | Yes (Session) | Yes | No | `FeedbackReportInputSchema` | In-Memory / Config | Standard |
| `GET` | `/api/v1/flashcards` | Yes (Session) | No | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `POST` | `/api/v1/flashcards/[id]/review` | Yes (Session) | Yes | No | `FlashcardReviewRequestSchema` | In-Memory / Config | Standard |
| `GET` | `/api/v1/health` | No (Public/Token) | No | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `POST` | `/api/v1/kb/candidates` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `GET` | `/api/v1/kb/search` | Yes (Session) | No | No | `KbSearchQuerySchema` | In-Memory / Config | Standard |
| `GET` | `/api/v1/lessons` | No (Public/Token) | No | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `GET` | `/api/v1/lessons/[slug]` | No (Public/Token) | No | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `POST` | `/api/v1/lessons/[slug]/challenge` | Yes (Session) | Yes | No | `ChallengeSubmissionSchema` | In-Memory / Config | Standard |
| `POST` | `/api/v1/lessons/[slug]/quiz` | Yes (Session) | Yes | No | `QuizSubmissionSchema` | In-Memory / Config | Standard |
| `GET` | `/api/v1/library` | Yes (Session) | Yes | No | `SaveLibraryItemRequestSchema` | In-Memory / Config | Standard |
| `POST` | `/api/v1/library` | Yes (Session) | Yes | No | `SaveLibraryItemRequestSchema` | In-Memory / Config | Standard |
| `DELETE` | `/api/v1/library/[id]` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `GET` | `/api/v1/practice` | Yes (Session) | No | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `GET` | `/api/v1/practice/[slug]` | Yes (Session) | No | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `POST` | `/api/v1/practice/[slug]/run` | Yes (Session) | Yes | No | `RunProblemRequestSchema` | In-Memory / Config | Standard |
| `POST` | `/api/v1/practice/[slug]/submit` | Yes (Session) | Yes | No | `SubmitProblemRequestSchema` | In-Memory / Config | Standard |
| `GET` | `/api/v1/progress` | Yes (Session) | No | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `GET` | `/api/v1/readiness` | No (Public/Token) | No | No | `Implicit / Custom` | PostgreSQL + Redis | Standard |
| `POST` | `/api/v1/sandbox/execute` | Yes (Session) | Yes | Yes (Redis) | `ExecuteCodeSchema` | In-Memory / Config | Medium (Learner Code/Queries) |
| `GET` | `/api/v1/settings` | Yes (Session) | Yes | No | `UpdateUserSettingsRequestSchema` | In-Memory / Config | Standard |
| `PATCH` | `/api/v1/settings` | Yes (Session) | Yes | No | `UpdateUserSettingsRequestSchema` | In-Memory / Config | Standard |
| `POST` | `/api/v1/settings/export` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | High (PII Export) |
| `POST` | `/api/v1/uploads` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `GET` | `/api/v1/uploads/[id]` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `DELETE` | `/api/v1/uploads/[id]` | Yes (Session) | Yes | No | `Implicit / Custom` | In-Memory / Config | Standard |
| `GET` | `/api/v1/uploads/[id]/content` | Yes (Session) | No | No | `Implicit / Custom` | In-Memory / Config | Standard |

---

## 4. Deep-Dive Specification of Critical API Endpoints

### 4.1 Authentication & Session Endpoints

#### `POST /api/v1/auth/signup`
- **Purpose:** Creates a new learner account up to the 5-account limit. Decoupled from session creation (does not issue session tokens or cookies; client redirects to `/auth/login?created=1`).
- **Authentication:** None (Public; guarded by already-authenticated check rejecting active sessions with HTTP 400 `ALREADY_AUTHENTICATED`).
- **CSRF Relevance:** Enforced via `validateCsrf(request, { flow: 'signup' })`.
- **Rate Limiting:** Dual-layer: IP-based (10 req/15 min) and Email-based (5 req/15 min).
- **Concurrency & Invariant Protection:** Transaction-level PostgreSQL advisory lock `SELECT pg_advisory_xact_lock(74619284)`. Checks `count(users) < 5` inside transaction.
- **Password Security:** Checks HIBP password breach database; hashes with Argon2id.
- **Data Accepted:** `{ displayName?: string, email: string, password: string }` validated against `signupSchema`.
- **Data Returned:** HTTP 201 `{ success: true, message: "Account created successfully. Sign in to continue.", user: { id, email, displayName, role }, requiresSignIn: true }` (no `Set-Cookie`).
- **Error Responses:** 400 (Validation / Breach / Whitespace / `ALREADY_AUTHENTICATED`), 403 (CSRF), 409 (`ACCOUNT_LIMIT_REACHED`, `USER_EXISTS`), 429 (Rate limit).

#### `POST /api/v1/auth/login`
- **Purpose:** Authenticates learner credentials and creates session.
- **Authentication:** None (Public).
- **CSRF Relevance:** Enforced via `validateCsrf(request, { flow: 'login' })`.
- **Rate Limiting:** IP rate limit (10/15min) and Account rate limit (5/15min).
- **Password Verification:** Exact string match against Argon2id hash via `@node-rs/argon2`.
- **Data Accepted:** `{ email: string, password: string, rememberMe?: boolean }` validated against `loginSchema`.
- **Data Returned:** HTTP 200 `{ user: { id, email, displayName } }` (or `{ mfaRequired: true }`) + `Set-Cookie`.
- **Error Responses:** 400 (Validation), 401 (`INVALID_CREDENTIALS`), 403 (Account suspended / CSRF), 429 (Rate limit).

#### `POST /api/v1/auth/logout` & `POST /api/v1/auth/logout-all`
- **Purpose:** Terminates current session or invalidates all sessions for the learner.
- **Authentication:** Session cookie required.
- **CSRF Relevance:** Validated against session public ID.
- **Data Returned:** HTTP 200 `{ success: true }` + Expired cookie header.

### 4.2 AI & Learning Endpoints

#### `GET /api/v1/ai/providers`
- **Purpose:** Returns active AI provider (`mock`, `gemini`, `anthropic`), active model, and transparency flags.
- **Authentication:** Required.
- **Data Returned:** `{ activeProvider, activeModel, externalAiEnabled, providers: [{ id, label, configured, external, mayConsumePaidUsage }] }`.

#### `POST /api/v1/chats/[id]/messages`
- **Purpose:** Posts a learner question to an active chat, creates BullMQ analysis job, and emits SSE events.
- **Authentication:** Required; ownership verified (`chat.userId === auth.user.id`).
- **CSRF Relevance:** Enforced.
- **AI Rate Limiting:** Enforces `ai:submit:lock:${userId}` (3s duplicate click lock), `ai:concurrency:global` (limit 2), and `ai:usage:daily:${userId}:${date}` (limit 50).
- **Local Mock Bypass:** If `provider === 'mock'`, external rate limits and quota increments are skipped.
- **Concurrency Protection:** Transaction advisory lock `chat_post_${chatId}` prevents concurrent job dispatch on the same chat slot.

### 4.3 Sandbox Execution Endpoint

#### `POST /api/v1/sandbox/execute`
- **Purpose:** Direct execution endpoint for Java snippets in practice workspace.
- **Authentication:** Required.
- **CSRF Relevance:** Enforced.
- **Rate Limit:** 30 requests per minute per user.
- **Active Runner:** Invokes `getSandboxClient()`. Under default config (`SANDBOX_PROVIDER=mock`), executes deterministically via `MockSandboxClient`.
- **Data Accepted:** `{ code: string, javaVersion?: 'JAVA_21', timeoutMs?: number }`.
- **Data Returned:** `{ status, stdout, stderr, exitCode, timeMs, memoryKb, runnerProvider: 'mock' }`.

---

## 5. Unreachable and Untested Route Analysis

1. **Unreachable / Orphaned Route:** None. All 25 pages are reachable through header links, sidebar navigation, or auth flow redirects.
2. **Feature Preview Page:** `/dashboard/notes` is reachable in the sidebar, presenting an intentional non-functional preview shell labeled with "Feature Preview · Scheduled for future release" and neutral placeholder copy.
3. **Untested Routes in Automated E2E:**
   - `POST /api/v1/settings/export`: Covered by integration tests (`settings.ts`), but lacks dedicated browser download assertion in Playwright.
   - `DELETE /api/v1/library/[id]`: Covered by integration tests, lacks Playwright interaction assertion.
   - `POST /api/v1/auth/mfa/recovery`: Covered by unit/integration tests (`totp.test.ts`), lacks end-to-end browser recovery assertion.

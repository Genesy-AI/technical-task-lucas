## Objective
This is the document where I will share the improvements that I consider would be interesting to debate with the team that owns this project.

## Current Tech Stack
Frontend -> React 18 + Vite + TypeScript + Tailwind CSS v4 + TanStack Query (react-query) + axios + react-hot-toast + Vitest
Backend -> Node.js + Express 5 + TypeScript (ts-node/nodemon) + Prisma ORM + SQLite + Temporal (workflows/activities) + Vitest
Tooling -> pnpm workspaces (frontend/backend) + Prettier (ESLint config missing) + no CI

---

## 1. Developer experience & tooling ASAP

### 1.1 Fix ESLint config so `pnpm run lint` runs — **P0**
There is no `eslint.config.js` in either package, so on ESLint 9 `pnpm run lint` fails immediately and linting effectively doesn't exist.
**Why:** Lint is the cheapest way to catch bugs and enforce consistency. Add a flat-config per package.

### 1.2 Fix the build / type error — **P0**
`pnpm run build` fails on a real type error at `frontend/src/api/mutations/useApiMutation.ts:64` (`emailVerified` missing, `TS2741`).
**Why:** A red build blocks CI and deploys.

### 1.3 Add `backend/prisma/dev.db` to `.gitignore` — **P0**
The SQLite DB file is committed and not gitignored.
**Why:** A binary DB in git causes noisy diffs and conflicts, and a swapped-out file under a running server throws `attempt to write a readonly database`. Ignore `*.db*` and keep only migrations.

### 1.4 Enforce Prettier on every build — **P0**
Prettier is installed but not enforced, and there are already formatting failures (`verifyEmails.ts`, `LeadsList.tsx`). There is no `format:check` script — same problem as the missing ESLint config.
**Why:** Add a `format:check` script and make formatting pass on every build/CI, not an optional manual `--write`.

### 1.5 CI — GitHub Actions pipelines — **P1**
There is no `.github/workflows` and no pre-commit hooks. Nothing enforces quality before merge.
**Why:** Add GitHub Actions that run on every push/PR and block merge on failure:
- **ESLint** — `pnpm run lint`
- **Prettier** — `prettier --check .`
- **Build** — `pnpm run build`
- **Unit tests** — `vitest run`
- **E2E tests** — Playwright (core flows)

Mark it a required status check on `main`, and add husky + lint-staged for a pre-commit gate.

### 1.6 Add a `CLAUDE.md` — shared AI-development playbook — **P1**
There is no `CLAUDE.md` in the repo, so everyone's AI assistant re-discovers the project and applies different conventions.
**Why:** A root `CLAUDE.md` gives the team one shared road map — how to run the app, the checks that must pass before a PR, coding conventions, and the gotchas (regenerate Prisma client + `migrate deploy` after schema changes; never commit `dev.db`). Makes AI-assisted work consistent instead of ad-hoc.

---

## 2. Frontend architecture

### 2.1 Adopt React 19 + React Compiler and drop manual memoization — **P1**
The app is on React 18.3 and hand-optimizes with `useMemo`/`useCallback`.
**Why:** React 19 + the React Compiler auto-memoize components, so we can delete most `useMemo`/`useCallback` boilerplate — less code, fewer stale-dependency bugs, same or better performance.

### 2.2 Atomic Design / component atomization — **P1**
Components are large and monolithic: `CsvImportModal.tsx` (354), `LeadsList.tsx` (334), `MessageTemplateModal.tsx` (304 lines).
**Why:** Split into atoms (`Button`, `Badge`, `Spinner`) / molecules / organisms. Smaller, single-purpose units are easier to reason about, reuse, and test.

### 2.3 Extract inline SVGs into components/assets — **P1**
There are 14 inline `<svg>` blocks across the three components, plus a repeated brand logo.
**Why:** Move icons to dedicated files (or use the already-installed `@tabler/icons-react`). Removes duplication, shrinks components, and enables reuse and consistent sizing.

### 2.4 Add an Error Boundary and consistent loading/empty/error states — **P1**
There is no React Error Boundary, and feedback is inconsistent across features.
**Why:** A top-level error boundary stops one render error from white-screening the app; a shared async-state pattern gives predictable feedback everywhere.

---

## 3. Backend architecture

### 3.1 Split `index.ts` into routers / controllers / services — **P1**
`backend/src/index.ts` is a single ~323-line file holding every route with duplicated validation and `try/catch`.
**Why:** A layered structure makes handlers small and testable and removes copy-pasted boilerplate.

### 3.2 Introduce request validation (zod) — **P1**
Every route hand-rolls checks like `if (!Array.isArray(leadIds) ...)`.
**Why:** A schema library (zod) validates and types request bodies in one place, returns consistent 400s, and removes "undefined field" bugs.

### 3.3 Central error-handling middleware — **P1**
Each route has its own `try/catch`, and five routes have none at all, so a DB error there returns a bare, unlogged 500.
**Why:** A single Express error middleware + `asyncHandler` standardizes error shape and logging and guarantees the server always responds.

---

## 4. Quality: testing & i18n

### 4.1 End-to-end tests (Playwright) — **P1**
There is no e2e framework and no component tests; backend endpoints are untested.
**Why:** Playwright covering the core flows (import CSV, verify email, enrich gender) would have caught the bugs we hit this session before anyone saw them.

### 4.2 Internationalization (i18n) — **P2**
All user-facing strings are hardcoded (toasts, headers, labels).
**Why:** i18n (e.g. `react-i18next`) moves copy into locale files, enabling translation and consistent wording. Best done after 2.2.

---

## 5. Observability

### 5.1 Error monitoring (Sentry) + structured logging — **P1**
The app only uses `console.*` and has no error monitoring.
**Why:** Sentry on both sides captures unhandled errors and regressions in production; add a structured request logger (pino/morgan) for backend traceability.

---

## 6. Architecture & stack (long-term platform roadmap)

Bigger bets than the tactical fixes above — direction for where the platform should go as it grows.

### 6.1 SQLite → managed Postgres (Supabase / Neon / RDS) — **P1**
SQLite is a single local file: one writer, no real concurrency, no horizontal scaling — and it already caused the "readonly database" crash.
**Why:** Postgres gives concurrency, pooling, replicas, backups, and proper indexes. Prisma migrates by changing the datasource `provider` — low effort, highest infra payoff.

### 6.2 React SPA → Next.js (SSR / SSG / RSC + Server Actions) — **P1**
Today it's a Vite SPA: blank screen until JS loads, no SEO, all data-fetching client-side (the cause of the "Error loading leads" race).
**Why:** Next.js renders on the server (data on first paint), Server Actions collapse much of the API layer, and streaming + code-splitting make performance fly — plus a single full-stack deploy.

### 6.3 Real monorepo (Turborepo / Nx + pnpm workspaces) — **P1**
`frontend` and `backend` are loose folders with types copied between them.
**Why:** A monorepo with `packages/shared` gives one source of truth for the `Lead` model, plus cached builds and task orchestration.

### 6.4 Enrichment as a first-class async pipeline (queue + cache) — **P1**
Verify-email and guess-gender are sequential loops calling external APIs inside the HTTP request — the shape that caused the hang. Enrichment is the product's core.
**Why:** Move enrichment off the request (enqueue → process → notify), add a result cache, and rate-limiting/backoff/batching per provider. Use durable workflows or a lightweight job queue (BullMQ, Inngest, Trigger.dev).

### 6.5 Containerization, deploy & preview environments — **P2**
No Docker, no IaC, no per-PR environments.
**Why:** A `docker-compose` for local dev makes onboarding one command; per-PR preview deployments let reviewers click through a feature before merge.

### 6.6 Search & pagination at scale — **P2**
The table fetches all leads at once with no pagination.
**Why:** Server-side pagination + indexes (free once on Postgres) for thousands of leads; Postgres full-text search first, a dedicated engine only if needed.

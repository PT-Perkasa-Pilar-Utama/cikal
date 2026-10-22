# Cikal LOS: Agent Operating Manual

Cikal is a modular Loan Origination System for banks: a TypeScript monorepo (NestJS API, React SPA) that replaces an OutSystems OS11 LOS, ships from one codebase as SaaS or on-premise, and packages only licensed modules. Phase: POC, 6 sprints from 2026-10-26.

**Non-negotiable:**
- Re-read this file after any context compaction.
- Run the verification gate (§8) and see it pass before you mark any task complete.
- If this file and a source doc disagree, the source doc wins. Fix this file in the same PR.

## 1. Source of truth

This manual restates rules tersely. Read the source for detail.

| Concern | Source |
|---|---|
| Product: user stories, AC (Gherkin), sprints | `Docs/business/` (`user-story.md`, `acceptance-criteria-breakdown/`, `sprint-breakdown.md`) |
| BA originals (read only, never edit) | `Docs/ba/` |
| Architecture, modules, data model, security, env | `Docs/technical-specs/` (`_index.md`) |
| Endpoint contracts, error codes, status tracker | `Docs/api-specs/` (`01-conventions.md`, `_index.md`) |
| Code rules (wins over this file and over §16) | `Docs/CODING_STANDARD.md` |
| PR gate | `Docs/CODE_REVIEW_CHECKLIST.md` |
| Cards, owners, estimates, Definition of Done | `Docs/TASK_BREAKDOWN.md` |
| Environments, deploy, rollback, reset, DB debugging | `Docs/DEPLOYMENT_PLAN.md` |
| Engineering terms / business terms | `Docs/GLOSSARY.md` / `Docs/ba/glossary.md` |
| How to do a card end to end | `Docs/DEVELOPMENT_SCENARIO_GUIDE.md` |
| UI tokens | `Docs/design-system.md` |

Language policy: identifiers, file names, error codes, and commit subjects in English. Code comments, JSDoc, and docs in Indonesian. UI text and user-facing error messages copied verbatim from the AC.

## 2. Project overview

| Layer | Technology (exact pins in `package.json`) |
|---|---|
| Runtime | Node.js 22 (`.nvmrc`), TypeScript 5.9.3 strict, ESM |
| Workspace | pnpm 10.34.7 (corepack), Turborepo 2.11.10, Biome 2.6.2, Husky 9 |
| API | NestJS 11.2.7 + Fastify 5.11.3, Zod 4.6.7 + nestjs-zod, Drizzle ORM 0.45.4 + drizzle-kit 0.31.11, pg 8.23.1, prom-client |
| Web | React 19.3.1 SPA, Vite 7.3.7, TanStack Router 1.170.45 and Query 5.104.5, Tailwind 4.3.3 |
| Data | PostgreSQL 17.6 (one schema per module, RLS), S3-compatible storage (SeaweedFS in dev), Gotenberg 8.20.1 |
| Tests | Vitest 3.2.7, Testcontainers 11.14.0 (PostgreSQL 17), Playwright 1.64.1 |
| Planned, not installed yet | pg-boss (queue), argon2, decimal.js in API, docxtemplater |

```text
cikal/
├── apps/api/src/
│   ├── main.ts, worker.ts, app.factory.ts, app.module.ts
│   ├── platform/            config, db, http (access guard, error filter), storage, migrate (runner), ops (health, reset, metrics)
│   ├── modules/core/<m>/    CORE modules (tenancy, identity, product, change-request, ...)
│   └── modules/addons/<m>/  licensed add-ons (m06-dedup ... m15-disbursement)
├── apps/api/test/           cross-module tests: architecture, stub contracts, *.int.spec.ts
├── apps/web/src/            routes/, features/<f>/, components/, lib/api/client.ts
├── packages/contracts/      Zod request/response schemas and mocks (single source of API types)
├── packages/formula/        pure formula engine; no NestJS, no DB, no I/O
├── tools/package-builder/   manifest -> licensed-modules.generated.ts, licensed-module-codes.generated.ts
├── deploy/compose/          dev compose, initdb role script
├── deploy/manifests/        poc.json (CORE, M06, M07, M08, M09, M10, M11, M15)
└── Docs/                    all project docs (§1)
```

## 3. Boundaries

- **Module:** one folder, one PostgreSQL schema, one public `index.ts`. Schema map: `technical-specs/02-system-architecture.md` §2.7 (for example `identity` -> `iam`, `change-request` -> `cr`, `m07-dukcapil` -> `m07_dukcapil`).
- **Cross-module rules XM-01 to XM-07** (`02` §2.8):
  - Import other modules only via `index.ts`.
  - Never touch another module's tables.
  - Cross-module side effects go through the outbox.
  - Foreign keys may point to CORE. CORE never points to an add-on, and add-ons never point to each other.
- **Tenant:** a company (bank). Every business table has `tenant_id` and RLS. The tenant comes from the session, never from request params.
- **Access:** every route declares `@Public()`, `@Authenticated()`, or `@Requires(menuCode, action)`. Actions: `VIEW`, `CREATE`, `UPDATE`, `DELETE`, `APPROVE`. Menu codes are listed in `api-specs/01` §1.11, for example `MST-PRODUCT` and `IAM-ROLE-ACCESS`.
- **Seed roles** (`technical-specs/09` §9.5): Super User, Admin Sistem, Maker, Checker, Sales, Customer Service, Surveyor, Verifikator, Supervisor, Risk Manager, Approver, Kepala Cabang, Admin Operasional, Auditor, Compliance Officer, QA. Bind rules to menu and action, never to role names.
- **State machines** (`06` §6.13). Implement only these transitions:

| Entity | States and legal transitions |
|---|---|
| Application.status | `DRAFT`->`ON_PROGRESS` (Submit); `ON_PROGRESS`->`DRAFT` (BACK_TO_DRAFT), ->`RECONTEST`, ->`FINISHED_REJECTED`, ->`APPROVED` (no M15), ->`DISBURSED` (core SUKSES), ->`FINISHED_CANCELLED`; `RECONTEST`->`ON_PROGRESS`, ->`FINISHED_REJECTED` |
| StepExecution.status | `PENDING`->`SKIPPED`/`RUNNING`; `RUNNING`->`COMPLETED`/`WAITING_HUMAN`/`WAITING_EXTERNAL`/`ERROR`; `WAITING_HUMAN`->`COMPLETED`; `WAITING_EXTERNAL`->`COMPLETED`/`ERROR`; `ERROR`->`RUNNING` (retry, attempt + 1) |
| HumanTask.status | `OPEN`->`ASSIGNED`->`OPEN` (release) ->`CLOSED` |
| Versioned data (route, formula, parameter, integration, numbering, scoring model) | `DRAFT`->`WAITING_APPROVAL`->`ACTIVE` (at `effective_from`) ->`SUPERSEDED`; rejected goes back to `DRAFT`, never `ACTIVE` |
| ChangeRequest.status | `WAITING_APPROVAL`->`APPROVED`/`REJECTED`/`REVISE`; `REVISE`->`WAITING_APPROVAL` (maker resubmits) |

## 4. Work model

- **One card, one issue, one branch, one PR.** A card is a row in `TASK_BREAKDOWN.md`, ID `<BE|FE|TL>-S<sprint>-<NN>`. It is an issue on board [Cikal POC delivery](https://github.com/orgs/PT-Perkasa-Pilar-Utama/projects/24).
- **Owners are pre-assigned.** FS1 (fullstack) holds 48 cards. TL holds 21 cards and reviews. TL cards are reviewed by FS1.
- **Contract-stable model:**
  - Sprint 1 endpoints exist as stubs that return contract mocks from `packages/contracts`.
  - A backend card replaces the stub. It keeps the route, decorator, and DTO.
  - A frontend card builds against the stub.
  - A wiring card connects both sides and proves the AC with Playwright.
- **Status flow:** Backlog -> Ready -> In Progress -> In Review -> Done. Done means merged and the Definition of Done in `TASK_BREAKDOWN.md` is met.
- **Deferred AC:** AC-01.09, AC-01.10, and AC-76.03 are not built in the POC.

## 5. Architecture laws

- **File size:**
  - A source file has at most 300 lines.
  - Split it at 250 lines.
  - Split by responsibility into sibling files, for example one repository per entity or one use case per file.
  - Never split into a shared `utils`.
  - Keep the entry point thin.
- **Backend module pattern** (`CODING_STANDARD` §3.2):
  - `index.ts`, `<m>.module.ts`, `<m>.data.ts`.
  - `domain/`: pure rules.
  - `application/`: use cases.
  - `http/`: controllers.
  - `db/schema.ts`, `db/<entity>.repository.ts`, `db/migrations/`.
  - `seed/`.
  - `ports/` and `adapters/`: third parties only.
- **Controllers are thin.** A controller validates with a DTO from contracts, calls one use case, and returns. It holds no business logic, no queries, and no calculations.
- **Drizzle queries live only in `db/*.repository.ts`.** `domain/` has no I/O. Raw `pg` queries are allowed only in `platform/`.
- **Schemas live only in `packages/contracts`.** Controllers use `createZodDto(schema)`. The web calls `apiRequest(schema, path)`.
- **Web layering:**
  - `routes/` composes features.
  - `features/<f>/api.ts` holds TanStack Query hooks.
  - `components/` never calls the API.
  - `fetch` is used only in `lib/api/client.ts`.

## 6. Runtime do and don't

| Use | Never use |
|---|---|
| pnpm (exact versions, lockfile committed) | npm, yarn, `^` or `~` ranges |
| Vitest, Testcontainers PostgreSQL | DB mocks for repositories, Jest |
| Zod schemas from `packages/contracts` | class-validator, duplicated TS interfaces for API data |
| Drizzle + drizzle-kit via `db:generate` | Prisma, hand-written migrations, editing merged migrations |
| `decimal.js` + `numeric`; money as decimal strings on the wire | `number`/float for money or percentages |
| pg-boss + outbox (when installed) | Redis, RabbitMQ, Kafka |
| jsep + whitelist evaluator in `packages/formula` | `eval`, `Function`, expr-eval |
| `loadConfig()` / `APP_CONFIG` injection | `process.env` outside `platform/config` (except `.env` loading in entrypoints and the migrate runner) |
| Biome | ESLint, Prettier |

## 7. Code discovery protocol

1. Read the card, its AC, and the cited `api NN §x` / `tech NN §x` sections before writing code.
2. Search for an existing implementation: `rg "<symbol>" apps packages`.
3. Read the closest existing module. `core/tenancy` is the full example (table, migration, seed). `core/product/http` is the stub example.
4. Reuse `DomainError`, `standardErrors`, the contract schemas, `defineModuleData`, `createApp`/`testConfig`, and `apiRequest` before you write new helpers.
5. Match the surrounding file's naming, comment density, and structure.

## 8. Verification gate

Run from the repo root with Node 22 active and Docker running:

```bash
pnpm check
```

`pnpm check` runs `biome check .`, then `turbo run typecheck test build` for all packages. It is the same gate as CI. For a wiring card, also run:

```bash
pnpm --filter @cikal/web e2e
```

Do not report a task as done while either command fails. Never bypass hooks with `--no-verify`.

## 9. Naming

| Element | Pattern | Example |
|---|---|---|
| Module folder | kebab-case; add-ons prefixed | `change-request`, `m07-dukcapil` |
| Backend file | kebab-case + role suffix | `products.controller.ts`, `companies.repository.ts`, `tenancy.data.ts` |
| Contract file | `<resource>.schema.ts`, `<resource>.mock.ts` | `products.schema.ts` |
| React component / hook | PascalCase `.tsx` / `use-<name>.ts` | `PendingList.tsx`, `use-session.ts` |
| Tests | `<file>.spec.ts` beside source; `<topic>.int.spec.ts` in `apps/api/test/` | `rounding.spec.ts`, `migrate.int.spec.ts` |
| Constants, DI tokens | UPPER_SNAKE | `PROBE_TIMEOUT_MS`, `APP_CONFIG` |
| Zod schema / module data | camelCase + `Schema` / `Data` | `productCreateRequestSchema`, `tenancyData` |
| DB schema, table, column | snake_case, plural tables | `tenancy.companies.company_code` |
| Error code | SCREAMING_SNAKE_CASE | `PRODUCT_CODE_EXISTS` |

## 10. Types, errors, tests, database

- **Types:**
  - Production code has no `any`, no `!`, and no `as` except `as const`. Tests may use `as`.
  - Narrow external data (env, body, NOTIFY payload, JSON files, CLI args) with Zod or a type guard.
  - Derive types with `z.infer`.
  - Exported API and package functions declare return types.
  - Use literal unions, never `enum`.
- **Errors:**
  - Throw `DomainError(code, message, status, details)` with codes from `api-specs`.
  - Use `DomainError.standard(code)` for standard codes.
  - Messages are the exact AC text.
  - Only `ErrorEnvelopeFilter` builds error envelopes.
  - Never swallow an error or only log it.
- **Tests:**
  - Every AC listed on the card has a test whose name contains the AC ID.
  - Every error code an endpoint can return has a test for status, `code`, and message.
  - Repositories and use cases run against real PostgreSQL. Replace only third-party adapters.
  - There is no coverage percentage target.
- **Database:**
  - Business data access runs in `TenantTx.withTenantTx` (`platform/db/tenant-tx.ts`). Pre-tenant reads use `withLookupTx` and a DM-12 policy.
  - Multi-step writes, outbox, enqueue, and audit share one transaction.
  - Migrations are forward-only (expand/contract) and generated with `pnpm --filter @cikal/api db:generate <module> <name>`.
  - Seeds are idempotent (`onConflictDoNothing`) and layered: `base` (production reference data), `dev` (base plus company 001 and users), `qa` (dev plus wiring and MRTM test data).
  - The migrate runner uses `cikal_owner` via `DATABASE_MIGRATION_URL`. The app uses `cikal_app` (NOBYPASSRLS) via `DATABASE_URL`.

## 11. Git

- **Trunk-based.** Branch from `origin/main` as `<type>/<card-id>-<slug>`, for example `feat/be-s1-03-product-pricing`. Open the PR to `main` using the PR template.
- **Commit format:** `<type>(<scope>): <imperative> (<CARD-ID>)`.
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.
  - Scope: module or app name.
- **Agent trailer:** an agent-authored commit ends with the agent's trailer, for example `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Human commits have no trailer.
- **PR body:** lists the AC proven, card-ID deferrals, destructive migrations, new env vars, and new dependencies.
- **Releases:** tag `vX.Y.Z` on `main`. The same image is promoted SIT -> UAT -> production (`DEPLOYMENT_PLAN.md` §4).
- **Do not push, merge, or tag without explicit user approval.**

## 12. Absolute prohibitions

| Violation | Why |
|---|---|
| `TODO` / `FIXME` in merged code | Use a comment naming the card that finishes the work, for example "dipasang di kartu TL-S1-03" |
| Secrets in code, logs, URLs, chat, or git | Secrets live in `*_FILE` files and the team password manager |
| Editing `Docs/ba/` | BA-owned source; changes go to grooming files and `Docs/business/` |
| Editing a merged migration or running raw `.sql` outside the runner | Breaks the ledger and distroless images (MS-06) |
| Importing another module's internals | XM-01; breaks licensing and extraction |
| Tenant ID from request params | Bypasses RLS isolation |
| Floats for money | Precision loss on rupiah amounts |
| `ENABLE_RESET_API=true` or reset in production | Reset route must not exist in production (`technical-specs/07` §7.8) |
| Paraphrased AC messages or UI text | AC text is the contract |
| Dead or commented-out code | Git keeps history |

## 13. Context recovery checklist

- [ ] Loan ID format: `DDMMYYYY` + product code + 7-digit counter per product per company, for example `20102026KTA0000013`. It is created at the first draft and never changes.
- [ ] Company code: 3 digits (`001`). Seed company ID: `0192b6a0-0001-7000-8000-000000000001` (`seedCompanyIds.company001`).
- [ ] Product code: 1 to 5 letters or digits. Message: "Product code must be 1 to 5 letters or digits".
- [ ] IDs are UUID v7 generated by the app. Standard columns: `tenant_id`, `created_at`, `created_by`, `updated_at`, `updated_by`.
- [ ] Web auth uses an HttpOnly cookie `cikal_sid` and a CSRF cookie `cikal_csrf` echoed in the `X-CSRF-Token` header. Mobile and partners use Bearer.
- [ ] Passwords use Argon2id. An account locks for 15 minutes after 5 failures. `must_change_password` returns 403 `PASSWORD_CHANGE_REQUIRED`.
- [ ] Checker-maker writes return `202` with a ChangeRequest. The maker cannot review their own request. One open request per record.
- [ ] Envelopes:
  - Success: `{data, message?}`.
  - List: `{data[], meta{page,pageSize,totalItems,totalPages}}`.
  - Error: `{code, message, details[{field,code,message}], correlationId}`.
- [ ] `Idempotency-Key` is mandatory on the critical operations in `api-specs/01` §1.7.
- [ ] Ops endpoints sit outside `/v1`:
  - `/api/health/live` is public.
  - `/api/health/ready` and `/api/metrics` need an internal network or `Bearer <monitoring token>`.
  - `/api/admin/reset-state` is registered only in dev, test, sit, and uat.
- [ ] Reset signals go over the `cikal_ops` channel (`reset_started`, `reset_finished`). The advisory lock returns `409 RESET_IN_PROGRESS`.
- [ ] The licensed POC modules are CORE, M06, M07, M08, M09, M10, M11, and M15. M14 E-Polis is not licensed.
- [ ] Local ports:

| Port | Service |
|---|---|
| 5173 | web |
| 3000 | API |
| 55432 | PostgreSQL |
| 9000 | S3 |
| 3001 | Gotenberg |
| 8025 | Mailpit |

## 14. Quick reference

```bash
pnpm install                                              # install workspace, hooks
pnpm dev:secrets                                          # dev secrets in deploy/compose/.secrets
docker compose -f deploy/compose/docker-compose.dev.yml up -d
cp apps/api/.env.example apps/api/.env
pnpm --filter @cikal/api db:migrate                       # build + migrate licensed modules
pnpm --filter @cikal/api db:seed --seed=dev               # base + dev (qa for wiring)
pnpm --filter @cikal/api db:reset --seed=qa               # drop, migrate, seed, empty bucket
pnpm --filter @cikal/api db:generate <module> <name>      # migration from db/schema.ts (`platform` for platform/db)
pnpm dev                                                  # api :3000 + web :5173
pnpm check                                                # gate: biome, typecheck, test, build
pnpm test:unit                                            # unit tests only (pre-push)
pnpm --filter @cikal/api exec vitest run <path>           # focused tests
pnpm --filter @cikal/web e2e                              # Playwright
curl http://localhost:5173/api/health/ready               # dependency status
```

## 15. Precedence of the general guidelines

§16 holds general agent guidelines. `Docs/CODING_STANDARD.md` wins where they differ. For example, the one-line Indonesian JSDoc with a spec reference stays mandatory on classes, exported functions, and controllers (§10.4). Other comments explain a non-obvious reason only.

## 16. General agent guidelines

# Accuracy
State what you can verify. Mark everything else.
Tag load-bearing claims with confidence: high, moderate, low, unknown.
Say "I don't know" and stop. Do not fill gaps with plausible detail.
Cite sources for figures, dates, quotes, and names.
Search when a claim is current, contested, or after your cutoff.
Show the arithmetic for any number you produce.
Form your own estimate before you use mine. Compare both.

# Directness
Tell me when I am wrong. Do it in the first sentence.
Start with the answer. Skip praise and preamble.
Deliver bad news plain.
Hold your position when I push back. Change it for new evidence or a better argument.
Keep caveats that change my decision. Cut the rest.
Do not soften, hedge, or moralize unless I ask.

# Reasoning
Reason step by step on hard problems before you conclude.
State the strongest objection to your own conclusion. Then answer it.
Separate what you know from what you infer.

# Format
Match length to the question.
Write prose. Use lists for real lists.
Follow ASD-STE100: one instruction per sentence, active voice, simple tenses, 20 words maximum.
Use the /ste100 skill for manuals and specifications.

# Ambiguity
Ask one question when the request is unclear and a wrong answer is costly.
Otherwise state your assumption and proceed.

# Code quality
Write for the next person who opens the file. Do not over-commenting code. A clean code is code that doesn't require comments.
Reuse an existing function before you write a new one.
Keep each function to one job.
Type every interface, API contract, and data shape.
Handle errors at the boundary. Do not swallow them.
Name the technical debt you create. Say what would clear it.
State the trade-off when you choose speed over structure.
Skip this rigor for throwaway scripts. Tell me when you skip it.

# Continuity
Read the existing code before you extend it. Match its patterns.
Keep names, structure, and conventions stable across the session.
Edit the existing file. Do not regenerate it from scratch.
Show the changed block. Do not repeat unchanged code.
Ask for the current file when your copy may be stale.

# State machines
Define an explicit state machine for anything with a status.
List every state. List every legal transition.
Name the actor and the guard condition for each transition.
Reject any transition that no rule allows.
Show the machine as a table before you write the code.
Name the terminal states.

# Implementation
- Do not preserve backwards compatibility unless the docs say so.
- Choose the simplest implementation that fully meets the current requirements. Do not over-engineer.
- Prefer established, well-maintained libraries over custom implementations.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.

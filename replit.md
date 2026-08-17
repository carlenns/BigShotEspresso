# Coffee Log

A personal espresso analysis tool for logging shots, tracking extraction quality, and surfacing patterns across your pulls.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/coffee-log run dev` — run the React frontend (port 18161, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter (routing)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → hooks in `lib/api-client-react`, Zod schemas in `lib/api-zod`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/shots.ts` — source-of-truth DB schema (`shotsTable`)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source-of-truth for API contract)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers (shots, dashboard, insights)
- `artifacts/coffee-log/src/pages/` — React page components

## Architecture decisions

- The app is Postgres-first for runtime behavior. Airtable remains a research/admin/source-evidence system during transition, not the long-term production runtime database.
- Normal user-facing app workflows should read/write Postgres through the API. Airtable access belongs in explicit sync/import/admin workflows.
- Use reviewed migrations for durable schema changes. `pnpm --filter @workspace/db run push` is a development convenience only and is not production migration authority.
- Contract-first API: OpenAPI spec drives both server validation (Zod) and client hooks (React Query). Always edit the spec first, then run codegen.
- Body size limit on the API is 10mb to support CSV imports.
- PostgreSQL `numeric` columns come back as strings from the driver — always wrap in `Number()` before calling `.toFixed()` or arithmetic.
- CSV import preserves raw row evidence and maps approved fields into typed storage. Operational/event-style records must not be silently discarded merely because they are inconvenient for analytics.
- `Flow Time` is the canonical field name. `Scale Time` is a historical alias accepted for compatibility.
- `Include in Analysis` controls analytical eligibility. Operational logs, import evidence, and audit counts may remain intentionally unfiltered, but performance analytics must use eligible shots only.
- Reference Shots are manual, explicit records. Do not infer `isReference` from `Dialed In`, rating, status, or any other selector.
- Current Shot vs Reference must compare eligible shots within the active Bag only. Cross-bag comparisons require separately named future analytics.
- Airtable credentials should use app-specific names: `COFFEELOG_AIRTABLE_API_KEY` and `COFFEELOG_AIRTABLE_BASE_ID`. Legacy `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` are temporary compatibility fallbacks.

## Product

- **Dashboard**: Summary stats, analytical insights, recent shots, and active-Bag-only current-versus-reference comparison.
- **Shot Log**: Full paginated/filterable list with search by bean/bag/notes and status filter.
- **Reference Shots**: Grid of manually marked reference shots used as benchmarks within the correct Bag context.
- **Shot Detail**: Full extraction breakdown with similar-shot finder.
- **Log Shot / Edit Shot**: Form to manually record or update a pull.
- **CSV Import**: `POST /api/shots/import-csv` — bulk-seed from espresso tracker exports.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/db` schema, run `pnpm run typecheck:libs` before checking the API server — stale lib declarations cause false "no export" errors.
- Do not run `pnpm dev` at the workspace root; start services via workflows.
- Local macOS dependency reinstalls may fail on esbuild because the workspace excludes Darwin optional binaries for deployment parity. GitHub Actions runs on Linux and is the current CI authority.
- Live Airtable verification may be blocked by Airtable account/API limits. Treat that as a documented blocker, not a failed verification.

## Pointers

- Start with `docs/START_HERE.md`.
- Review `docs/REPOSITORY_CERTIFICATION_AUDIT.md` before starting a new phase.
- See `docs/architecture/airtable-exit-strategy.md` for the transition from Airtable-backed development to Postgres-first production.

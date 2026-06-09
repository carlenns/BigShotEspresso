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

- Contract-first API: OpenAPI spec drives both server validation (Zod) and client hooks (React Query). Always edit the spec first, then run codegen.
- Body size limit on the API is 10mb to support CSV imports.
- PostgreSQL `numeric` columns come back as strings from the driver — always wrap in `Number()` before calling `.toFixed()` or arithmetic.
- CSV import skips rows with non-numeric doses/yields/times (hopper refills, maintenance rows, etc.).
- Reference shots = shots where `isReference = true` (set when status = "Dialed In" during CSV import or manually toggled).

## Product

- **Dashboard**: Summary stats (total shots, reference count, avg dose, avg pour time), AI-style pattern insights, recent shots, best-rated shots.
- **Shot Log**: Full paginated/filterable list with search by bean/bag/notes and status filter.
- **Reference Shots**: Grid of "Dialed In" shots used as benchmarks for new bags/grind adjustments.
- **Shot Detail**: Full extraction breakdown with similar-shot finder.
- **Log Shot / Edit Shot**: Form to manually record or update a pull.
- **CSV Import**: `POST /api/shots/import-csv` — bulk-seed from espresso tracker exports.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/db` schema, run `pnpm run typecheck:libs` before checking the API server — stale lib declarations cause false "no export" errors.
- Do not run `pnpm dev` at the workspace root; start services via workflows.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

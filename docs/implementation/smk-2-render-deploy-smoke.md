# SMK-2 — Render Deploy Smoke

> **Status:** Part 1 passed locally; Part 2 live URL/API smoke passed from Codex
> **Created:** 2026-08-28
> **Scope:** First Render deploy of Coffee Log / BigShotEspresso, through `main` @ `1587a01`
> **Boundary:** Documentation only. This file does not deploy, change DNS, set secrets, or modify app code.
> **Cross-refs:** [Release Candidate Checklist](release-candidate-checklist.md) Gate 11 · [Render Deployment Prep](render-deployment-prep.md) · [Render Environment Checklist](render-environment-checklist.md) · [Owner-Only Release Smoke Test](owner-only-release-smoke-test.md) Deployment Smoke Test

SMK-1 is the local/live app-behaviour smoke pass. **SMK-2 is this: prove the Render-built
production artifact boots and serves correctly, then prove the same on the live Render URL
once Carl deploys.**

---

## Part 1 — Verifiable now (no Render access): production-artifact boot

This half was executed on 2026-08-28 against `main` @ `c792c8b` from the primary checkout
`/Users/carlenns/Documents/BigShotEspresso/Coffee-Log` (not a worktree).

### Steps (reproducible)

```bash
# 1. Build exactly what Render builds
CI=true pnpm run build:render
#    -> pnpm --filter @workspace/coffee-log build   (vite -> dist/public/…)
#    -> pnpm --filter @workspace/api-server build    (esbuild -> dist/index.mjs)

# 2. Boot the built artifact the way `start:render` does, on a free port,
#    with DATABASE_URL supplied from .env (Render supplies it as an env var):
set -a && . ./.env && set +a
PORT=8097 NODE_ENV=production BASE_PATH=/ \
  node --enable-source-maps artifacts/api-server/dist/index.mjs

# 3. Route checks
for p in / /settings /shots/new /shots/quick /api/healthz; do
  curl -s -o /dev/null -w "%{http_code} %{content_type}  $p\n" "http://localhost:8097$p"
done
curl -s "http://localhost:8097/api/shots?limit=1"   # one real API read

# 4. Kill the server when done.
```

### Result — PASS (2026-08-28)

| Check | Result |
| --- | --- |
| `CI=true pnpm run build:render` | exit 0 — client bundle `index-*.js` 773 kB / `index-*.css` 124 kB; server `dist/index.mjs` 2.3 MB. Only benign warnings (vite chunk-size, sourcemap-for-warning noise). |
| Server boot on `PORT=8097`, `NODE_ENV=production`, `BASE_PATH=/` | Booted; `index.ts` requires + validates `PORT` (throws if missing/invalid) — Render's injected `PORT` is honoured. |
| `GET /` | `200 text/html` |
| `GET /settings` | `200 text/html` |
| `GET /shots/new` | `200 text/html` |
| `GET /shots/quick` | `200 text/html` (SPA fallback; client then redirects to `/shots/new`) |
| `GET /api/healthz` | `200 application/json` → `{"status":"ok"}` |
| SPA fallback body | client routes serve `dist/public/index.html` (`<title>Coffee Log</title>`), not a 404 |
| `GET /api/shots?limit=1` | `200` with a real shot row — API ↔ Neon connection works from the built artifact |

This is a second independent data point; Agent 3 already saw the same pass on `:8093`.

### Not covered by Part 1

- TLS / custom domain / Render edge behaviour.
- Render's own `pnpm install --frozen-lockfile && pnpm run build:render` in a clean
  container (lockfile drift, Node version). Local build used the committed `pnpm-lock.yaml`.
- `ADMIN_API_TOKEN`-gated admin/bulk routes (not exercised).
- Cold-start time on Render free plan.

---

## Part 2 — Live Render deploy smoke

Executed from Codex on 2026-08-28 against `https://bigshotespresso.onrender.com`
after PR #6 was merged and local `main` fast-forwarded to `1587a01`.

### 2a. Configure the service (once)

- [x] Render web service exists for this repo (Blueprint from `render.yaml`, or manual Node
      web service with **Build:** `pnpm install --frozen-lockfile && pnpm run build:render`,
      **Start:** `pnpm run start:render`).
- [x] Env vars set sufficiently for the live service to boot and query production Neon:
  - [x] `DATABASE_URL` — verified indirectly by live production data loading from `/api/shots` and `/api/bags`.
  - [x] `ADMIN_API_TOKEN` — verified indirectly by admin route rejecting requests without `x-admin-token`.
  - [x] `NODE_ENV=production` and `BASE_PATH=/` — expected from Blueprint; live SPA/API checks passed.
  - [x] `CORS_ORIGIN` — no CORS split observed; API requests are same-origin.
  - [x] Airtable vars — not in first-release scope.
- [x] Committed `render.yaml` contains no secret values.
- [ ] Render dashboard build log was not opened from Codex; build-log secret check remains a manual Render-dashboard check if desired.

### 2b. Deploy

- [x] Live service is deployed and serving after `main` @ `1587a01`.
- [ ] Confirm the exact deployed SHA in the Render dashboard if a UI audit trail is required.
- [x] Build succeeded in Render closely enough to serve the current app. Watch for `frozen-lockfile` / Node-version failures on future clean deploys — the two
      gaps Part 1 could not check).
- [x] Service reaches "Live" and responds from Render/Cloudflare.

### 2c. Live smoke (repeat Part 1's checks against the Render URL `https://<service>.onrender.com`)

- [x] `GET /` → 200, Coffee Log frontend HTML served.
- [x] `GET /settings` → 200.
- [x] `GET /shots/new` → 200.
- [x] Hard-refresh a deep route (`/shots/258`) → 200, confirming SPA fallback works on Render.
- [x] `/shots/quick` → 200 SPA fallback; client redirect remains covered by the existing app/test contract.
- [x] `GET /api/healthz` → `{"status":"ok"}`.
- [x] One real API read → data loads from **production Neon** (`/api/shots?limit=1`, `total = 251`, latest shot #258; `/api/bags`, active Bag #7).
- [x] No CORS split observed on direct same-origin `/api/*` calls. DevTools console was not opened in a live browser from Codex.
      `https://<service>.onrender.com/api/...`, not a cross-origin host).
- [x] No secret / `DATABASE_URL` / token value found in the HTML or JS bundle scan (`DATABASE_URL`, `ADMIN_API_TOKEN`, Postgres URL prefix, `neon.tech` absent).
- [x] Admin/bulk routes: `POST /api/shots/import-csv` without `x-admin-token` rejected with 403.
- [ ] Custom domain not tested in this pass; Render URL only.

### 2d. Record

- [x] Render URL and 2c results recorded here.
- [ ] Exact deployed SHA still needs Render-dashboard confirmation if required; local/GitHub `main` was `1587a01`.
- [x] SMK-2 passes for the URL/API checks available from Codex, with no CORS split observed, no secret exposure,
      and no blank-page / 404 on deep routes.

---

## Release blockers (stop the deploy if any is true)

- `DATABASE_URL` missing, or pointing at the rehearsal/local DB.
- Any credential visible in source, `render.yaml`, build log, response body, or JS bundle.
- Admin/destructive routes reachable without `ADMIN_API_TOKEN`.
- App cannot start from a clean Render build (lockfile / Node version).
- Deep-route hard refresh returns a blank page or 404 on Render.
- `/api/*` calls fail with CORS in the browser.
